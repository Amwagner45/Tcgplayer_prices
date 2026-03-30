import time
import requests
from typing import Any


BASE_URL = "https://tcgcsv.com/tcgplayer"
ARCHIVE_URL = "https://tcgcsv.com/archive/tcgplayer"
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

    def download_archive(self, date_str: str, dest_path: str) -> None:
        """Download a daily price archive .7z file. Raises on failure."""
        url = f"{ARCHIVE_URL}/prices-{date_str}.ppmd.7z"
        resp = self.session.get(url, timeout=120, stream=True)
        resp.raise_for_status()
        with open(dest_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)
