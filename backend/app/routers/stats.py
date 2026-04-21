from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, distinct
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Product, Price, Group, Category

router = APIRouter(prefix="/api")


def parse_release_year(published_on: str | None) -> int | None:
    if not published_on:
        return None
    year_text = published_on[:4]
    return int(year_text) if year_text.isdigit() else None


@router.get("/stats")
def get_stats(
    category_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    query = (
        db.query(
            Category.category_id,
            Category.display_name,
            func.count(distinct(Product.product_id)).label("total_cards"),
        )
        .join(Product, Category.category_id == Product.category_id)
        .join(Price, Product.product_id == Price.product_id)
        .filter(Price.market_price.isnot(None))
        .group_by(Category.category_id, Category.display_name)
    )

    if category_id is not None:
        query = query.filter(Category.category_id == category_id)

    categories = []
    for row in query.all():
        categories.append(
            {
                "categoryId": row.category_id,
                "displayName": row.display_name,
                "totalCards": row.total_cards,
            }
        )

    # Count cards where market is > 20% below mid
    deals_query = (
        db.query(func.count())
        .select_from(Price)
        .join(Product, Price.product_id == Product.product_id)
        .filter(
            Price.market_price.isnot(None),
            Price.mid_price.isnot(None),
            Price.mid_price > 0,
            ((Price.mid_price - Price.market_price) / Price.mid_price * 100) >= 20,
        )
    )
    if category_id is not None:
        deals_query = deals_query.filter(Product.category_id == category_id)

    big_deals = deals_query.scalar() or 0

    return {
        "categories": categories,
        "bigDeals": big_deals,
    }


@router.get("/filters")
def get_filters(
    category_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    # Rarities
    rarity_q = db.query(distinct(Product.rarity)).filter(Product.rarity.isnot(None))
    if category_id is not None:
        rarity_q = rarity_q.filter(Product.category_id == category_id)
    rarities = sorted([r[0] for r in rarity_q.all()])

    # Groups (sets)
    group_q = db.query(Group.group_id, Group.name, Group.published_on)
    if category_id is not None:
        group_q = group_q.filter(Group.category_id == category_id)
    groups = [
        {
            "groupId": g.group_id,
            "name": g.name,
            "publishedOn": g.published_on,
            "releaseYear": parse_release_year(g.published_on),
        }
        for g in group_q.order_by(Group.name).all()
    ]
    release_years = sorted(
        {
            release_year
            for release_year in (
                parse_release_year(group["publishedOn"]) for group in groups
            )
            if release_year is not None
        },
        reverse=True,
    )

    # SubTypes
    sub_q = db.query(distinct(Price.sub_type_name))
    if category_id is not None:
        sub_q = sub_q.join(Product, Price.product_id == Product.product_id).filter(
            Product.category_id == category_id
        )
    sub_types = sorted([s[0] for s in sub_q.all()])

    # Categories
    cats = [
        {"categoryId": c.category_id, "displayName": c.display_name}
        for c in db.query(Category).order_by(Category.display_name).all()
    ]

    return {
        "categories": cats,
        "rarities": rarities,
        "groups": groups,
        "subTypes": sub_types,
        "releaseYears": release_years,
    }
