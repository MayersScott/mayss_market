from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.logger import logger
from app.models import CartItem, Product, ProductStatus, User
from app.schemas import CartItemAdd, CartItemOut, CartOut
from app.services.bonus_service import get_balance

router = APIRouter(prefix="/cart", tags=["cart"])


def _calculate_cart_totals(db: Session, user: User) -> tuple[Decimal, Decimal, Decimal]:
    items = db.query(CartItem).filter(CartItem.user_id == user.id).all()
    
    subtotal = Decimal("0")
    for item in items:
        subtotal += item.product.price * Decimal(item.quantity)
    
    available_bonuses = get_balance(db, user.id)
    max_bonus_discount = (subtotal * Decimal("50") / Decimal("100")).quantize(Decimal("0.01"))
    
    return subtotal, available_bonuses, max_bonus_discount


def _build_cart(db: Session, user: User) -> CartOut:
    items = db.query(CartItem).filter(CartItem.user_id == user.id).all()
    
    subtotal, available_bonuses, _ = _calculate_cart_totals(db, user)
    
    cart_items = [
        CartItemOut(
            id=item.id,
            product_id=item.product_id,
            quantity=item.quantity,
            product=item.product,
        )
        for item in items
    ]
    
    return CartOut(
        items=cart_items,
        subtotal=subtotal,
        available_bonuses=available_bonuses,
        total=subtotal,
    )


@router.get("", response_model=CartOut)
def get_cart(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info(f"User {user.id} retrieved cart")
    return _build_cart(db, user)


@router.get("/summary")
def get_cart_summary(
    promo_code: str | None = Query(None),
    bonus_to_use: Decimal | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subtotal, available_bonuses, max_bonus_discount = _calculate_cart_totals(db, user)
    
    if subtotal == Decimal("0"):
        return {
            "subtotal": Decimal("0"),
            "available_bonuses": available_bonuses,
            "max_bonus_discount": Decimal("0"),
            "promo_discount": Decimal("0"),
            "bonus_discount": Decimal("0"),
            "total": Decimal("0"),
        }
    
    bonus_discount = Decimal("0")
    if bonus_to_use and bonus_to_use > Decimal("0"):
        if bonus_to_use > available_bonuses:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient bonuses. Available: {available_bonuses}, Requested: {bonus_to_use}",
            )
        bonus_discount = min(bonus_to_use, max_bonus_discount)
    
    promo_discount = Decimal("0")
    if promo_code:
        from app.services.promo_service import get_promo_by_code
        promo = get_promo_by_code(db, promo_code)
        if not promo:
            logger.warning(f"Invalid promo code: {promo_code}")
            raise HTTPException(status_code=400, detail="Invalid promo code")
        if promo.discount_type.value == "percent":
            promo_discount = (subtotal * Decimal(promo.discount_value) / Decimal("100")).quantize(Decimal("0.01"))
        else:
            promo_discount = min(Decimal(promo.discount_value), subtotal)
    
    total = (subtotal - promo_discount - bonus_discount).quantize(Decimal("0.01"))
    if total < Decimal("0"):
        total = Decimal("0")
    
    return {
        "subtotal": subtotal,
        "available_bonuses": available_bonuses,
        "max_bonus_discount": max_bonus_discount,
        "promo_discount": promo_discount,
        "bonus_discount": bonus_discount,
        "total": total,
    }


@router.post("/items", response_model=CartOut)
def add_item(
    data: CartItemAdd,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product or product.status != ProductStatus.ACTIVE:
        logger.warning(f"Product {data.product_id} not available")
        raise HTTPException(status_code=404, detail="Product not available")
    
    if product.stock < data.quantity:
        logger.warning(f"Insufficient stock for product {data.product_id}")
        raise HTTPException(status_code=400, detail="Not enough stock")

    item = (
        db.query(CartItem)
        .filter(CartItem.user_id == user.id, CartItem.product_id == data.product_id)
        .first()
    )
    if item:
        item.quantity += data.quantity
        logger.info(f"Updated item {data.product_id} in cart, new qty: {item.quantity}")
    else:
        item = CartItem(user_id=user.id, product_id=data.product_id, quantity=data.quantity)
        db.add(item)
        logger.info(f"Added item {data.product_id} to cart")
    
    db.commit()
    return _build_cart(db, user)


@router.delete("/items/{product_id}", response_model=CartOut)
def remove_item(
    product_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(CartItem)
        .filter(CartItem.user_id == user.id, CartItem.product_id == product_id)
        .first()
    )
    if item:
        db.delete(item)
        logger.info(f"Removed item {product_id} from cart")
        db.commit()
    return _build_cart(db, user)


@router.put("/items/{product_id}", response_model=CartOut)
def update_quantity(
    product_id: int,
    quantity: int = Query(..., ge=1),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be >= 1")
    
    item = (
        db.query(CartItem)
        .filter(CartItem.user_id == user.id, CartItem.product_id == product_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not in cart")
    
    product = item.product
    if product.stock < quantity:
        raise HTTPException(status_code=400, detail="Not enough stock")
    
    item.quantity = quantity
    logger.info(f"Updated item {product_id} quantity to {quantity}")
    db.commit()
    return _build_cart(db, user)


@router.delete("")
def clear_cart(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = db.query(CartItem).filter(CartItem.user_id == user.id).all()
    for item in items:
        db.delete(item)
    logger.info(f"Cleared cart for user {user.id}")
    db.commit()
    return {"message": "Cart cleared"}
