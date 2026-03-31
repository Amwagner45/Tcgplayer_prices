"""
Unified price fetcher: backfills historical data from tcgcsv.com archives,
fetches today's live data, and rebuilds the price_summary table.

Resumable — checks the last recorded date and only fetches missing dates.
Permanently skips archive dates that fail (404, corrupt, etc.).

Usage:
    cd backend
    python -m scripts.fetch_prices
"""

import sys
import os
import json
import tempfile
from datetime import datetime, date, timedelta
from pathlib import Path

import py7zr

# Add parent dir to path so imports work when run as `python -m scripts.fetch_prices`
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import func, text
from app.database import SessionLocal, init_db
from app.models import (
    Category,
    Group,
    Product,
    Price,
    PriceHistory,
    PriceSummary,
    SkippedArchiveDate,
)
from services.tcgcsv_client import TcgcsvClient

# Pokemon=3, Flesh and Blood=62, One Piece=68
TARGET_CATEGORIES = {
    3: "Pokemon",
    62: "Flesh and Blood TCG",
    68: "One Piece Card Game",
}

TARGET_CATEGORY_IDS = set(TARGET_CATEGORIES.keys())
ARCHIVE_START_DATE = date(2024, 2, 8)
BATCH_SIZE = 5000  # rows per bulk insert commit


def extract_extended(extended_data: list[dict], key: str) -> str | None:
    for item in extended_data:
        if item.get("name") == key:
            return item.get("value")
    return None


def is_card_product(extended_data: list[dict]) -> bool:
    for item in extended_data:
        if item.get("name") in ("Rarity", "Number"):
            return True
    return False


def get_last_history_date(db) -> date | None:
    result = db.query(func.max(PriceHistory.date)).scalar()
    return result


def get_skipped_dates(db) -> set[date]:
    rows = db.query(SkippedArchiveDate.date).all()
    return {r[0] for r in rows}


def get_dates_with_history(db) -> set[date]:
    rows = db.query(PriceHistory.date).distinct().all()
    return {r[0] for r in rows}


def parse_archive_prices(extract_dir: str, archive_date: date) -> list[dict]:
    """Parse price JSON files from an extracted archive for target categories."""
    rows = []
    date_str = archive_date.isoformat()

    # Archive structure: {date_str}/{category_id}/{group_id}/prices
    date_dir = Path(extract_dir) / date_str
    if not date_dir.exists():
        # Some archives might use just the folder directly
        # Try looking for category dirs at the top level
        date_dir = Path(extract_dir)

    for cat_id in TARGET_CATEGORY_IDS:
        cat_dir = date_dir / str(cat_id)
        if not cat_dir.exists():
            continue

        for group_dir in cat_dir.iterdir():
            if not group_dir.is_dir():
                continue

            price_file = group_dir / "prices"
            if not price_file.exists():
                continue

            try:
                data = json.loads(price_file.read_text(encoding="utf-8"))
                results = data.get("results", [])
                for pr in results:
                    rows.append(
                        {
                            "product_id": pr["productId"],
                            "sub_type_name": pr.get("subTypeName", "Normal"),
                            "date": archive_date,
                            "low_price": pr.get("lowPrice"),
                            "mid_price": pr.get("midPrice"),
                            "high_price": pr.get("highPrice"),
                            "market_price": pr.get("marketPrice"),
                            "direct_low_price": pr.get("directLowPrice"),
                        }
                    )
            except (json.JSONDecodeError, KeyError) as e:
                print(f"    Warning: Could not parse {price_file}: {e}")
                continue

    return rows


def backfill_archive_date(client: TcgcsvClient, db, archive_date: date) -> int:
    """Download and import a single archive date. Returns row count."""
    date_str = archive_date.isoformat()

    with tempfile.TemporaryDirectory() as tmpdir:
        archive_path = os.path.join(tmpdir, f"prices-{date_str}.ppmd.7z")

        # Download
        client.download_archive(date_str, archive_path)

        # Extract
        with py7zr.SevenZipFile(archive_path, mode="r") as z:
            z.extractall(path=tmpdir)

        # Parse
        rows = parse_archive_prices(tmpdir, archive_date)

    if not rows:
        return 0

    # Bulk insert in batches
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        db.execute(PriceHistory.__table__.insert(), batch)
        db.flush()

    db.commit()
    return len(rows)


