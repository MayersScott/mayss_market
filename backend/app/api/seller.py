from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_seller, require_verified_seller
from app.core.database import get_db
from app.core.logger import logger
from app.models import (
    Order,
    OrderStatus,
    Product,
    ProductStatus,
    SellerProfile,
    User,
    UserRole,
)
from app.schemas import (
    OrderOut,
    SellerAnalyticsOut,
    ProductCreate,
    ProductOut,
    ProductUpdate,
    SellerCreate,
    SellerOut,
    SellerUpdate,
)
from app.services.analytics import build_seller_analytics

router = APIRouter(prefix="/seller", tags=["seller"])


@router.post("/profile", response_model=SellerOut)
def create_seller_profile(
    data: SellerCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.seller_profile:
        raise HTTPException(status_code=400, detail="Seller profile already exists")

    profile = SellerProfile(
        user_id=user.id,
        shop_name=data.shop_name,
        description=data.description,
        inn=data.inn,
    )
    db.add(profile)
    if user.role == UserRole.BUYER:
        user.role = UserRole.SELLER
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/profile", response_model=SellerOut)
def get_my_profile(
    user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    if not user.seller_profile:
        raise HTTPException(status_code=404, detail="Seller profile not found")
    return user.seller_profile


@router.patch("/profile", response_model=SellerOut)
def update_my_profile(
    data: SellerUpdate,
    user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    profile = user.seller_profile
    if not profile:
        raise HTTPException(status_code=404, detail="Seller profile not found")

    was_verified = profile.is_verified
    profile.shop_name = data.shop_name
    profile.description = data.description
    profile.inn = data.inn
    if was_verified:
        profile.is_verified = False
    profile.rejection_reason = None
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/products", response_model=list[ProductOut])
def list_my_products(
    user: User = Depends(require_verified_seller),
    db: Session = Depends(get_db),
):
    if not user.seller_profile:
        raise HTTPException(status_code=404, detail="Seller profile not found")
    return (
        db.query(Product)
        .filter(Product.seller_id == user.seller_profile.id)
        .order_by(Product.id.desc())
        .all()
    )


@router.post("/products", response_model=ProductOut)
def create_product(
    data: ProductCreate,
    user: User = Depends(require_verified_seller),
    db: Session = Depends(get_db),
):
    if not user.seller_profile:
        raise HTTPException(status_code=404, detail="Seller profile not found")

    product = Product(
        seller_id=user.seller_profile.id,
        category_id=data.category_id,
        title=data.title,
        description=data.description,
        brand=data.brand,
        price=data.price,
        old_price=data.old_price,
        stock=data.stock,
        image_url=data.image_url,
        status=ProductStatus.PENDING,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.patch("/products/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    data: ProductUpdate,
    user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.seller_id != user.seller_profile.id and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Forbidden")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    from app.services import search_service
    if product.status == ProductStatus.ACTIVE:
        search_service.index_product(product)
    else:
        search_service.delete_product(product.id)
    return product


@router.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.seller_id != user.seller_profile.id and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Forbidden")

    product.status = ProductStatus.ARCHIVED
    db.commit()
    from app.services import search_service
    search_service.delete_product(product.id)
    return {"ok": True}


@router.get("/orders", response_model=list[OrderOut])
def list_my_orders(
    user: User = Depends(require_verified_seller),
    db: Session = Depends(get_db),
):
    if not user.seller_profile:
        raise HTTPException(status_code=404, detail="Seller profile not found")
    return (
        db.query(Order)
        .filter(Order.seller_id == user.seller_profile.id)
        .order_by(Order.id.desc())
        .all()
    )

@router.post("/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    status: OrderStatus,
    user: User = Depends(require_seller),
    db: Session = Depends(get_db),
):
    import secrets
    from app.services.notifier import notify_user_order_status

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.seller_id != user.seller_profile.id and user.role != UserRole.ADMIN:
        logger.warning("Секьюрити: юзер %s пытался сменить статус чужого заказа %s", user.id, order.id)
        raise HTTPException(status_code=403, detail="Forbidden")

    if user.role != UserRole.ADMIN:
        if status != OrderStatus.SHIPPED:
            raise HTTPException(status_code=403, detail="Продавец может перевести заказ только в статус 'shipped'")
        if order.status not in (OrderStatus.PAID, OrderStatus.ASSEMBLING):
            raise HTTPException(status_code=400, detail="Товар еще не оплачен")

    if status == OrderStatus.SHIPPED and not order.pickup_code:
        order.pickup_code = secrets.token_hex(3).upper()
        order.shipped_at = datetime.now(timezone.utc).replace(tzinfo=None)
    elif status == OrderStatus.SHIPPED:
        order.shipped_at = order.shipped_at or datetime.now(timezone.utc).replace(tzinfo=None)
    elif status == OrderStatus.DELIVERED:
        order.delivered_at = datetime.now(timezone.utc).replace(tzinfo=None)

    old_status = order.status
    order.status = status
    db.commit()
    
    logger.info("Статус заказа %s изменен с %s на %s пользователем %s", order.id, old_status, status, user.id)
    notify_user_order_status(db, order, status.value)
    
    return {"ok": True, "status": status, "pickup_code": order.pickup_code}


@router.get("/analytics", response_model=SellerAnalyticsOut)
def get_my_analytics(
    user: User = Depends(require_verified_seller),
    db: Session = Depends(get_db),
):
    return build_seller_analytics(db, user.seller_profile)
