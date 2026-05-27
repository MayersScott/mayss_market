from decimal import Decimal
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import CartItem, Order, OrderItem, OrderStatus, Product, User, UserRole
from app.models.promotions import PromoCode, PromoCodeUsage
from app.schemas import OrderCreate, OrderOut
from app.core.logger import logger
from app.services.bonus_service import spend_on_order
from app.services.promo_service import get_promo_by_code, validate_promo_for_cart

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=list[OrderOut])
def create_orders(
    data: OrderCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cart_items = db.query(CartItem).filter(CartItem.user_id == user.id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    by_seller: dict[int, list[CartItem]] = {}
    for item in cart_items:
        by_seller.setdefault(item.product.seller_id, []).append(item)

    for items in by_seller.values():
        for item in items:
            if item.product.stock < item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Not enough stock for {item.product.title}",
                )

    promo = None
    promo_per_seller: dict[int, Decimal] = {}
    if data.promo_code:
        promo = get_promo_by_code(db, data.promo_code)
        if not promo:
            raise HTTPException(status_code=400, detail="Промокод не найден")
        try:
            _, promo_per_seller = validate_promo_for_cart(db, promo, user.id, cart_items)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    remaining_bonus = data.bonus_to_spend or Decimal("0")
    created_orders: list[Order] = []

    try:
        for seller_id, items in by_seller.items():
            subtotal = sum(
                (item.product.price * item.quantity for item in items),
                start=Decimal(0),
            )
            promo_discount = promo_per_seller.get(seller_id, Decimal("0"))
            after_promo = max(subtotal - promo_discount, Decimal("0"))

            bonus_part = Decimal("0")
            if remaining_bonus > 0 and after_promo > 0:
                bonus_part = min(remaining_bonus, after_promo)
                remaining_bonus -= bonus_part

            total = max(after_promo - bonus_part, Decimal("0"))

            order = Order(
                buyer_id=user.id,
                seller_id=seller_id,
                subtotal=subtotal,
                promo_discount=promo_discount,
                bonus_spent=bonus_part,
                promo_code=promo.code if promo and promo_discount > 0 else None,
                total=total,
                address=data.address,
                status=OrderStatus.CREATED,
            )
            db.add(order)
            db.flush()

            if bonus_part > 0:
                spend_on_order(db, user.id, order.id, bonus_part, subtotal)

            if promo and promo_discount > 0:
                db.add(
                    PromoCodeUsage(
                        promo_id=promo.id,
                        user_id=user.id,
                        order_id=order.id,
                        discount_amount=promo_discount,
                    )
                )

            for cart_item in items:
                product = cart_item.product
                db.add(
                    OrderItem(
                        order_id=order.id,
                        product_id=product.id,
                        title=product.title,
                        price=product.price,
                        quantity=cart_item.quantity,
                        image_url=product.image_url,
                    )
                )
                product.stock -= cart_item.quantity

            created_orders.append(order)

        if promo:
            promo.uses_count += 1

        for item in cart_items:
            db.delete(item)

        db.commit()
        for order in created_orders:
            db.refresh(order)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        db.rollback()
        raise

    return created_orders


@router.get("", response_model=list[OrderOut])
def list_my_orders(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Order)
        .filter(Order.buyer_id == user.id)
        .order_by(Order.id.desc())
        .all()
    )


@router.get("/{order_id}", response_model=OrderOut)
def get_order(
    order_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.buyer_id != user.id and user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    return order


@router.post("/{order_id}/confirm-pickup")
def confirm_pickup(
    order_id: int,
    code: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.services.bonus_service import earn_for_delivered_order
    from app.services.notifier import notify_user_order_status

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.buyer_id != user.id and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only the buyer can confirm pickup")

    if order.status != OrderStatus.SHIPPED:
        raise HTTPException(status_code=400, detail="Order is not ready for pickup")

    if not order.pickup_code or order.pickup_code.upper() != code.strip().upper():
        logger.warning("Неверный код получения для заказа %s от юзера %s", order.id, user.id)
        raise HTTPException(status_code=400, detail="Invalid pickup code")

    order.status = OrderStatus.DELIVERED
    order.delivered_at = datetime.now(timezone.utc).replace(tzinfo=None)
    earn_for_delivered_order(db, user.id, order.id, order.total)
    db.commit()
    notify_user_order_status(db, order, OrderStatus.DELIVERED.value)
    logger.info("Заказ %s успешно получен клиентом %s", order.id, user.id)
    return {"ok": True, "status": order.status}
