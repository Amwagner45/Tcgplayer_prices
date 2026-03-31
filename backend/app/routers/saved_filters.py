from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import SavedFilter

router = APIRouter(prefix="/api/saved-filters")


class SavedFilterCreate(BaseModel):
    name: str
    filterJson: str


class SavedFilterUpdate(BaseModel):
    name: str | None = None
    filterJson: str | None = None


@router.get("")
def list_saved_filters(db: Session = Depends(get_db)):
    rows = db.query(SavedFilter).order_by(SavedFilter.name).all()
    return [
        {
            "id": sf.id,
            "name": sf.name,
            "filterJson": sf.filter_json,
            "createdAt": sf.created_at.isoformat(),
        }
        for sf in rows
    ]


@router.post("")
def create_saved_filter(body: SavedFilterCreate, db: Session = Depends(get_db)):
    sf = SavedFilter(name=body.name, filter_json=body.filterJson)
    db.add(sf)
    db.commit()
    db.refresh(sf)
    return {
        "id": sf.id,
        "name": sf.name,
        "filterJson": sf.filter_json,
        "createdAt": sf.created_at.isoformat(),
    }


@router.put("/{filter_id}")
def update_saved_filter(
    filter_id: int, body: SavedFilterUpdate, db: Session = Depends(get_db)
):
    sf = db.get(SavedFilter, filter_id)
    if not sf:
        raise HTTPException(status_code=404, detail="Saved filter not found")
    if body.name is not None:
        sf.name = body.name
    if body.filterJson is not None:
        sf.filter_json = body.filterJson
    db.commit()
    return {
        "id": sf.id,
        "name": sf.name,
        "filterJson": sf.filter_json,
        "createdAt": sf.created_at.isoformat(),
    }


@router.delete("/{filter_id}")
def delete_saved_filter(filter_id: int, db: Session = Depends(get_db)):
    sf = db.get(SavedFilter, filter_id)
    if not sf:
        raise HTTPException(status_code=404, detail="Saved filter not found")
    db.delete(sf)
    db.commit()
    return {"ok": True}
