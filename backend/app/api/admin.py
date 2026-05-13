from decimal import Decimal
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.config import settings
from app.core.database import get_db
from app.models import (
    Order, OrderStatus, Product, ProductStatus, SellerProfile, User, SupportTicket, SupportMessage
)
from app.schemas import (
    AdminOrderDetailOut,
    AdminStats,
    ModerationAction,
    OrderOut,
    ProductOut,
    ProductListResponse,
    SellerAnalyticsOut,
    SellerOut,
    SupportMessageCreate,
    SupportTicketOut,
    UserAnalyticsOut,
    UserOut,
)
from app.services.analytics import build_seller_analytics, build_user_analytics

router = APIRouter(prefix="/admin", tags=["admin"])


def _average_delivery_hours(orders: list[Order]) -> float | None:
    intervals: list[float] = []
    for order in orders:
        if order.shipped_at and order.delivered_at and order.delivered_at >= order.shipped_at:
            delta = order.delivered_at - order.shipped_at
            intervals.append(delta.total_seconds() / 3600)
    if not intervals:
        return None
    return round(sum(intervals) / len(intervals), 2)

@router.get("/stats", response_model=AdminStats)
def get_stats(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    completed_orders = (
        db.query(Order)
        .filter(Order.status.notin_([OrderStatus.CREATED, OrderStatus.CANCELLED]))
        .all()
    )
    delivered_orders = [order for order in completed_orders if order.status == OrderStatus.DELIVERED]
    gmv = sum((order.total for order in completed_orders), start=Decimal("0"))
    fee_rate = Decimal(str(settings.PLATFORM_FEE_PERCENT)) / Decimal("100")
    marketplace_revenue = (gmv * fee_rate).quantize(Decimal("0.01"))
    net_profit = marketplace_revenue
    return AdminStats(
        users_total=db.query(User).count(),
        sellers_total=db.query(SellerProfile).count(),
        verified_sellers_total=db.query(SellerProfile).filter(SellerProfile.is_verified.is_(True)).count(),
        products_total=db.query(Product).count(),
        products_pending=db.query(Product).filter(Product.status == ProductStatus.PENDING).count(),
        orders_total=db.query(Order).count(),
        delivered_orders_total=len(delivered_orders),
        gmv=gmv,
        marketplace_revenue=marketplace_revenue,
        net_profit=net_profit,
        avg_delivery_hours=_average_delivery_hours(delivered_orders),
    )

@router.get("/products", response_model=ProductListResponse)
def list_all_products(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    status: ProductStatus | None = None,
    q: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    query = db.query(Product)
    if status:
        query = query.filter(Product.status == status)
    if q:
        query = query.filter(Product.title.ilike(f"%{q}%"))

    total = query.count()
    items = query.order_by(Product.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return ProductListResponse(items=items, total=total, page=page, page_size=page_size)

@router.post("/products/{product_id}/moderate", response_model=ProductOut)
def moderate_product(
    product_id: int,
    data: ModerationAction,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    from app.core.logger import logger
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product.status = ProductStatus.ACTIVE if data.approve else ProductStatus.REJECTED
    product.rejection_reason = None if data.approve else data.reason
    db.commit()
    db.refresh(product)
    from app.services import search_service
    if product.status == ProductStatus.ACTIVE:
        search_service.index_product(product)
    else:
        search_service.delete_product(product.id)
    logger.info("Админ %s %s товар %s", user.id, "одобрил" if data.approve else "отклонил", product.id)
    return product

@router.post("/products/{product_id}/status", response_model=ProductOut)
def set_product_status(
    product_id: int,
    status: ProductStatus,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.status = status
    db.commit()
    db.refresh(product)
    from app.services import search_service
    if product.status == ProductStatus.ACTIVE:
        search_service.index_product(product)
    else:
        search_service.delete_product(product.id)
    return product

@router.delete("/products/{product_id}")
def archive_product(product_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.status = ProductStatus.ARCHIVED
    db.commit()
    from app.services import search_service
    search_service.delete_product(product.id)
    return {"ok": True}

@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(User).order_by(User.id.desc()).limit(200).all()

@router.post("/users/{user_id}/toggle")
def toggle_user(user_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"id": user.id, "is_active": user.is_active}

@router.get("/orders", response_model=list[OrderOut])
def list_all_orders(db: Session = Depends(get_db), _: User = Depends(require_admin), limit: int = Query(100, ge=1, le=500)):
    return db.query(Order).order_by(Order.id.desc()).limit(limit).all()

@router.post("/orders/{order_id}/status")
def admin_force_order_status(
    order_id: int,
    status: OrderStatus,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    from app.core.logger import logger
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old_status = order.status
    order.status = status
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if status == OrderStatus.PAID:
        order.paid_at = order.paid_at or now
    elif status == OrderStatus.SHIPPED:
        order.shipped_at = order.shipped_at or now
    elif status == OrderStatus.DELIVERED:
        order.delivered_at = order.delivered_at or now
    db.commit()
    logger.warning("Админ %s форсированно сменил статус заказа %s с %s на %s", user.id, order.id, old_status, status)
    return {"ok": True, "status": order.status}


@router.get("/orders/{order_id}", response_model=AdminOrderDetailOut)
def get_order_detail(
    order_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    seller = db.query(SellerProfile).filter(SellerProfile.id == order.seller_id).first()
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")

    return {
        **OrderOut.model_validate(order).model_dump(),
        "buyer": {
            "id": order.buyer.id,
            "full_name": order.buyer.full_name,
            "email": order.buyer.email,
        },
        "seller": {
            "id": seller.id,
            "user_id": seller.user_id,
            "shop_name": seller.shop_name,
            "is_verified": seller.is_verified,
        },
    }

@router.get("/sellers", response_model=list[SellerOut])
def list_all_sellers(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(SellerProfile).order_by(SellerProfile.id.desc()).all()

@router.post("/sellers/{seller_id}/moderate")
def moderate_seller(
    seller_id: int, 
    data: ModerationAction, 
    db: Session = Depends(get_db), 
    user: User = Depends(require_admin)
):
    from app.core.logger import logger
    seller = db.query(SellerProfile).filter(SellerProfile.id == seller_id).first()
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")

    if not data.approve and not data.reason:
        raise HTTPException(status_code=400, detail="Reason is required for rejection")
    seller.is_verified = data.approve
    seller.rejection_reason = None if data.approve else data.reason
    db.commit()
    logger.info("Админ %s %s магазин %s", user.id, "верифицировал" if data.approve else "отклонил", seller.id)
    return {"ok": True, "is_verified": seller.is_verified}


@router.get("/sellers/{seller_id}/analytics", response_model=SellerAnalyticsOut)
def get_seller_analytics(
    seller_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    seller = db.query(SellerProfile).filter(SellerProfile.id == seller_id).first()
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    return build_seller_analytics(db, seller)


@router.get("/users/{user_id}/analytics", response_model=UserAnalyticsOut)
def get_user_analytics(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return build_user_analytics(db, user)

@router.get("/tickets", response_model=list[SupportTicketOut])
def list_all_tickets(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    tickets = db.query(SupportTicket).order_by(
        case((SupportTicket.status == 'open', 0), else_=1),
        SupportTicket.id.asc()
    ).all()
    return sorted(
        tickets,
        key=lambda ticket: (
            0 if ticket.status == "open" else 1,
            ticket.messages[-1].created_at if ticket.messages else ticket.created_at,
        ),
    )

@router.post("/tickets/{ticket_id}/reply")
def reply_ticket(
    ticket_id: int, 
    data: SupportMessageCreate, 
    db: Session = Depends(get_db), 
    admin: User = Depends(require_admin)
):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    msg = SupportMessage(ticket_id=ticket.id, author_id=admin.id, body=data.body)
    db.add(msg)
    ticket.status = "answered"
    db.commit()
    return {"ok": True}

@router.post("/tickets/{ticket_id}/close")
def admin_close_ticket(ticket_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.status = "closed"
    db.commit()
    return {"ok": True}
