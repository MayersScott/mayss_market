from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy import and_, desc, func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logger import logger
from app.models.promotions import BonusTransaction, BonusTransactionType, BonusWallet


BONUS_EARN_PERCENT = Decimal("3")
BONUS_MAX_SPEND_PERCENT = Decimal("50")
BONUS_MIN_WALLET_BALANCE = Decimal("0.01")


def get_or_create_wallet(db: Session, user_id: int) -> BonusWallet:
    wallet = db.query(BonusWallet).filter(BonusWallet.user_id == user_id).first()
    if not wallet:
        wallet = BonusWallet(user_id=user_id, balance=Decimal("0"))
        db.add(wallet)
        db.flush()
        logger.info(f"Created new bonus wallet for user {user_id}")
    return wallet


def get_balance(db: Session, user_id: int) -> Decimal:
    wallet = get_or_create_wallet(db, user_id)
    return wallet.balance


def earn_for_delivered_order(
    db: Session,
    user_id: int,
    order_id: int,
    order_total: Decimal,
    earn_percent: Optional[Decimal] = None,
) -> Decimal:
    percent = earn_percent or BONUS_EARN_PERCENT
    amount = (order_total * percent / Decimal("100")).quantize(Decimal("0.01"))
    
    if amount < BONUS_MIN_WALLET_BALANCE:
        logger.debug(f"Order {order_id}: earned amount {amount} is too small, skipping")
        return Decimal("0")
    
    wallet = get_or_create_wallet(db, user_id)
    wallet.balance += amount
    
    transaction = BonusTransaction(
        wallet_id=wallet.id,
        amount=amount,
        tx_type=BonusTransactionType.EARN,
        order_id=order_id,
        description=f"Кэшбэк {percent}% за заказ #{order_id}",
    )
    db.add(transaction)
    
    logger.info(f"Earned {amount} bonuses for user {user_id}, order {order_id}")
    return amount


def spend_on_order(
    db: Session,
    user_id: int,
    order_id: int,
    amount: Decimal,
    order_subtotal: Decimal,
) -> Decimal:
    if amount <= Decimal("0"):
        return Decimal("0")
    
    max_spend = (order_subtotal * BONUS_MAX_SPEND_PERCENT / Decimal("100")).quantize(Decimal("0.01"))
    spend = min(amount, max_spend)
    
    wallet = get_or_create_wallet(db, user_id)
    
    if wallet.balance < spend:
        logger.warning(f"User {user_id} insufficient bonuses: has {wallet.balance}, needs {spend}")
        raise ValueError(f"Недостаточно бонусов на счёте. Доступно: {wallet.balance}, требуется: {spend}")
    
    wallet.balance -= spend
    
    transaction = BonusTransaction(
        wallet_id=wallet.id,
        amount=spend,
        tx_type=BonusTransactionType.SPEND,
        order_id=order_id,
        description=f"Списание бонусов за заказ #{order_id}",
    )
    db.add(transaction)
    
    logger.info(f"Spent {spend} bonuses for user {user_id}, order {order_id}")
    return spend


def adjust_balance(
    db: Session,
    user_id: int,
    amount: Decimal,
    description: str,
    order_id: Optional[int] = None,
) -> Decimal:
    wallet = get_or_create_wallet(db, user_id)
    wallet.balance += amount
    
    if wallet.balance < Decimal("0"):
        wallet.balance = Decimal("0")
        logger.warning(f"User {user_id} bonus balance adjusted below 0, clamped to 0")
    
    transaction = BonusTransaction(
        wallet_id=wallet.id,
        amount=amount,
        tx_type=BonusTransactionType.ADJUST,
        order_id=order_id,
        description=description,
    )
    db.add(transaction)
    
    logger.info(f"Adjusted {amount} bonuses for user {user_id}: {description}")
    return wallet.balance


def get_transactions(
    db: Session,
    user_id: int,
    limit: int = 50,
    offset: int = 0,
    tx_type: Optional[str] = None,
) -> tuple[list[BonusTransaction], int]:
    wallet = get_or_create_wallet(db, user_id)
    
    query = db.query(BonusTransaction).filter(BonusTransaction.wallet_id == wallet.id)
    
    if tx_type:
        query = query.filter(BonusTransaction.tx_type == tx_type)
    
    total = query.count()
    transactions = query.order_by(desc(BonusTransaction.created_at)).limit(limit).offset(offset).all()
    
    return transactions, total


def get_wallet_stats(db: Session, user_id: int) -> dict:
    wallet = get_or_create_wallet(db, user_id)
    
    earned = db.query(func.coalesce(func.sum(BonusTransaction.amount), Decimal("0"))).filter(
        and_(
            BonusTransaction.wallet_id == wallet.id,
            BonusTransaction.tx_type == BonusTransactionType.EARN,
        )
    ).scalar()
    
    spent = db.query(func.coalesce(func.sum(BonusTransaction.amount), Decimal("0"))).filter(
        and_(
            BonusTransaction.wallet_id == wallet.id,
            BonusTransaction.tx_type == BonusTransactionType.SPEND,
        )
    ).scalar()
    
    return {
        "balance": wallet.balance,
        "earned": earned,
        "spent": spent,
        "updated_at": wallet.updated_at,
    }