def fetch_live_today(client: TcgcsvClient, db):
    """Fetch today's live data: categories, groups, products, prices."""
    now = datetime.utcnow()
    today = date.today()

    for cat_id, cat_name in TARGET_CATEGORIES.items():
        print(f"\n{'='*60}")
        print(f"Fetching live data: {cat_name} (ID: {cat_id})")
        print(f"{'='*60}")

        # Upsert category
        existing_cat = db.get(Category, cat_id)
        if not existing_cat:
            db.add(Category(category_id=cat_id, name=cat_name, display_name=cat_name))
        db.flush()

        # Fetch groups
        groups = client.fetch_groups(cat_id)
        print(f"  Found {len(groups)} groups/sets")

        for i, grp in enumerate(groups):
            group_id = grp["groupId"]
            group_name = grp["name"]
            print(f"\n  [{i+1}/{len(groups)}] {group_name} (ID: {group_id})")

            # Upsert group
            existing_grp = db.get(Group, group_id)
            if not existing_grp:
                db.add(
                    Group(
                        group_id=group_id,
                        name=group_name,
                        abbreviation=grp.get("abbreviation"),
                        category_id=cat_id,
                        published_on=grp.get("publishedOn"),
                    )
                )
            db.flush()

            # Fetch products
            try:
                products = client.fetch_products(cat_id, group_id)
            except Exception as e:
                print(f"    Warning: Error fetching products: {e}")
                continue

            card_count = 0
            for prod in products:
                extended = prod.get("extendedData", [])
                if not is_card_product(extended):
                    continue

                pid = prod["productId"]
                card_count += 1

                existing_prod = db.get(Product, pid)
                if existing_prod:
                    existing_prod.name = prod["name"]
                    existing_prod.clean_name = prod.get("cleanName")
                    existing_prod.image_url = prod.get("imageUrl")
                    existing_prod.url = prod.get("url")
                    existing_prod.rarity = extract_extended(extended, "Rarity")
                    existing_prod.card_number = extract_extended(extended, "Number")
                    existing_prod.card_type = extract_extended(extended, "Card Type")
                else:
                    db.add(
                        Product(
                            product_id=pid,
                            name=prod["name"],
                            clean_name=prod.get("cleanName"),
                            image_url=prod.get("imageUrl"),
                            category_id=cat_id,
                            group_id=group_id,
                            url=prod.get("url"),
                            rarity=extract_extended(extended, "Rarity"),
                            card_number=extract_extended(extended, "Number"),
                            card_type=extract_extended(extended, "Card Type"),
                        )
                    )

            # Fetch prices
            try:
                prices = client.fetch_prices(cat_id, group_id)
            except Exception as e:
                print(f"    Warning: Error fetching prices: {e}")
                db.flush()
                continue

            card_product_ids = {
                p["productId"]
                for p in products
                if is_card_product(p.get("extendedData", []))
            }

            price_count = 0
            history_rows = []
            for pr in prices:
                pid = pr["productId"]
                if pid not in card_product_ids:
                    continue

                sub_type = pr.get("subTypeName", "Normal")
                price_count += 1

                # Upsert current price snapshot
                existing_price = (
                    db.query(Price)
                    .filter_by(product_id=pid, sub_type_name=sub_type)
                    .first()
                )
                if existing_price:
                    existing_price.low_price = pr.get("lowPrice")
                    existing_price.mid_price = pr.get("midPrice")
                    existing_price.high_price = pr.get("highPrice")
                    existing_price.market_price = pr.get("marketPrice")
                    existing_price.direct_low_price = pr.get("directLowPrice")
                    existing_price.fetched_at = now
                else:
                    db.add(
                        Price(
                            product_id=pid,
                            sub_type_name=sub_type,
                            low_price=pr.get("lowPrice"),
                            mid_price=pr.get("midPrice"),
                            high_price=pr.get("highPrice"),
                            market_price=pr.get("marketPrice"),
                            direct_low_price=pr.get("directLowPrice"),
                            fetched_at=now,
                        )
                    )

                # Also record in history
                history_rows.append(
                    {
                        "product_id": pid,
                        "sub_type_name": sub_type,
                        "date": today,
                        "low_price": pr.get("lowPrice"),
                        "mid_price": pr.get("midPrice"),
                        "high_price": pr.get("highPrice"),
                        "market_price": pr.get("marketPrice"),
                        "direct_low_price": pr.get("directLowPrice"),
                    }
                )

            db.flush()

            # Insert today's history (skip if already exists)
            if history_rows:
                existing_today = (
                    db.query(PriceHistory).filter(PriceHistory.date == today).first()
                )
                if not existing_today:
                    for j in range(0, len(history_rows), BATCH_SIZE):
                        batch = history_rows[j : j + BATCH_SIZE]
                        db.execute(PriceHistory.__table__.insert(), batch)
                        db.flush()

            print(f"    Cards: {card_count}, Price entries: {price_count}")

        db.commit()
        print(f"\n  Committed {cat_name} data")


