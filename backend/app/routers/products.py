from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, case
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Product, Price, Group, Category

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
        )
        .join(Price, Product.product_id == Price.product_id)
        .join(Group, Product.group_id == Group.group_id)
        .join(Category, Product.category_id == Category.category_id)
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
