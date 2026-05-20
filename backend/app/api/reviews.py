from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Order, OrderItem, OrderStatus, Product, Review, User
from app.schemas import ReviewCreate, ReviewOut

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("/product/{product_id}", response_model=list[ReviewOut])
def list_product_reviews(product_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Review)
        .filter(Review.product_id == product_id)
        .order_by(Review.created_at.desc())
        .all()
    )


@router.post("", response_model=ReviewOut)
def create_review(
    data: ReviewCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bought = (
        db.query(OrderItem)
        .join(Order, OrderItem.order_id == Order.id)
        .filter(
            Order.buyer_id == user.id,
            OrderItem.product_id == data.product_id,
            Order.status == OrderStatus.DELIVERED,
        )
        .first()
    )
    if not bought:
        raise HTTPException(
            status_code=403,
            detail="You can only review products you have purchased and received",
        )

    existing = (
        db.query(Review)
        .filter(Review.user_id == user.id, Review.product_id == data.product_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="You have already reviewed this product")

    review = Review(
        user_id=user.id,
        product_id=data.product_id,
        rating=data.rating,
        text=data.text,
    )
    db.add(review)

    product = db.query(Product).filter(Product.id == data.product_id).first()
    all_reviews = db.query(Review).filter(Review.product_id == data.product_id).all()
    ratings = [r.rating for r in all_reviews] + [data.rating]
    product.rating = round(sum(ratings) / len(ratings), 2)
    product.reviews_count = len(ratings)

    db.commit()
    db.refresh(review)
    return review
