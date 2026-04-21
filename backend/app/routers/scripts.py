"""
API endpoints for managing long-running scripts (e.g., fetch_prices).
Supports starting the fetch_prices operation and polling their status/output.
Runs fetch_prices inline using the existing database connection pool.
"""

import asyncio
import sys
import os
from datetime import datetime, date, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# Add parent dirs to path for imports
backend_dir = os.path.dirname(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database import SessionLocal
from app.models import Product, SkippedArchiveDate
from scripts.fetch_prices import (
    backfill_archive_date,
    sync_catalog,
    backfill_new_categories,
    update_current_prices,
    rebuild_price_summary,
    get_skipped_dates,
    get_dates_with_history,
    get_last_history_date,
    ARCHIVE_START_DATE,
    TARGET_CATEGORIES,
    TcgcsvClient,
    should_persist_skipped_archive_date,
)

router = APIRouter(prefix="/api/scripts", tags=["scripts"])


class FetchStatus(BaseModel):
    status: str  # "idle", "running", "completed", "error"
    progress: str  # Latest output line
    output: list[str]  # All output lines
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error: Optional[str] = None


# Store the state globally
_fetch_state = FetchStatus(
    status="idle",
    progress="",
    output=[],
)
_fetch_task: Optional[asyncio.Task] = None


class OutputCapture:
    """Capture print output and route it to the fetch state."""

    def __init__(self, max_lines: int = 100):
        self.lines: list[str] = []
        self.max_lines = max_lines

    def write(self, text: str):
        if text.strip():
            self.lines.append(text.rstrip("\n"))
            if len(self.lines) > self.max_lines:
                self.lines.pop(0)
            _fetch_state.output = self.lines.copy()
            _fetch_state.progress = self.lines[-1] if self.lines else ""

    def flush(self):
        pass


async def _run_fetch_prices_inline():
    """Run the fetch_prices operations inline using existing database connection."""
    global _fetch_state, _fetch_task

    output_capture = OutputCapture()
    old_stdout = sys.stdout

    try:
        if _fetch_state.started_at is None:
            _fetch_state.started_at = datetime.now().isoformat()

        sys.stdout = output_capture

        client = TcgcsvClient()
        db = SessionLocal()

        try:
            print("\n" + "=" * 60)
            print("FETCH PRICES - Running via API")
            print("=" * 60)

            # Phase 1: Backfill from archives
            skipped_dates = get_skipped_dates(db)
            existing_dates = get_dates_with_history(db)
            today = date.today()
            yesterday = today - timedelta(days=1)

            last_date = get_last_history_date(db)
            if last_date is None:
                start_date = ARCHIVE_START_DATE
            else:
                start_date = last_date + timedelta(days=1)

            dates_to_fetch = []
            d = start_date
            while d <= yesterday:
                if d not in skipped_dates and d not in existing_dates:
                    dates_to_fetch.append(d)
                d += timedelta(days=1)

            if dates_to_fetch:
                print(f"\nBackfilling {len(dates_to_fetch)} archive dates")
                print(f"  From: {dates_to_fetch[0]}")
                print(f"  To:   {dates_to_fetch[-1]}")

                for i, archive_date in enumerate(dates_to_fetch):
                    try:
                        count = backfill_archive_date(client, db, archive_date)
                        print(
                            f"  [{archive_date}] {count:,} price entries "
                            f"({i+1} of {len(dates_to_fetch)})"
                        )
                        # Yield to event loop
                        await asyncio.sleep(0.01)
                    except Exception as e:
                        reason = str(e)[:200]
                        print(
                            f"  [{archive_date}] SKIPPED — {reason} "
                            f"({i+1} of {len(dates_to_fetch)})"
                        )
                        db.rollback()
                        if should_persist_skipped_archive_date(e):
                            db.merge(
                                SkippedArchiveDate(date=archive_date, reason=reason)
                            )
                            db.commit()
            else:
                print("\nNo archive dates to backfill.")

            # Phase 2: Sync catalog
            print("\nSyncing catalog...")
            sync_catalog(client, db)
            await asyncio.sleep(0.01)

            # Phase 1b: Backfill for new categories
            print("\nChecking for new categories...")
            backfill_new_categories(client, db)
            await asyncio.sleep(0.01)

            # Phase 2b: Update current prices
            print("\nUpdating current prices...")
            update_current_prices(db)
            await asyncio.sleep(0.01)

            # Phase 3: Rebuild price summary
            print("\nRebuilding price summary...")
            rebuild_price_summary(db)
            await asyncio.sleep(0.01)

            try:
                from scripts.export_opportunities import export_opportunities

                print("\nExporting opportunities JSON...")
                export_opportunities()
                await asyncio.sleep(0.01)
            except Exception as e:
                print(f"  Export failed (non-fatal): {e}")

            # Summary
            print("\n" + "=" * 60)
            print("SUMMARY")
            print("=" * 60)
            for cat_id, cat_name in TARGET_CATEGORIES.items():
                count = db.query(Product).filter_by(category_id=cat_id).count()
                print(f"  {cat_name}: {count} cards")

            print("\n✓ Fetch completed successfully")
            _fetch_state.status = "completed"
            _fetch_state.progress = "✓ Fetch completed successfully"

        except Exception as e:
            db.rollback()
            error_msg = str(e)[:500]
            print(f"\n✗ Error: {error_msg}")
            _fetch_state.status = "error"
            _fetch_state.error = error_msg
            _fetch_state.progress = f"✗ Error: {error_msg}"
        finally:
            db.close()

    except Exception as e:
        error_msg = str(e)[:500]
        _fetch_state.status = "error"
        _fetch_state.error = error_msg
        _fetch_state.progress = f"✗ Error: {error_msg}"
    finally:
        sys.stdout = old_stdout
        _fetch_state.completed_at = datetime.now().isoformat()
        _fetch_task = None


@router.post("/fetch-prices/start")
async def start_fetch_prices():
    """Start the fetch_prices operation if not already running."""
    global _fetch_task

    if _fetch_state.status == "running":
        raise HTTPException(status_code=409, detail="Fetch already running")

    _fetch_state.status = "running"
    _fetch_state.started_at = datetime.now().isoformat()
    _fetch_state.output = []
    _fetch_state.progress = "Initializing fetch_prices..."
    _fetch_state.error = None
    _fetch_state.completed_at = None

    # Start the async task
    _fetch_task = asyncio.create_task(_run_fetch_prices_inline())

    return {
        "message": "Fetch started",
        "started_at": _fetch_state.started_at,
    }


@router.get("/fetch-prices/status")
async def get_fetch_status():
    """Get the current status of the fetch_prices operation."""
    return _fetch_state


@router.post("/fetch-prices/stop")
async def stop_fetch_prices():
    """Stop the fetch_prices operation if it's running."""
    global _fetch_task

    if _fetch_task is None or _fetch_state.status != "running":
        raise HTTPException(status_code=400, detail="No fetch process running")

    try:
        _fetch_task.cancel()
        await _fetch_task
    except asyncio.CancelledError:
        pass
    finally:
        _fetch_task = None
        _fetch_state.status = "error"
        _fetch_state.error = "Stopped by user"
        _fetch_state.completed_at = datetime.now().isoformat()

    return {"message": "Fetch stopped"}
