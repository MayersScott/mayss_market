from __future__ import annotations

from collections import Counter
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import (
    Category,
    Favorite,
    Order,
    OrderItem,
    OrderStatus,
    Product,
    ProductStatus,
    SellerProfile,
    User,
)
from app.schemas import AnalyticsTopItem, SellerAnalyticsOut, UserAnalyticsOut


def _decimal(value: Decimal | int | float | None) -> Decimal:
    if value is None:
        return Decimal("0")
    return Decimal(value)


def _average_order_value(total: Decimal, count: int) -> Decimal:
    if count <= 0:
        return Decimal("0")
    return (total / Decimal(count)).quantize(Decimal("0.01"))


def _delivery_hours(orders: list[Order]) -> float | None:
    intervals: list[float] = []
    for order in orders:
        if order.shipped_at and order.delivered_at and order.delivered_at >= order.shipped_at:
            delta = order.delivered_at - order.shipped_at
            intervals.append(delta.total_seconds() / 3600)
    if not intervals:
        return None
    return round(sum(intervals) / len(intervals), 2)


def build_seller_analytics(db: Session, seller: SellerProfile) -> SellerAnalyticsOut:
    orders = (
        db.query(Order)
        .filter(Order.seller_id == seller.id)
        .order_by(Order.id.desc())
        .all()
    )
    paid_like = [
        order
        for order in orders
        if order.status not in (OrderStatus.CREATED, OrderStatus.CANCELLED)
    ]
    delivered = [order for order in orders if order.status == OrderStatus.DELIVERED]
    turnover = sum((order.total for order in paid_like), start=Decimal("0"))
    fee_rate = Decimal(str(settings.PLATFORM_FEE_PERCENT)) / Decimal("100")
    platform_fee = (turnover * fee_rate).quantize(Decimal("0.01"))
    revenue = (turnover - platform_fee).quantize(Decimal("0.01"))

    top_products_rows = (
        db.query(OrderItem.title, func.sum(OrderItem.quantity))
        .join(Order, Order.id == OrderItem.order_id)
        .filter(
            Order.seller_id == seller.id,
            Order.status != OrderStatus.CANCELLED,
        )
        .group_by(OrderItem.title)
        .order_by(func.sum(OrderItem.quantity).desc(), OrderItem.title.asc())
        .limit(5)
        .all()
    )
    top_categories_rows = (
        db.query(Category.name, func.sum(OrderItem.quantity))
        .join(Product, Product.category_id == Category.id)
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(
            Order.seller_id == seller.id,
            Order.status != OrderStatus.CANCELLED,
        )
        .group_by(Category.name)
        .order_by(func.sum(OrderItem.quantity).desc(), Category.name.asc())
        .limit(5)
        .all()
    )
    return SellerAnalyticsOut(
        seller_id=seller.id,
        shop_name=seller.shop_name,
        orders_total=len(orders),
        delivered_orders_total=len(delivered),
        turnover=turnover,
        revenue=revenue,
        platform_fee=platform_fee,
        average_order_value=_average_order_value(turnover, len(paid_like)),
        avg_delivery_hours=_delivery_hours(delivered),
        top_products=[
            AnalyticsTopItem(label=label, value=_decimal(value))
            for label, value in top_products_rows
        ],
        top_categories=[
            AnalyticsTopItem(label=label, value=_decimal(value))
            for label, value in top_categories_rows
        ],
    )


def build_user_analytics(db: Session, user: User) -> UserAnalyticsOut:
    orders = (
        db.query(Order)
        .filter(Order.buyer_id == user.id)
        .order_by(Order.id.desc())
        .all()
    )
    paid_like = [
        order
        for order in orders
        if order.status not in (OrderStatus.CREATED, OrderStatus.CANCELLED)
    ]
    delivered = [order for order in orders if order.status == OrderStatus.DELIVERED]
    spent_total = sum((order.total for order in paid_like), start=Decimal("0"))

    category_rows = (
        db.query(Category.name, func.sum(OrderItem.quantity))
        .join(Product, Product.category_id == Category.id)
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(
            Order.buyer_id == user.id,
            Order.status != OrderStatus.CANCELLED,
        )
        .group_by(Category.name)
        .order_by(func.sum(OrderItem.quantity).desc(), Category.name.asc())
        .limit(5)
        .all()
    )
    shop_rows = (
        db.query(SellerProfile.shop_name, func.count(Order.id))
        .join(Order, Order.seller_id == SellerProfile.id)
        .filter(
            Order.buyer_id == user.id,
            Order.status != OrderStatus.CANCELLED,
        )
        .group_by(SellerProfile.shop_name)
        .order_by(func.count(Order.id).desc(), SellerProfile.shop_name.asc())
        .limit(5)
        .all()
    )
    return UserAnalyticsOut(
        user_id=user.id,
        full_name=user.full_name,
        orders_total=len(orders),
        delivered_orders_total=len(delivered),
        spent_total=spent_total,
        average_order_value=_average_order_value(spent_total, len(paid_like)),
        favorite_categories=[
            AnalyticsTopItem(label=label, value=_decimal(value))
            for label, value in category_rows
        ],
        favorite_shops=[
            AnalyticsTopItem(label=label, value=_decimal(value))
            for label, value in shop_rows
        ],
    )


def recommend_products(db: Session, user: User | None, limit: int = 8) -> list[Product]:
    query = db.query(Product).filter(Product.status == ProductStatus.ACTIVE)
    products = query.order_by(Product.rating.desc(), Product.id.desc()).all()
    if user is None:
        return products[:limit]

    purchased_categories = Counter(
        category_id
        for (category_id,) in (
            db.query(Product.category_id)
            .join(OrderItem, OrderItem.product_id == Product.id)
            .join(Order, Order.id == OrderItem.order_id)
            .filter(Order.buyer_id == user.id, Order.status != OrderStatus.CANCELLED)
            .all()
        )
    )
    favorite_categories = Counter(
        category_id
        for (category_id,) in (
            db.query(Product.category_id)
            .join(Favorite, Favorite.product_id == Product.id)
            .filter(Favorite.user_id == user.id)
            .all()
        )
    )
    weights = purchased_categories + favorite_categories
    if not weights:
        return products[:limit]

    ranked = sorted(
        products,
        key=lambda product: (
            weights.get(product.category_id, 0),
            float(product.rating),
            product.id,
        ),
        reverse=True,
    )
    return ranked[:limit]
