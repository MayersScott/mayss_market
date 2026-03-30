"""Schemas for promos and bonuses."""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.promotions import PromoDiscountType, PromoOwnerType


class PromoCodeCreate(BaseModel):
    code: str = Field(min_length=2, max_length=64)
    owner_type: PromoOwnerType
    seller_id: int | None = None
    title: str = ""
    discount_type: PromoDiscountType
    discount_value: Decimal = Field(gt=0)
    min_order_amount: Decimal | None = None
    max_uses: int | None = Field(default=None, ge=1)
    is_active: bool = True
    valid_from: datetime | None = None
    valid_until: datetime | None = None
    applies_to_all_products: bool = True
    product_ids: list[int] = Field(default_factory=list)
    category_ids: list[int] = Field(default_factory=list)


class PromoCodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    owner_type: PromoOwnerType
    seller_id: int | None
    title: str
    discount_type: PromoDiscountType
    discount_value: Decimal
    min_order_amount: Decimal | None
    max_uses: int | None
    uses_count: int
    is_active: bool
    valid_from: datetime | None
    valid_until: datetime | None
    applies_to_all_products: bool
    product_ids: list[int]
    category_ids: list[int]
    created_at: datetime


class PromoPreviewIn(BaseModel):
    code: str = Field(min_length=2, max_length=64)


class PromoPreviewOut(BaseModel):
    code: str
    discount: Decimal
    per_seller: dict[str, str]
    owner_type: str
    title: str


class BonusBalanceOut(BaseModel):
    balance: Decimal


class BonusTransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    amount: Decimal
    tx_type: str
    order_id: int | None
    description: str
    created_at: datetime
