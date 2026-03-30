import time
import requests
from typing import Any


BASE_URL = "https://tcgcsv.com/tcgplayer"
REQUEST_DELAY = 0.5  # seconds between requests to be respectful


class TcgcsvClient:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/json"})

    def _get(self, url: str) -> dict[str, Any]:
        time.sleep(REQUEST_DELAY)
        resp = self.session.get(url, timeout=30)
        resp.raise_for_status()
        return resp.json()

    def fetch_categories(self) -> list[dict]:
        data = self._get(f"{BASE_URL}/categories")
        return data.get("results", [])

    def fetch_groups(self, category_id: int) -> list[dict]:
        data = self._get(f"{BASE_URL}/{category_id}/groups")
        return data.get("results", [])

    def fetch_products(self, category_id: int, group_id: int) -> list[dict]:
        data = self._get(f"{BASE_URL}/{category_id}/{group_id}/products")
        return data.get("results", [])

    def fetch_prices(self, category_id: int, group_id: int) -> list[dict]:
        data = self._get(f"{BASE_URL}/{category_id}/{group_id}/prices")
        return data.get("results", [])
