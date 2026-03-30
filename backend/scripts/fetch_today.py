"""
Fetch today's data from tcgcsv.com for Pokemon, Flesh and Blood, and One Piece.
Stores products and prices in the local SQLite database.

Usage:
    cd backend
    python -m scripts.fetch_today
"""

import sys
import os
from datetime import datetime

# Add parent dir to path so imports work when run as `python -m scripts.fetch_today`
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import SessionLocal, init_db
from app.models import Category, Group, Product, Price
from services.tcgcsv_client import TcgcsvClient

# Pokemon=3, Flesh and Blood=62, One Piece=68
TARGET_CATEGORIES = {
    3: "Pokemon",
    62: "Flesh and Blood TCG",
    68: "One Piece Card Game",
}


def extract_extended(extended_data: list[dict], key: str) -> str | None:
    """Extract a value from the extendedData array by property name."""
    for item in extended_data:
        if item.get("name") == key:
            return item.get("value")
    return None


def is_card_product(extended_data: list[dict]) -> bool:
    """Check if a product is an actual card (has Rarity or Number in extendedData)."""
    for item in extended_data:
        if item.get("name") in ("Rarity", "Number"):
            return True
    return False


def fetch_and_store():
    client = TcgcsvClient()
    init_db()
    db = SessionLocal()
    now = datetime.utcnow()

    try:
        for cat_id, cat_name in TARGET_CATEGORIES.items():
            print(f"\n{'='*60}")
            print(f"Fetching category: {cat_name} (ID: {cat_id})")
            print(f"{'='*60}")

            # Upsert category
            existing_cat = db.get(Category, cat_id)
            if not existing_cat:
                db.add(
                    Category(category_id=cat_id, name=cat_name, display_name=cat_name)
                )
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
                    print(f"    ⚠ Error fetching products: {e}")
                    continue

                card_count = 0
                for prod in products:
                    extended = prod.get("extendedData", [])
                    if not is_card_product(extended):
                        continue

                    pid = prod["productId"]
                    card_count += 1

                    # Upsert product
                    existing_prod = db.get(Product, pid)
                    if existing_prod:
                        existing_prod.name = prod["name"]
                        existing_prod.clean_name = prod.get("cleanName")
                        existing_prod.image_url = prod.get("imageUrl")
                        existing_prod.url = prod.get("url")
                        existing_prod.rarity = extract_extended(extended, "Rarity")
                        existing_prod.card_number = extract_extended(extended, "Number")
                        existing_prod.card_type = extract_extended(
                            extended, "Card Type"
                        )
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
                    print(f"    ⚠ Error fetching prices: {e}")
                    db.flush()
                    continue

                # Build set of valid product IDs (cards only) for this group
                card_product_ids = {
                    p["productId"]
                    for p in products
                    if is_card_product(p.get("extendedData", []))
                }

                price_count = 0
                for pr in prices:
                    pid = pr["productId"]
                    if pid not in card_product_ids:
                        continue

                    sub_type = pr.get("subTypeName", "Normal")
                    price_count += 1

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

                db.flush()
                print(f"    Cards: {card_count}, Price entries: {price_count}")

            db.commit()
            print(f"\n  ✓ Committed {cat_name} data")

        # Final summary
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

    except Exception as e:
        db.rollback()
        print(f"\nFATAL ERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    fetch_and_store()
