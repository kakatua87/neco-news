import logging
import os
from typing import Dict, List, Set

from supabase import Client, create_client

logger = logging.getLogger(__name__)


class SupabaseNewsClient:
    def __init__(self) -> None:
        url = os.getenv("SUPABASE_URL", "").strip()
        key = os.getenv("SUPABASE_KEY", "").strip()
        if not url or not key:
            raise ValueError("SUPABASE_URL y SUPABASE_KEY son obligatorios.")
        self.client: Client = create_client(url, key)

    def get_urls_existentes(self) -> Set[str]:
        try:
            response = (
                self.client.table("noticias")
                .select("url_original")
                .not_.is_("url_original", "null")
                .execute()
            )
            data: List[Dict] = response.data or []
            return {str(row["url_original"]).strip() for row in data if row.get("url_original")}
        except Exception:
            logger.exception("Error al obtener URLs existentes en Supabase.")
            return set()

    def insert_noticia(self, datos: Dict) -> Dict:
        payload = {
            "titulo": datos.get("titulo", "").strip(),
            "cuerpo": datos.get("cuerpo", "").strip(),
            "resumen_seo": datos.get("resumen_seo"),
            "seccion": datos.get("seccion", "General"),
            "estado": "pendiente",
            "fuente": datos.get("fuente", "El Puerto"),
            "url_original": datos.get("url_original"),
            "imagen_url": datos.get("imagen_url"),
            "instagram_text": datos.get("instagram_text"),
            "twitter_text": datos.get("twitter_text"),
            "guion_video": datos.get("guion_video"),
            "slug": datos.get("slug", "").strip(),
        }
        response = self.client.table("noticias").insert(payload).execute()
        rows = response.data or []
        if not rows:
            raise RuntimeError("Supabase no devolvio filas insertadas.")
        return rows[0]

    def update_estado(self, noticia_id: int, estado: str) -> None:
        update_data = {"estado": estado}
        if estado == "publicada":
            # Supabase parsea ISO string como timestamp.
            from datetime import datetime, timezone

            update_data["fecha_publicacion"] = datetime.now(timezone.utc).isoformat()
        self.client.table("noticias").update(update_data).eq("id", noticia_id).execute()
