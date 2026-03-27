from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PromoOwnerType(str, PyEnum):
    MARKETPLACE = "marketplace"
    SHOP = "shop"


class PromoDiscountType(str, PyEnum):
    PERCENT = "percent"
    FIXED = "fixed"


class PromoCode(Base):
    __tablename__ = "promo_codes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    owner_type: Mapped[PromoOwnerType] = mapped_column(Enum(PromoOwnerType))
    seller_id: Mapped[int | None] = mapped_column(ForeignKey("seller_profiles.id"))
    title: Mapped[str] = mapped_column(String(255), default="")
    discount_type: Mapped[PromoDiscountType] = mapped_column(Enum(PromoDiscountType))
    discount_value: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    min_order_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    max_uses: Mapped[int | None] = mapped_column(Integer)
    uses_count: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    valid_from: Mapped[datetime | None] = mapped_column(DateTime)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime)
    applies_to_all_products: Mapped[bool] = mapped_column(Boolean, default=True)
    product_ids: Mapped[str | None] = mapped_column(Text)
    category_ids: Mapped[str | None] = mapped_column(Text)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    usages: Mapped[list["PromoCodeUsage"]] = relationship(back_populates="promo")


class PromoCodeUsage(Base):
    __tablename__ = "promo_code_usages"
    __table_args__ = (UniqueConstraint("promo_id", "user_id", "order_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    promo_id: Mapped[int] = mapped_column(ForeignKey("promo_codes.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    promo: Mapped["PromoCode"] = relationship(back_populates="usages")


class BonusWallet(Base):
    __tablename__ = "bonus_wallets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    transactions: Mapped[list["BonusTransaction"]] = relationship(back_populates="wallet")


class BonusTransactionType(str, PyEnum):
    EARN = "earn"
    SPEND = "spend"
    ADJUST = "adjust"


class BonusTransaction(Base):
    __tablename__ = "bonus_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    wallet_id: Mapped[int] = mapped_column(ForeignKey("bonus_wallets.id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    tx_type: Mapped[BonusTransactionType] = mapped_column(Enum(BonusTransactionType))
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id"))
    description: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    wallet: Mapped["BonusWallet"] = relationship(back_populates="transactions")
