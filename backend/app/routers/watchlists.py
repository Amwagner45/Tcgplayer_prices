from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Watchlist, WatchlistItem

router = APIRouter(prefix="/api/watchlists")


class WatchlistCreate(BaseModel):
    name: str


class WatchlistRename(BaseModel):
    name: str


class WatchlistAddItem(BaseModel):
    productId: int


@router.get("")
def list_watchlists(db: Session = Depends(get_db)):
    rows = db.query(Watchlist).order_by(Watchlist.name).all()
    return [
        {
            "id": w.id,
            "name": w.name,
            "itemCount": len(w.items),
            "createdAt": w.created_at.isoformat(),
        }
        for w in rows
    ]


@router.post("")
def create_watchlist(body: WatchlistCreate, db: Session = Depends(get_db)):
    w = Watchlist(name=body.name)
    db.add(w)
    db.commit()
    db.refresh(w)
    return {
        "id": w.id,
        "name": w.name,
        "itemCount": 0,
        "createdAt": w.created_at.isoformat(),
    }


@router.put("/{watchlist_id}")
def rename_watchlist(
    watchlist_id: int, body: WatchlistRename, db: Session = Depends(get_db)
):
    w = db.get(Watchlist, watchlist_id)
    if not w:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    w.name = body.name
    db.commit()
    return {"id": w.id, "name": w.name}


@router.delete("/{watchlist_id}")
def delete_watchlist(watchlist_id: int, db: Session = Depends(get_db)):
    w = db.get(Watchlist, watchlist_id)
    if not w:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    db.delete(w)
    db.commit()
    return {"ok": True}


@router.get("/{watchlist_id}/items")
def list_items(watchlist_id: int, db: Session = Depends(get_db)):
    items = (
        db.query(WatchlistItem.product_id)
        .filter(WatchlistItem.watchlist_id == watchlist_id)
        .all()
    )
    return [r.product_id for r in items]


@router.post("/{watchlist_id}/items")
def add_item(watchlist_id: int, body: WatchlistAddItem, db: Session = Depends(get_db)):
    w = db.get(Watchlist, watchlist_id)
    if not w:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    existing = (
        db.query(WatchlistItem)
        .filter_by(watchlist_id=watchlist_id, product_id=body.productId)
        .first()
    )
    if existing:
        return {"ok": True, "alreadyExists": True}
    db.add(WatchlistItem(watchlist_id=watchlist_id, product_id=body.productId))
    db.commit()
    return {"ok": True, "alreadyExists": False}


@router.delete("/{watchlist_id}/items/{product_id}")
def remove_item(watchlist_id: int, product_id: int, db: Session = Depends(get_db)):
    item = (
        db.query(WatchlistItem)
        .filter_by(watchlist_id=watchlist_id, product_id=product_id)
        .first()
    )
    if item:
        db.delete(item)
        db.commit()
    return {"ok": True}