def rebuild_price_summary(db):
    """Rebuild the price_summary table from price_history data."""
    print(f"\n{'='*60}")
    print("Rebuilding price_summary table...")
    print(f"{'='*60}")

    # Clear existing summary
    db.query(PriceSummary).delete()
    db.flush()

    today = date.today()
    date_30d = today - timedelta(days=30)
    date_90d = today - timedelta(days=90)
    date_1yr = today - timedelta(days=365)

    # Get all distinct (product_id, sub_type_name) combos from current prices
    combos = db.query(Price.product_id, Price.sub_type_name).all()
    print(f"  Processing {len(combos)} product/variant combinations...")

    batch = []
    for i, (product_id, sub_type_name) in enumerate(combos):
        # Current market price
        current = (
            db.query(Price.market_price)
            .filter_by(product_id=product_id, sub_type_name=sub_type_name)
            .scalar()
        )

        # Helper: get nearest market price to a target date (within 7 day window)
        def get_price_near_date(target_date: date) -> float | None:
            row = (
                db.query(PriceHistory.market_price)
                .filter(
                    PriceHistory.product_id == product_id,
                    PriceHistory.sub_type_name == sub_type_name,
                    PriceHistory.market_price.isnot(None),
                    PriceHistory.date.between(
                        target_date - timedelta(days=7), target_date + timedelta(days=7)
                    ),
                )
                .order_by(
                    func.abs(
                        func.julianday(PriceHistory.date) - func.julianday(target_date)
                    )
                )
                .first()
            )
            return row[0] if row else None

        def pct_change(old: float | None, new: float | None) -> float | None:
            if old is None or new is None or old == 0:
                return None
            return round((new - old) / old * 100, 2)

        price_30d = get_price_near_date(date_30d)
        price_90d = get_price_near_date(date_90d)
        price_1yr = get_price_near_date(date_1yr)

        # All-time low/high (skip first 30 days of data for this product/variant)
        earliest_date_row = (
            db.query(func.min(PriceHistory.date))
            .filter(
                PriceHistory.product_id == product_id,
                PriceHistory.sub_type_name == sub_type_name,
            )
            .scalar()
        )
        atl_cutoff = (
            earliest_date_row + timedelta(days=30) if earliest_date_row else None
        )

        atl_row = None
        ath_row = None
        if atl_cutoff:
            atl_row = (
                db.query(PriceHistory.market_price, PriceHistory.date)
                .filter(
                    PriceHistory.product_id == product_id,
                    PriceHistory.sub_type_name == sub_type_name,
                    PriceHistory.market_price.isnot(None),
                    PriceHistory.date >= atl_cutoff,
                )
                .order_by(PriceHistory.market_price.asc())
                .first()
            )
            ath_row = (
                db.query(PriceHistory.market_price, PriceHistory.date)
                .filter(
                    PriceHistory.product_id == product_id,
                    PriceHistory.sub_type_name == sub_type_name,
                    PriceHistory.market_price.isnot(None),
                    PriceHistory.date >= atl_cutoff,
                )
                .order_by(PriceHistory.market_price.desc())
                .first()
            )

        batch.append(
            {
                "product_id": product_id,
                "sub_type_name": sub_type_name,
                "market_price_30d_ago": price_30d,
                "market_price_90d_ago": price_90d,
                "market_price_1yr_ago": price_1yr,
                "pct_change_30d": pct_change(price_30d, current),
                "pct_change_90d": pct_change(price_90d, current),
                "pct_change_1yr": pct_change(price_1yr, current),
                "all_time_low": atl_row[0] if atl_row else None,
                "all_time_low_date": atl_row[1] if atl_row else None,
                "all_time_high": ath_row[0] if ath_row else None,
                "all_time_high_date": ath_row[1] if ath_row else None,
            }
        )

        if len(batch) >= BATCH_SIZE:
            db.execute(PriceSummary.__table__.insert(), batch)
            db.flush()
            batch = []

        if (i + 1) % 10000 == 0:
            print(f"  Processed {i+1}/{len(combos)}...")

    if batch:
        db.execute(PriceSummary.__table__.insert(), batch)
        db.flush()

    db.commit()
    print(f"  Done — {len(combos)} summaries written.")


