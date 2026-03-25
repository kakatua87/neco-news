import logging
import os
import argparse
import time
import re
from typing import Dict, List
from urllib.parse import urlparse

from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import dotenv_values, load_dotenv
from fastapi import FastAPI, Request
from google.api_core import exceptions as google_exceptions
import uvicorn

from ai_processor import GeminiProcessor
from scraper import NewsScraper
from supabase_client import SupabaseNewsClient
from telegram_bot import TelegramBotClient

# Carga configuración desde `.env` y `.env.local`.
# Importante: NO queremos pisar overrides de consola (por ej. MAX_NOTES_PER_RUN)
# salvo para secretos clave (Gemini/Supabase/Telegram).
load_dotenv(override=False, dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
load_dotenv(
    override=False, dotenv_path=os.path.join(os.path.dirname(__file__), ".env.local")
)

env_path = os.path.join(os.path.dirname(__file__), ".env")
env_local_path = os.path.join(os.path.dirname(__file__), ".env.local")
merged_env = {**dotenv_values(env_path), **dotenv_values(env_local_path)}

force_from_env = [
    "SUPABASE_URL",
    "SUPABASE_KEY",
    "GEMINI_API_KEY",
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_CHAT_ID",
    "PORT",
    "GEMINI_MODEL",
]
for k in force_from_env:
    v = (merged_env.get(k) or "").strip()
    if v:
        os.environ[k] = v

if not logging.getLogger().handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
logger = logging.getLogger("el_puerto_pipeline")

app = FastAPI()
scheduler = BackgroundScheduler(timezone="America/Argentina/Buenos_Aires")


def pipeline() -> None:
    logger.info("Iniciando pipeline de scraping...")
    try:
        supabase_client = SupabaseNewsClient()
        existing_urls = supabase_client.get_urls_existentes()
        scraper = NewsScraper(existing_urls=existing_urls)
        ai = GeminiProcessor()
        telegram = TelegramBotClient(supabase_client=supabase_client)
    except Exception:
        logger.exception("Error inicializando dependencias de pipeline.")
        return

    raw_notes: List[Dict] = []
    for source_fn in (scraper.scrape_nden, scraper.scrape_diario_necochea):
        try:
            raw_notes.extend(source_fn())
        except Exception:
            logger.exception("Error en source_fn=%s", source_fn.__name__)

    logger.info("Total de notas candidatas: %s", len(raw_notes))

    max_notes_per_run = int(os.getenv("MAX_NOTES_PER_RUN", "12"))
    ai_delay_seconds = float(os.getenv("AI_DELAY_SECONDS", "3.0"))
    processed = 0
    gemini_unavailable = False

    def slug_from_url(url: str, fallback_title: str) -> str:
        """
        Genera un slug estable a partir de la URL (por consistencia en producción).
        """
        try:
            parsed = urlparse(url)
            last = (parsed.path or "").rstrip("/").split("/")[-1]
        except Exception:
            last = ""

        base = last or fallback_title or "nota"
        base = base.lower()
        base = re.sub(r"[^a-z0-9]+", "-", base)
        base = re.sub(r"-+", "-", base).strip("-")
        return base or "nota"

    for note in raw_notes[:max_notes_per_run]:
        url = note.get("url")
        title = note.get("titulo", "")
        section = note.get("seccion", "General")
        fuente = note.get("fuente", "El Puerto")
        image = note.get("imagen_url")

        if not url or url in existing_urls:
            continue

        try:
            content = scraper.get_article_content(url)
            if len(content) < 60:
                logger.info("Nota descartada por cuerpo corto: %s", url)
                continue

            if gemini_unavailable:
                # Fallback: guardar como pendiente sin reescritura.
                payload = {
                    "titulo": title,
                    "cuerpo": content,
                    "resumen_seo": "",
                    "seccion": section,
                    "fuente": fuente,
                    "url_original": url,
                    "imagen_url": image,
                    "instagram_text": "",
                    "twitter_text": "",
                    "guion_video": "",
                    "slug": slug_from_url(url, title),
                }
                existing_urls.add(url)
                processed += 1
                inserted = supabase_client.insert_noticia(payload)
                try:
                    telegram.send_preview(inserted)
                except Exception:
                    logger.exception(
                        "No se pudo enviar preview a Telegram para noticia id=%s (pendiente).",
                        inserted.get("id"),
                    )
                logger.info(
                    "Nota insertada sin Gemini (pendiente): id=%s",
                    inserted.get("id"),
                )
                time.sleep(ai_delay_seconds)
                continue

            rewritten = ai.process_with_gemini(title, content, section)
            payload = {
                **rewritten,
                "seccion": section,
                "fuente": fuente,
                "url_original": url,
                "imagen_url": image,
            }
            inserted = supabase_client.insert_noticia(payload)
            existing_urls.add(url)
            processed += 1
            logger.info("Nota procesada y enviada a Telegram: id=%s", inserted.get("id"))
            try:
                telegram.send_preview(inserted)
            except Exception:
                logger.exception(
                    "No se pudo enviar preview a Telegram para noticia id=%s.",
                    inserted.get("id"),
                )
            # Evita disparar limites por minuto del plan gratis.
            time.sleep(ai_delay_seconds)
        except google_exceptions.ResourceExhausted as exc:
            gemini_unavailable = True
            logger.warning(
                "Cuota Gemini agotada (429). Se corta la corrida actual. Detalle: %s",
                exc,
            )
            details = getattr(exc, "details", None)
            if details:
                logger.warning("Detalle API Gemini: %s", details)
            # Fallback: al menos guardar la nota pendiente y seguir con el resto.
            payload = {
                "titulo": title,
                "cuerpo": content,
                "resumen_seo": "",
                "seccion": section,
                "fuente": fuente,
                "url_original": url,
                "imagen_url": image,
                "instagram_text": "",
                "twitter_text": "",
                "guion_video": "",
                "slug": slug_from_url(url, title),
            }
            existing_urls.add(url)
            processed += 1
            inserted = supabase_client.insert_noticia(payload)
            try:
                telegram.send_preview(inserted)
            except Exception:
                logger.exception(
                    "No se pudo enviar preview a Telegram para noticia id=%s (pendiente por 429).",
                    inserted.get("id"),
                )
            logger.info(
                "Nota insertada sin Gemini por 429 (pendiente): id=%s",
                inserted.get("id"),
            )
            time.sleep(ai_delay_seconds)
        except Exception:
            logger.exception("Fallo procesando nota url=%s. Se continua con la siguiente.", url)

    logger.info("Pipeline finalizado. Notas procesadas: %s", processed)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/telegram/callback")
async def telegram_callback(request: Request) -> Dict:
    body = await request.json()
    data = (body.get("callback_query") or {}).get("data", "")
    try:
        supabase_client = SupabaseNewsClient()
        telegram = TelegramBotClient(supabase_client=supabase_client)
        result = telegram.callback_handler(data)
        logger.info("Callback telegram procesado: %s", result)
        return result
    except Exception:
        logger.exception("Error procesando callback de Telegram.")
        return {"ok": False}


@app.on_event("startup")
def on_startup() -> None:
    scheduler.add_job(
        pipeline,
        trigger="interval",
        minutes=15,
        id="news_pipeline",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler iniciado. Ejecuta pipeline cada 15 minutos.")


@app.on_event("shutdown")
def on_shutdown() -> None:
    scheduler.shutdown(wait=False)
    logger.info("Scheduler detenido.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scraper El Puerto")
    parser.add_argument(
        "--test",
        action="store_true",
        help="Ejecuta pipeline una sola vez y termina.",
    )
    parser.add_argument(
        "--gemini-smoke",
        action="store_true",
        help="Una llamada minima a Gemini (sin scraping); diagnostica 429/cuota y termina.",
    )
    args = parser.parse_args()

    if args.gemini_smoke:
        try:
            GeminiProcessor().smoke()
        except Exception:
            logger.exception("Prueba Gemini (--gemini-smoke) fallo.")
            raise SystemExit(1)
        raise SystemExit(0)

    if args.test:
        pipeline()
        raise SystemExit(0)

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
