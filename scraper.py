import logging
import re
from typing import Dict, List, Optional, Set
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

logger = logging.getLogger(__name__)


class NewsScraper:
    def __init__(self, existing_urls: Optional[Set[str]] = None) -> None:
        self.existing_urls = existing_urls or set()

    def scrape_nden(self) -> List[Dict]:
        base_url = "https://nden.com.ar"
        logger.info("Scrapeando homepage NDEN...")
        return self._scrape_homepage(
            base_url=base_url,
            card_selector="article, .post, .entry, .item",
            title_selector="h1, h2, h3",
            link_selector="a",
            image_selector="img",
            section_selector=".category, .seccion, .tag, .post-category",
            fuente="NDEN",
        )

    def scrape_diario_necochea(self) -> List[Dict]:
        base_url = "https://diarionecochea.com"
        logger.info("Scrapeando homepage Diario Necochea...")
        return self._scrape_homepage(
            base_url=base_url,
            card_selector="article, .post, .entry, .item",
            title_selector="h1, h2, h3",
            link_selector="a",
            image_selector="img",
            section_selector=".category, .seccion, .tag, .post-category",
            fuente="Diario Necochea",
        )

    def get_article_content(self, url: str) -> str:
        logger.info("Extrayendo cuerpo completo: %s", url)
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=30000)
                page.wait_for_timeout(1200)
                html = page.content()
                return self._extract_article_text(html)
            finally:
                browser.close()

    def _scrape_homepage(
        self,
        base_url: str,
        card_selector: str,
        title_selector: str,
        link_selector: str,
        image_selector: str,
        section_selector: str,
        fuente: str,
    ) -> List[Dict]:
        items: List[Dict] = []
        seen: Set[str] = set()
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            try:
                page.goto(base_url, wait_until="domcontentloaded", timeout=30000)
                page.wait_for_timeout(1500)
                html = page.content()
                soup = BeautifulSoup(html, "html.parser")
                cards = soup.select(card_selector)

                for card in cards:
                    link_el = card.select_one(link_selector)
                    title_el = card.select_one(title_selector)
                    if not link_el or not title_el:
                        continue

                    raw_href = (link_el.get("href") or "").strip()
                    if not raw_href:
                        continue
                    url = urljoin(base_url, raw_href)
                    if not url.startswith("http"):
                        continue
                    if self._is_non_article_url(url):
                        continue
                    if url in self.existing_urls or url in seen:
                        continue

                    titulo = title_el.get_text(" ", strip=True)
                    if len(titulo) < 8:
                        continue

                    image_el = card.select_one(image_selector)
                    imagen_url = None
                    if image_el:
                        raw_img = image_el.get("src") or image_el.get("data-src")
                        if raw_img:
                            imagen_url = urljoin(base_url, raw_img)

                    section_el = card.select_one(section_selector)
                    seccion = section_el.get_text(" ", strip=True) if section_el else "General"

                    items.append(
                        {
                            "titulo": titulo,
                            "url": url,
                            "imagen_url": imagen_url,
                            "seccion": seccion or "General",
                            "fuente": fuente,
                        }
                    )
                    seen.add(url)

            except Exception:
                logger.exception("Error scrapeando %s", base_url)
            finally:
                browser.close()
        logger.info("Encontradas %s notas nuevas en %s", len(items), base_url)
        return items

    @staticmethod
    def _extract_article_text(html: str) -> str:
        soup = BeautifulSoup(html, "html.parser")
        for selector in ["script", "style", "noscript", "header", "footer", "aside"]:
            for node in soup.select(selector):
                node.decompose()

        article = (
            soup.select_one("article")
            or soup.select_one(".single-content")
            or soup.select_one(".entry-content")
            or soup.select_one(".post-content")
            or soup.body
        )
        if not article:
            return NewsScraper._extract_meta_fallback(soup)

        paragraphs = [p.get_text(" ", strip=True) for p in article.select("p, li")]
        paragraphs = [p for p in paragraphs if len(p) > 25]
        if len(paragraphs) < 2:
            # Fallback para sitios que no usan <p> semantico.
            raw_text = article.get_text("\n", strip=True)
            chunks = [c.strip() for c in re.split(r"\n+", raw_text) if len(c.strip()) > 40]
            paragraphs = chunks[:12]
        text = "\n\n".join(paragraphs)
        text = text.strip()
        if len(text) < 80:
            fallback = NewsScraper._extract_meta_fallback(soup)
            if len(fallback) > len(text):
                return fallback
        return text

    @staticmethod
    def _is_non_article_url(url: str) -> bool:
        lowered = url.lower()
        blocked_keywords = [
            "/video/",
            "/category/",
            "/tag/",
            "/author/",
            "/wp-content/",
            "/feed/",
            "/page/",
            "#",
        ]
        return any(token in lowered for token in blocked_keywords)

    @staticmethod
    def _extract_meta_fallback(soup: BeautifulSoup) -> str:
        candidates: List[str] = []
        for selector in [
            'meta[property="og:description"]',
            'meta[name="description"]',
            'meta[name="twitter:description"]',
        ]:
            node = soup.select_one(selector)
            if not node:
                continue
            content = (node.get("content") or "").strip()
            if len(content) > 30:
                candidates.append(content)

        # Ultimo recurso: texto de encabezados principales.
        headings = [h.get_text(" ", strip=True) for h in soup.select("h1, h2")]
        headings = [h for h in headings if len(h) > 10]
        if headings:
            candidates.append(". ".join(headings[:4]))

        return "\n\n".join(candidates).strip()
