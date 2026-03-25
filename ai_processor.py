import json
import logging
import os
import re
from typing import Dict, List, Optional

import google.generativeai as genai
from google.api_core import exceptions as google_exceptions

logger = logging.getLogger(__name__)

# El alias "gemini-1.5-flash" suele devolver 404 en v1beta; usar 2.0 Flash o nombres versionados.
_FALLBACK_MODELS = (
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-002",
    "gemini-1.5-flash-8b",
)


class GeminiProcessor:
    def __init__(self) -> None:
        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            raise ValueError("GEMINI_API_KEY es obligatoria.")
        genai.configure(api_key=api_key)
        key_fingerprint = f"{api_key[:8]}...{api_key[-6:]}" if len(api_key) >= 14 else "***"
        logger.info("Gemini API key en uso (huella): %s", key_fingerprint)
        preferred = os.getenv("GEMINI_MODEL", "").strip()
        self._model_names: List[str] = []
        if preferred:
            self._model_names.append(preferred)
        for name in _FALLBACK_MODELS:
            if name not in self._model_names:
                self._model_names.append(name)
        logger.info("Gemini modelos a probar: %s", self._model_names)

    def process_with_gemini(self, titulo: str, cuerpo: str, seccion: str) -> Dict:
        prompt = (
            "Sos el redactor de El Puerto, portal de noticias de Necochea, Argentina. "
            "Reescribi completamente esta noticia sin copiar frases. "
            "Manten solo hechos objetivos. "
            "Tono rioplatense claro. "
            "Devolve SOLO JSON sin markdown:\n"
            "{titulo, cuerpo (3 parrafos), resumen_seo, instagram_text, twitter_text, guion_video, slug}\n\n"
            f"Seccion: {seccion}\n"
            f"Titulo original: {titulo}\n"
            f"Cuerpo original:\n{cuerpo}\n"
        )

        last_err: Optional[Exception] = None
        quota_err: Optional[google_exceptions.ResourceExhausted] = None
        text = ""
        for model_name in self._model_names:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                text = (response.text or "").strip()
                if text:
                    logger.info("Gemini respuesta OK con modelo: %s", model_name)
                    break
                logger.warning("Gemini devolvio texto vacio con %s, reintentando...", model_name)
            except google_exceptions.NotFound as e:
                last_err = e
                logger.warning(
                    "Modelo Gemini no disponible (%s), probando siguiente...",
                    model_name,
                )
                continue
            except google_exceptions.ResourceExhausted as e:
                # Cuota / límites: a veces varían por modelo; seguir probando el resto.
                last_err = e
                quota_err = e
                logger.warning(
                    "Gemini cuota o limite (429) con modelo %s: %s",
                    model_name,
                    e,
                )
                details = getattr(e, "details", None)
                if details:
                    logger.warning("Detalle API Gemini: %s", details)
                continue
            except Exception:
                raise
        if not text and last_err is not None:
            # Si en algún modelo falló por cuota 429, preferimos propagar ese error
            # para que el pipeline pueda usar fallback sin depender del último intento.
            if quota_err is not None:
                raise quota_err
            raise last_err

        if not text:
            raise RuntimeError("Gemini no genero texto con ningun modelo intentado.")
        if not text:
            raise RuntimeError("Gemini devolvio respuesta vacia.")

        parsed = self._safe_json_parse(text)
        required_fields = [
            "titulo",
            "cuerpo",
            "resumen_seo",
            "instagram_text",
            "twitter_text",
            "guion_video",
            "slug",
        ]
        for field in required_fields:
            if field not in parsed:
                raise ValueError(f"Gemini no devolvio el campo requerido: {field}")
        return parsed

    def _safe_json_parse(self, raw_text: str) -> Dict:
        try:
            return json.loads(raw_text)
        except json.JSONDecodeError:
            logger.warning("Respuesta Gemini no parseo directo. Intentando limpieza.")
            cleaned = self._extract_json(raw_text)
            return json.loads(cleaned)

    @staticmethod
    def _extract_json(text: str) -> str:
        # Intenta recuperar JSON incluso si la IA agrega texto extra.
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            raise ValueError("No se encontro bloque JSON valido en la respuesta de Gemini.")
        return match.group(0)

    def smoke(self, prompt: str = 'Responde exactamente la palabra "OK" y nada mas.') -> None:
        """Una llamada minima a cada modelo hasta que uno responda; sirve para diagnosticar 403/429/cuota."""
        last_err: Optional[Exception] = None
        for model_name in self._model_names:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                out = (response.text or "").strip()
                logger.info("Gemini smoke OK | modelo=%s | respuesta=%r", model_name, out[:200])
                return
            except google_exceptions.NotFound as e:
                last_err = e
                logger.warning("Gemini smoke: modelo no disponible (%s): %s", model_name, e)
                continue
            except google_exceptions.ResourceExhausted as e:
                last_err = e
                logger.warning("Gemini smoke: 429 con %s: %s", model_name, e)
                details = getattr(e, "details", None)
                if details:
                    logger.warning("Gemini smoke detalle: %s", details)
                continue
            except Exception:
                logger.exception("Gemini smoke: error con modelo %s", model_name)
                raise
        if last_err is not None:
            raise last_err
        raise RuntimeError("Gemini smoke: ningun modelo disponible.")
