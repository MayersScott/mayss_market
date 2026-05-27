from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum

from pydantic import BaseModel, Field


class BonusTransactionTypeEnum(str, PyEnum):
    EARN = "earn"
    SPEND = "spend"
    ADJUST = "adjust"


class BonusTransactionResponse(BaseModel):
    id: int
    amount: Decimal = Field(..., decimal_places=2)
    tx_type: BonusTransactionTypeEnum
    order_id: int | None = None
    description: str
    created_at: datetime

    class Config:
        from_attributes = True


class BonusWalletResponse(BaseModel):
    balance: Decimal = Field(..., decimal_places=2)
    updated_at: datetime
    max_spend_percent: Decimal = Field(default=Decimal("50"), decimal_places=2)
    earn_percent: Decimal = Field(default=Decimal("3"), decimal_places=2)

    class Config:
        from_attributes = True


class BonusWalletStatsResponse(BaseModel):
    balance: Decimal = Field(..., decimal_places=2)
    earned: Decimal = Field(..., decimal_places=2)
    spent: Decimal = Field(..., decimal_places=2)
    updated_at: datetime


class BonusTransactionsListResponse(BaseModel):
    items: list[BonusTransactionResponse]
    total: int
    limit: int
    offset: int


class SpendBonusesRequest(BaseModel):
    amount: Decimal = Field(..., gt=0, decimal_places=2, description="Amount to spend")


class SpendBonusesResponse(BaseModel):
    spent: Decimal = Field(..., decimal_places=2)
    new_balance: Decimal = Field(..., decimal_places=2)
    order_id: int


class AdjustBonusesRequest(BaseModel):
    amount: Decimal = Field(..., decimal_places=2, description="Amount to adjust (+ or -)")
    description: str = Field(..., min_length=10, max_length=500)
    user_id: int = Field(..., gt=0)