def main():
    client = TcgcsvClient()
    init_db()
    db = SessionLocal()

    try:
        # ── Phase 1: Backfill from archives ──
        skipped_dates = get_skipped_dates(db)
        existing_dates = get_dates_with_history(db)
        today = date.today()
        yesterday = today - timedelta(days=1)

        # Determine start date
        last_date = get_last_history_date(db)
        if last_date is None:
            start_date = ARCHIVE_START_DATE
        else:
            start_date = last_date + timedelta(days=1)

        # Build list of dates to fetch
        dates_to_fetch = []
        d = start_date
        while d <= yesterday:
            if d not in skipped_dates and d not in existing_dates:
                dates_to_fetch.append(d)
            d += timedelta(days=1)

        if dates_to_fetch:
            print(f"\n{'='*60}")
            print(f"Backfilling {len(dates_to_fetch)} archive dates")
            print(f"  From: {dates_to_fetch[0]}")
            print(f"  To:   {dates_to_fetch[-1]}")
            print(f"{'='*60}")

            for i, archive_date in enumerate(dates_to_fetch):
                try:
                    count = backfill_archive_date(client, db, archive_date)
                    print(
                        f"  [{archive_date}] {count:,} price entries "
                        f"({i+1} of {len(dates_to_fetch)})"
                    )
                except Exception as e:
                    reason = str(e)[:200]
                    print(
                        f"  [{archive_date}] SKIPPED — {reason} "
                        f"({i+1} of {len(dates_to_fetch)})"
                    )
                    # Record as permanently skipped
                    db.rollback()
                    db.merge(SkippedArchiveDate(date=archive_date, reason=reason))
                    db.commit()
        else:
            print("\nNo archive dates to backfill.")

        # # ── Phase 2: Fetch today's live data ──
        # fetch_live_today(client, db)

        # ── Phase 3: Rebuild price summary ──
        rebuild_price_summary(db)

        # ── Final summary ──
        print(f"\n{'='*60}")
        print("SUMMARY")
        print(f"{'='*60}")
        for cat_id, cat_name in TARGET_CATEGORIES.items():
            count = db.query(Product).filter_by(category_id=cat_id).count()
            price_ct = (
                db.query(Price)
                .join(Product)
                .filter(Product.category_id == cat_id)
                .count()
            )
            print(f"  {cat_name}: {count} cards, {price_ct} price entries")

        history_count = db.query(func.count(PriceHistory.product_id)).scalar()
        summary_count = db.query(func.count(PriceSummary.product_id)).scalar()
        skip_count = db.query(func.count(SkippedArchiveDate.date)).scalar()
        print(f"\n  Price history rows: {history_count:,}")
        print(f"  Price summaries: {summary_count:,}")
        print(f"  Skipped archive dates: {skip_count}")

    except Exception as e:
        db.rollback()
        print(f"\nFATAL ERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
