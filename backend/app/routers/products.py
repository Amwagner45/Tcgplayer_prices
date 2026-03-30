from fastapi import APIRouter, Depends, Query
from datetime import date, timedelta
from sqlalchemy import func, case
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Product, Price, PriceHistory, PriceSummary, Group, Category

router = APIRouter(prefix="/api")


@router.get("/products")
def list_products(
    category_id: int | None = Query(None),
    group_id: int | None = Query(None),
    rarity: str | None = Query(None),
    sub_type: str | None = Query(None),
    min_price: float | None = Query(None),
    max_price: float | None = Query(None),
    search: str | None = Query(None),
    sort_by: str = Query("pct_below_mid"),
    sort_dir: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    # Compute pct_below_mid as a column expression
    pct_below_mid = case(
        (
            (Price.mid_price.isnot(None))
            & (Price.mid_price > 0)
            & (Price.market_price.isnot(None)),
            (Price.mid_price - Price.market_price) / Price.mid_price * 100,
        ),
        else_=None,
    ).label("pct_below_mid")

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
            pct_below_mid,
            PriceSummary.pct_change_30d,
            PriceSummary.pct_change_90d,
            PriceSummary.pct_change_1yr,
            PriceSummary.all_time_low,
            PriceSummary.all_time_high,
        )
        .join(Price, Product.product_id == Price.product_id)
        .join(Group, Product.group_id == Group.group_id)
        .join(Category, Product.category_id == Category.category_id)
        .outerjoin(
            PriceSummary,
            (Price.product_id == PriceSummary.product_id)
            & (Price.sub_type_name == PriceSummary.sub_type_name),
        )
    )

    # Filters
    if category_id is not None:
        query = query.filter(Product.category_id == category_id)
    if group_id is not None:
        query = query.filter(Product.group_id == group_id)
    if rarity:
        query = query.filter(Product.rarity == rarity)
    if sub_type:
        query = query.filter(Price.sub_type_name == sub_type)
    if min_price is not None:
        query = query.filter(Price.market_price >= min_price)
    if max_price is not None:
        query = query.filter(Price.market_price <= max_price)
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))

    # Only show cards that have a market price
    query = query.filter(Price.market_price.isnot(None))

    # Sorting
    sort_map = {
        "pct_below_mid": pct_below_mid,
        "market_price": Price.market_price,
        "mid_price": Price.mid_price,
        "low_price": Price.low_price,
        "name": Product.name,
        "rarity": Product.rarity,
        "pct_change_30d": PriceSummary.pct_change_30d,
        "pct_change_90d": PriceSummary.pct_change_90d,
        "pct_change_1yr": PriceSummary.pct_change_1yr,
    }
    sort_col = sort_map.get(sort_by, pct_below_mid)
    if sort_dir == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    # Count total before pagination
    total = query.count()

    # Paginate
    rows = query.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for r in rows:
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
                "pctBelowMid": (
                    round(r.pct_below_mid, 2) if r.pct_below_mid is not None else None
                ),
                "pctChange30d": (
                    round(r.pct_change_30d, 2) if r.pct_change_30d is not None else None
                ),
                "pctChange90d": (
                    round(r.pct_change_90d, 2) if r.pct_change_90d is not None else None
                ),
                "pctChange1yr": (
                    round(r.pct_change_1yr, 2) if r.pct_change_1yr is not None else None
                ),
                "allTimeLow": r.all_time_low,
                "allTimeHigh": r.all_time_high,
            }
        )

    return {
        "items": items,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": (total + page_size - 1) // page_size,
    }


