import json
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin, require_seller
from app.core.database import get_db
from app.models import CartItem, User
from app.models.promotions import PromoCode, PromoDiscountType, PromoOwnerType
from app.schemas.promotions import (
    BonusBalanceOut,
    BonusTransactionOut,
    PromoCodeCreate,
    PromoCodeOut,
    PromoPreviewIn,
    PromoPreviewOut,
)
from app.services.bonus_service import get_balance, get_or_create_wallet
from app.services.promo_service import get_promo_by_code, preview_promo

router = APIRouter(tags=["promos"])


def _serialize_promo(promo: PromoCode) -> PromoCodeOut:
    return PromoCodeOut(
        id=promo.id,
        code=promo.code,
        owner_type=promo.owner_type,
        seller_id=promo.seller_id,
        title=promo.title,
        discount_type=promo.discount_type,
        discount_value=promo.discount_value,
        min_order_amount=promo.min_order_amount,
        max_uses=promo.max_uses,
        uses_count=promo.uses_count,
        is_active=promo.is_active,
        valid_from=promo.valid_from,
        valid_until=promo.valid_until,
        applies_to_all_products=promo.applies_to_all_products,
        product_ids=json.loads(promo.product_ids) if promo.product_ids else [],
        category_ids=json.loads(promo.category_ids) if promo.category_ids else [],
        created_at=promo.created_at,
    )


def _apply_create_payload(data: PromoCodeCreate, promo: PromoCode) -> None:
    promo.code = data.code.strip().upper()
    promo.owner_type = data.owner_type
    promo.seller_id = data.seller_id
    promo.title = data.title
    promo.discount_type = data.discount_type
    promo.discount_value = data.discount_value
    promo.min_order_amount = data.min_order_amount
    promo.max_uses = data.max_uses
    promo.is_active = data.is_active
    promo.valid_from = data.valid_from
    promo.valid_until = data.valid_until
    promo.applies_to_all_products = data.applies_to_all_products
    promo.product_ids = json.dumps(data.product_ids) if data.product_ids else None
    promo.category_ids = json.dumps(data.category_ids) if data.category_ids else None


@router.get("/bonuses/balance", response_model=BonusBalanceOut)
def bonus_balance(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    wallet = get_or_create_wallet(db, user.id)
    db.commit()
    return BonusBalanceOut(balance=wallet.balance)


@router.get("/bonuses/transactions", response_model=list[BonusTransactionOut])
def bonus_transactions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
):
    wallet = get_or_create_wallet(db, user.id)
    return sorted(wallet.transactions, key=lambda t: t.id, reverse=True)[:limit]


@router.post("/promos/preview", response_model=PromoPreviewOut)
def promo_preview(
    data: PromoPreviewIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cart_items = db.query(CartItem).filter(CartItem.user_id == user.id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Корзина пуста")
    try:
        result = preview_promo(db, data.code, user.id, cart_items)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return PromoPreviewOut(**result)


@router.get("/admin/promos", response_model=list[PromoCodeOut])
def admin_list_promos(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    promos = db.query(PromoCode).order_by(PromoCode.id.desc()).all()
    return [_serialize_promo(p) for p in promos]


@router.post("/admin/promos", response_model=PromoCodeOut)
def admin_create_promo(
    data: PromoCodeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    if data.owner_type != PromoOwnerType.MARKETPLACE:
        raise HTTPException(status_code=400, detail="Админ создаёт только промокоды маркетплейса")
    if db.query(PromoCode).filter(PromoCode.code == data.code.strip().upper()).first():
        raise HTTPException(status_code=400, detail="Промокод уже существует")
    promo = PromoCode(created_by_id=user.id)
    _apply_create_payload(data, promo)
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return _serialize_promo(promo)


@router.patch("/admin/promos/{promo_id}", response_model=PromoCodeOut)
def admin_update_promo(
    promo_id: int,
    data: PromoCodeCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    promo = db.query(PromoCode).filter(PromoCode.id == promo_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Промокод не найден")
    _apply_create_payload(data, promo)
    db.commit()
    db.refresh(promo)
    return _serialize_promo(promo)


@router.get("/seller/promos", response_model=list[PromoCodeOut])
def seller_list_promos(user: User = Depends(require_seller), db: Session = Depends(get_db)):
    if not user.seller_profile:
        raise HTTPException(status_code=404, detail="Профиль продавца не найден")
    promos = (
        db.query(PromoCode)
        .filter(PromoCode.seller_id == user.seller_profile.id)
        .order_by(PromoCode.id.desc())
        .all()
    )
    return [_serialize_promo(p) for p in promos]


@router.post("/seller/promos", response_model=PromoCodeOut)
def seller_create_promo(
    data: PromoCodeCreate,
    user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    if not user.seller_profile:
        raise HTTPException(status_code=404, detail="Профиль продавца не найден")
    if not user.seller_profile.is_verified:
        raise HTTPException(status_code=403, detail="Промокоды доступны после верификации")
    if data.owner_type != PromoOwnerType.SHOP:
        raise HTTPException(status_code=400, detail="Продавец создаёт только промокоды магазина")
    data.seller_id = user.seller_profile.id
    if db.query(PromoCode).filter(PromoCode.code == data.code.strip().upper()).first():
        raise HTTPException(status_code=400, detail="Промокод уже существует")
    promo = PromoCode(created_by_id=user.id, seller_id=user.seller_profile.id)
    _apply_create_payload(data, promo)
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return _serialize_promo(promo)
