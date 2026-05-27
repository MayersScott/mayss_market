from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin, get_current_user
from app.schemas.bonuses import (
    AdjustBonusesRequest,
    BonusTransactionsListResponse,
    BonusTransactionResponse,
    BonusWalletResponse,
    BonusWalletStatsResponse,
)
from app.services.bonus_service import (
    BONUS_EARN_PERCENT,
    BONUS_MAX_SPEND_PERCENT,
    adjust_balance,
    get_balance,
    get_transactions,
    get_wallet_stats,
)

router = APIRouter(prefix="/bonuses", tags=["bonuses"])


@router.get("/balance", response_model=BonusWalletResponse)
def get_user_balance(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's bonus balance."""
    from app.models.promotions import BonusWallet
    wallet = db.query(BonusWallet).filter(BonusWallet.user_id == current_user.id).first()
    if not wallet:
        get_balance(db, current_user.id)
        db.commit()
        wallet = db.query(BonusWallet).filter(BonusWallet.user_id == current_user.id).first()
    return BonusWalletResponse(
        balance=wallet.balance,
        updated_at=wallet.updated_at,
        max_spend_percent=BONUS_MAX_SPEND_PERCENT,
        earn_percent=BONUS_EARN_PERCENT,
    )


@router.get("/stats", response_model=BonusWalletStatsResponse)
def get_user_stats(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user's bonus wallet statistics."""
    stats = get_wallet_stats(db, current_user.id)
    return BonusWalletStatsResponse(**stats)


@router.get("/transactions", response_model=BonusTransactionsListResponse)
def get_user_transactions(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    tx_type: str | None = Query(None),
):
    """Get user's bonus transactions with pagination."""
    transactions, total = get_transactions(db, current_user.id, limit, offset, tx_type)
    return BonusTransactionsListResponse(
        items=[BonusTransactionResponse.from_orm(t) for t in transactions],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("/admin/adjust")
def admin_adjust_bonuses(
    request: AdjustBonusesRequest,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin endpoint to adjust user bonuses."""
    new_balance = adjust_balance(
        db,
        request.user_id,
        request.amount,
        request.description,
    )
    db.commit()
    
    return {
        "user_id": request.user_id,
        "adjusted_amount": request.amount,
        "new_balance": new_balance,
    }