@router.get("/products/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = (
        db.query(Product)
        .options(
            joinedload(Product.prices),
            joinedload(Product.group),
            joinedload(Product.category),
        )
        .filter(Product.product_id == product_id)
        .first()
    )
    if not product:
        return {"error": "Product not found"}

    return {
        "productId": product.product_id,
        "name": product.name,
        "cleanName": product.clean_name,
        "imageUrl": product.image_url,
        "categoryId": product.category_id,
        "groupId": product.group_id,
        "url": product.url,
        "rarity": product.rarity,
        "cardNumber": product.card_number,
        "cardType": product.card_type,
        "groupName": product.group.name,
        "categoryName": product.category.display_name,
        "prices": [
            {
                "subTypeName": p.sub_type_name,
                "lowPrice": p.low_price,
                "midPrice": p.mid_price,
                "highPrice": p.high_price,
                "marketPrice": p.market_price,
                "directLowPrice": p.direct_low_price,
                "pctBelowMid": (
                    round((p.mid_price - p.market_price) / p.mid_price * 100, 2)
                    if p.mid_price and p.mid_price > 0 and p.market_price is not None
                    else None
                ),
            }
            for p in product.prices
        ],
    }


@router.get("/products/{product_id}/history")
def get_price_history(
    product_id: int,
    days: int = Query(365, ge=7, le=3000),
    sub_type: str | None = Query(None),
    db: Session = Depends(get_db),
):
    since = date.today() - timedelta(days=days)

    query = (
        db.query(
            PriceHistory.date,
            PriceHistory.market_price,
            PriceHistory.mid_price,
            PriceHistory.low_price,
        )
        .filter(
            PriceHistory.product_id == product_id,
            PriceHistory.date >= since,
        )
        .order_by(PriceHistory.date.asc())
    )

    if sub_type:
        query = query.filter(PriceHistory.sub_type_name == sub_type)
    else:
        # Default to the first variant found
        first_variant = (
            db.query(PriceHistory.sub_type_name)
            .filter(PriceHistory.product_id == product_id)
            .first()
        )
        if first_variant:
            query = query.filter(PriceHistory.sub_type_name == first_variant[0])

    rows = query.all()

    return {
        "productId": product_id,
        "history": [
            {
                "date": r.date.isoformat(),
                "marketPrice": r.market_price,
                "midPrice": r.mid_price,
                "lowPrice": r.low_price,
            }
            for r in rows
        ],
    }


@router.get("/products/{product_id}/comparisons")
def get_price_comparisons(
    product_id: int,
    sub_type: str | None = Query(None),
    db: Session = Depends(get_db),
):
    # Determine sub_type
    if not sub_type:
        first = (
            db.query(Price.sub_type_name).filter(Price.product_id == product_id).first()
        )
        sub_type = first[0] if first else "Normal"

    # Current price
    current = (
        db.query(Price.market_price)
        .filter_by(product_id=product_id, sub_type_name=sub_type)
        .scalar()
    )

    # Summary data
    summary = (
        db.query(PriceSummary)
        .filter_by(product_id=product_id, sub_type_name=sub_type)
        .first()
    )

    def comparison(old_price, pct):
        if old_price is None:
            return None
        return {"price": old_price, "pctChange": pct}

    return {
        "productId": product_id,
        "subTypeName": sub_type,
        "currentPrice": current,
        "thirtyDaysAgo": (
            comparison(summary.market_price_30d_ago, summary.pct_change_30d)
            if summary
            else None
        ),
        "ninetyDaysAgo": (
            comparison(summary.market_price_90d_ago, summary.pct_change_90d)
            if summary
            else None
        ),
        "oneYearAgo": (
            comparison(summary.market_price_1yr_ago, summary.pct_change_1yr)
            if summary
            else None
        ),
        "allTimeLow": (
            {
                "price": summary.all_time_low,
                "date": (
                    summary.all_time_low_date.isoformat()
                    if summary.all_time_low_date
                    else None
                ),
            }
            if summary and summary.all_time_low is not None
            else None
        ),
        "allTimeHigh": (
            {
                "price": summary.all_time_high,
                "date": (
                    summary.all_time_high_date.isoformat()
                    if summary.all_time_high_date
                    else None
                ),
            }
            if summary and summary.all_time_high is not None
            else None
        ),
    }
