import json
import logging
import os
from typing import Dict

import httpx

from supabase_client import SupabaseNewsClient

logger = logging.getLogger(__name__)


class TelegramBotClient:
    def __init__(self, supabase_client: SupabaseNewsClient) -> None:
        self.token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
        self.chat_id = os.getenv("TELEGRAM_CHAT_ID", "").strip()
        if not self.token or not self.chat_id:
            raise ValueError("TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID son obligatorios.")
        self.base_url = f"https://api.telegram.org/bot{self.token}"
        self.supabase_client = supabase_client

    def send_preview(self, noticia: Dict) -> None:
        titulo = noticia.get("titulo", "(sin titulo)")
        cuerpo = noticia.get("cuerpo", "")
        primer_parrafo = cuerpo.split("\n\n")[0][:600]
        instagram_preview = (noticia.get("instagram_text") or "")[:250]
        noticia_id = noticia.get("id")
        if noticia_id is None:
            raise ValueError("La noticia debe contener 'id' para construir callbacks.")

        text = (
            f"📰 *Nueva noticia pendiente*\n\n"
            f"*Titulo*: {titulo}\n\n"
            f"*Primer parrafo*:\n{primer_parrafo}\n\n"
            f"*Instagram preview*:\n{instagram_preview}"
        )
        keyboard = {
            "inline_keyboard": [
                [
                    {"text": "✓ Publicar", "callback_data": f"pub_{noticia_id}"},
                    {"text": "✕ Descartar", "callback_data": f"des_{noticia_id}"},
                ]
            ]
        }

        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "reply_markup": json.dumps(keyboard),
        }

        with httpx.Client(timeout=20) as client:
            response = client.post(f"{self.base_url}/sendMessage", data=payload)
            if response.status_code >= 400:
                # Telegram suele responder con texto del error (p.ej. parse error de Markdown, callback_data inválido, etc).
                logger.error(
                    "Telegram sendMessage fallo (status=%s). body=%s",
                    response.status_code,
                    (response.text or "")[:2000],
                )
            response.raise_for_status()
        logger.info("Preview enviada a Telegram para noticia id=%s", noticia_id)

    def callback_handler(self, callback_data: str) -> Dict:
        if not callback_data:
            return {"ok": False, "error": "callback vacio"}

        action, _, raw_id = callback_data.partition("_")
        if not raw_id.isdigit():
            return {"ok": False, "error": "id invalido"}

        noticia_id = int(raw_id)
        if action == "pub":
            self.supabase_client.update_estado(noticia_id, "publicada")
            return {"ok": True, "id": noticia_id, "estado": "publicada"}
        if action == "des":
            self.supabase_client.update_estado(noticia_id, "descartada")
            return {"ok": True, "id": noticia_id, "estado": "descartada"}

        return {"ok": False, "error": "accion no soportada"}
