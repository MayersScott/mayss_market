import json
from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models import CartItem, Product, SellerProfile
from app.models.promotions import PromoCode, PromoDiscountType, PromoOwnerType


def _parse_id_list(raw: str | None) -> set[int]:
    if not raw:
        return set()
    try:
        data = json.loads(raw)
        return {int(x) for x in data}
    except (TypeError, ValueError, json.JSONDecodeError):
        return set()


def _cart_subtotal_for_seller(items: list[CartItem], seller_id: int) -> Decimal:
    total = Decimal("0")
    for item in items:
        if item.product.seller_id == seller_id:
            total += item.product.price * item.quantity
    return total


def _eligible_cart_items(
    promo: PromoCode,
    items: list[CartItem],
    seller_id: int | None,
) -> list[CartItem]:
    product_ids = _parse_id_list(promo.product_ids)
    category_ids = _parse_id_list(promo.category_ids)
    eligible: list[CartItem] = []
    for item in items:
        product = item.product
        if seller_id is not None and product.seller_id != seller_id:
            continue
        if promo.applies_to_all_products:
            eligible.append(item)
            continue
        if product_ids and product.id in product_ids:
            eligible.append(item)
            continue
        if category_ids and product.category_id in category_ids:
            eligible.append(item)
    return eligible


def _eligible_subtotal(eligible: list[CartItem]) -> Decimal:
    return sum((i.product.price * i.quantity for i in eligible), start=Decimal("0"))


def get_promo_by_code(db: Session, code: str) -> PromoCode | None:
    return (
        db.query(PromoCode)
        .filter(PromoCode.code == code.strip().upper())
        .first()
    )


def validate_promo_for_cart(
    db: Session,
    promo: PromoCode,
    user_id: int,
    cart_items: list[CartItem],
) -> tuple[Decimal, dict[int, Decimal]]:
    now = datetime.utcnow()
    if not promo.is_active:
        raise ValueError("Промокод неактивен")
    if promo.valid_from and now < promo.valid_from:
        raise ValueError("Промокод ещё не действует")
    if promo.valid_until and now > promo.valid_until:
        raise ValueError("Срок действия промокода истёк")
    if promo.max_uses is not None and promo.uses_count >= promo.max_uses:
        raise ValueError("Лимит использований промокода исчерпан")

    seller_scope = promo.seller_id if promo.owner_type == PromoOwnerType.SHOP else None
    eligible = _eligible_cart_items(promo, cart_items, seller_scope)
    if not eligible:
        raise ValueError("Промокод не применим к товарам в корзине")

    base = _eligible_subtotal(eligible)
    if promo.min_order_amount and base < promo.min_order_amount:
        raise ValueError(
            f"Минимальная сумма заказа для промокода: {promo.min_order_amount}"
        )

    if promo.discount_type == PromoDiscountType.PERCENT:
        discount = (base * promo.discount_value / Decimal("100")).quantize(Decimal("0.01"))
    else:
        discount = min(promo.discount_value, base)

    per_seller: dict[int, Decimal] = {}
    if seller_scope:
        per_seller[seller_scope] = discount
    else:
        sellers = {i.product.seller_id for i in eligible}
        if len(sellers) == 1:
            per_seller[next(iter(sellers))] = discount
        else:
            for sid in sellers:
                seller_items = [i for i in eligible if i.product.seller_id == sid]
                part_base = _eligible_subtotal(seller_items)
                share = (part_base / base) if base > 0 else Decimal("0")
                per_seller[sid] = (discount * share).quantize(Decimal("0.01"))

    return discount, per_seller


def preview_promo(
    db: Session,
    code: str,
    user_id: int,
    cart_items: list[CartItem],
) -> dict:
    promo = get_promo_by_code(db, code)
    if not promo:
        raise ValueError("Промокод не найден")
    discount, per_seller = validate_promo_for_cart(db, promo, user_id, cart_items)
    return {
        "code": promo.code,
        "discount": discount,
        "per_seller": {str(k): str(v) for k, v in per_seller.items()},
        "owner_type": promo.owner_type.value,
        "title": promo.title,
    }
