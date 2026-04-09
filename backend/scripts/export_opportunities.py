"""
Export top opportunities to a static JSON file for GitHub Pages.

Queries the DB for cards near their all-time low with high potential gain,
then writes a compact JSON file that the static frontend can consume.

Usage:
    cd backend
    python -m scripts.export_opportunities
"""

import sys
import os
import json
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import case
from app.database import SessionLocal, init_db
from app.models import Product, Price, PriceSummary, Group, Category

# Match OpportunitiesPanel defaults
MIN_PRICE = 5.0
MAX_RANGE_POSITION = 0.30
MAX_ITEMS = 500

OUTPUT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "frontend",
    "public",
    "data",
)
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "opportunities.json")


def export_opportunities():
    init_db()
    db = SessionLocal()

    try:
        range_position = case(
            (
                (PriceSummary.all_time_high.isnot(None))
                & (PriceSummary.all_time_low.isnot(None))
                & (PriceSummary.all_time_high > PriceSummary.all_time_low)
                & (Price.market_price.isnot(None)),
                (Price.market_price - PriceSummary.all_time_low)
                / (PriceSummary.all_time_high - PriceSummary.all_time_low),
            ),
            else_=None,
        ).label("range_position")

        potential_gain = case(
            (
                (PriceSummary.all_time_high.isnot(None))
                & (Price.market_price.isnot(None))
                & (Price.market_price > 0),
                (PriceSummary.all_time_high - Price.market_price) / Price.market_price,
            ),
            else_=None,
        ).label("potential_gain")

        query = (
            db.query(
                Product.product_id,
                Product.name,
                Product.clean_name,
                Product.image_url,
                Product.category_id,
                Product.group_id,
                Product.url,
                Product.rarity,
                Product.card_number,
                Product.card_type,
                Group.name.label("group_name"),
                Category.display_name.label("category_name"),
                Price.sub_type_name,
                Price.low_price,
                Price.mid_price,
                Price.high_price,
                Price.market_price,
                Price.direct_low_price,
                PriceSummary.pct_change_30d,
                PriceSummary.pct_change_90d,
                PriceSummary.pct_change_1yr,
                PriceSummary.all_time_low,
                PriceSummary.all_time_low_date,
                PriceSummary.all_time_high,
                PriceSummary.all_time_high_date,
            )
            .join(Price, Product.product_id == Price.product_id)
            .join(Group, Product.group_id == Group.group_id)
            .join(Category, Product.category_id == Category.category_id)
            .outerjoin(
                PriceSummary,
                (Price.product_id == PriceSummary.product_id)
                & (Price.sub_type_name == PriceSummary.sub_type_name),
            )
            .filter(Price.market_price.isnot(None))
            .filter(Price.market_price >= MIN_PRICE)
            .filter(
                PriceSummary.all_time_high.isnot(None),
                PriceSummary.all_time_low.isnot(None),
                PriceSummary.all_time_high > PriceSummary.all_time_low,
                (Price.market_price - PriceSummary.all_time_low)
                / (PriceSummary.all_time_high - PriceSummary.all_time_low)
                <= MAX_RANGE_POSITION,
            )
            .order_by(potential_gain.desc().nullslast())
            .limit(MAX_ITEMS)
        )

        rows = query.all()

        items = []
        for r in rows:
            rp = None
            if (
                r.all_time_high is not None
                and r.all_time_low is not None
                and r.all_time_high > r.all_time_low
                and r.market_price is not None
            ):
                rp = round(
                    (r.market_price - r.all_time_low)
                    / (r.all_time_high - r.all_time_low),
                    4,
                )
                rp = max(0.0, min(1.0, rp))

            pg = None
            if (
                r.all_time_high is not None
                and r.market_price is not None
                and r.market_price > 0
            ):
                pg = round((r.all_time_high - r.market_price) / r.market_price * 100, 2)

            pct_below_mid = None
            if r.mid_price and r.mid_price > 0 and r.market_price is not None:
                pct_below_mid = round(
                    (r.mid_price - r.market_price) / r.mid_price * 100, 2
                )

            items.append(
                {
                    "productId": r.product_id,
                    "name": r.name,
                    "cleanName": r.clean_name,
                    "imageUrl": r.image_url,
                    "categoryId": r.category_id,
                    "groupId": r.group_id,
                    "url": r.url,
                    "rarity": r.rarity,
                    "cardNumber": r.card_number,
                    "cardType": r.card_type,
                    "groupName": r.group_name,
                    "categoryName": r.category_name,
                    "subTypeName": r.sub_type_name,
                    "lowPrice": r.low_price,
                    "midPrice": r.mid_price,
                    "highPrice": r.high_price,
                    "marketPrice": r.market_price,
                    "directLowPrice": r.direct_low_price,
                    "pctBelowMid": pct_below_mid,
                    "pctChange30d": (
                        round(r.pct_change_30d, 2)
                        if r.pct_change_30d is not None
                        else None
                    ),
                    "pctChange90d": (
                        round(r.pct_change_90d, 2)
                        if r.pct_change_90d is not None
                        else None
                    ),
                    "pctChange1yr": (
                        round(r.pct_change_1yr, 2)
                        if r.pct_change_1yr is not None
                        else None
                    ),
                    "allTimeLow": r.all_time_low,
                    "allTimeLowDate": (
                        r.all_time_low_date.isoformat() if r.all_time_low_date else None
                    ),
                    "allTimeHigh": r.all_time_high,
                    "allTimeHighDate": (
                        r.all_time_high_date.isoformat()
                        if r.all_time_high_date
                        else None
                    ),
                    "rangePosition": rp,
                    "potentialGain": pg,
                }
            )

        # Build the static data envelope
        payload = {
            "items": items,
            "total": len(items),
            "page": 1,
            "pageSize": len(items),
            "totalPages": 1,
            "exportedAt": date.today().isoformat(),
        }

        os.makedirs(OUTPUT_DIR, exist_ok=True)
        with open(OUTPUT_FILE, "w") as f:
            json.dump(payload, f, separators=(",", ":"))

        file_size = os.path.getsize(OUTPUT_FILE)
        print(f"Exported {len(items)} opportunities to {OUTPUT_FILE}")
        print(f"File size: {file_size / 1024:.1f} KB")

    finally:
        db.close()


if __name__ == "__main__":
    export_opportunities()
