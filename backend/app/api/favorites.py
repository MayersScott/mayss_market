from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Favorite, Product, User
from app.schemas import FavoriteOut, FavoriteToggleResult

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=list[FavoriteOut])
def list_favorites(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Favorite)
        .filter(Favorite.user_id == user.id)
        .order_by(Favorite.id.desc())
        .all()
    )


@router.post("/toggle/{product_id}", response_model=FavoriteToggleResult)
def toggle_favorite(
    product_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = (
        db.query(Favorite)
        .filter(Favorite.user_id == user.id, Favorite.product_id == product_id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
        return FavoriteToggleResult(product_id=product_id, favorited=False)

    fav = Favorite(user_id=user.id, product_id=product_id)
    db.add(fav)
    db.commit()
    return FavoriteToggleResult(product_id=product_id, favorited=True)


@router.delete("/{product_id}")
def remove_favorite(
    product_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fav = (
        db.query(Favorite)
        .filter(Favorite.user_id == user.id, Favorite.product_id == product_id)
        .first()
    )
    if fav:
        db.delete(fav)
        db.commit()
    return {"ok": True}
