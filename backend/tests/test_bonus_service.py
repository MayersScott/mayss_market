import pytest
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.core.database import Base
from app.models.promotions import BonusWallet, BonusTransaction, BonusTransactionType
from app.services.bonus_service import (
    get_or_create_wallet,
    get_balance,
    earn_for_delivered_order,
    spend_on_order,
    adjust_balance,
    get_transactions,
    get_wallet_stats,
)


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


@pytest.fixture
def sample_user_id():
    return 1


class TestBonusWallet:
    def test_get_or_create_wallet_new(self, db_session: Session, sample_user_id: int):
        wallet = get_or_create_wallet(db_session, sample_user_id)
        
        assert wallet is not None
        assert wallet.user_id == sample_user_id
        assert wallet.balance == Decimal("0")

    def test_get_or_create_wallet_existing(self, db_session: Session, sample_user_id: int):
        wallet1 = get_or_create_wallet(db_session, sample_user_id)
        wallet1.balance = Decimal("100")
        db_session.commit()
        
        wallet2 = get_or_create_wallet(db_session, sample_user_id)
        
        assert wallet1.id == wallet2.id
        assert wallet2.balance == Decimal("100")

    def test_get_balance(self, db_session: Session, sample_user_id: int):
        wallet = get_or_create_wallet(db_session, sample_user_id)
        wallet.balance = Decimal("250.50")
        db_session.commit()
        
        balance = get_balance(db_session, sample_user_id)
        
        assert balance == Decimal("250.50")


class TestBonusEarning:

    def test_earn_for_delivered_order(self, db_session: Session, sample_user_id: int):
        order_id = 42
        order_total = Decimal("1000.00")
        
        earned = earn_for_delivered_order(
            db_session, sample_user_id, order_id, order_total
        )
        db_session.commit()
        
        assert earned == Decimal("30.00")
        assert get_balance(db_session, sample_user_id) == Decimal("30.00")

    def test_earn_with_custom_percent(self, db_session: Session, sample_user_id: int):
        earned = earn_for_delivered_order(
            db_session,
            sample_user_id,
            order_id=42,
            order_total=Decimal("1000.00"),
            earn_percent=Decimal("5"),
        )
        
        assert earned == Decimal("50.00")

    def test_earn_creates_transaction(self, db_session: Session, sample_user_id: int):
        earn_for_delivered_order(
            db_session, sample_user_id, 42, Decimal("1000.00")
        )
        db_session.commit()
        
        transactions = db_session.query(BonusTransaction).all()
        
        assert len(transactions) == 1
        assert transactions[0].tx_type == BonusTransactionType.EARN
        assert transactions[0].order_id == 42

    def test_earn_small_amount_skipped(self, db_session: Session, sample_user_id: int):
        earned = earn_for_delivered_order(
            db_session, sample_user_id, 42, Decimal("0.10")
        )
        
        assert earned == Decimal("0")
        assert get_balance(db_session, sample_user_id) == Decimal("0")


class TestBonusSpending:

    def test_spend_on_order(self, db_session: Session, sample_user_id: int):
        wallet = get_or_create_wallet(db_session, sample_user_id)
        wallet.balance = Decimal("100.00")
        db_session.commit()
        
        spent = spend_on_order(
            db_session,
            sample_user_id,
            order_id=42,
            amount=Decimal("50.00"),
            order_subtotal=Decimal("1000.00"),
        )
        db_session.commit()
        
        assert spent == Decimal("50.00")
        assert get_balance(db_session, sample_user_id) == Decimal("50.00")

    def test_spend_capped_at_50_percent(self, db_session: Session, sample_user_id: int):
        wallet = get_or_create_wallet(db_session, sample_user_id)
        wallet.balance = Decimal("10000.00")
        db_session.commit()
        
        spent = spend_on_order(
            db_session,
            sample_user_id,
            order_id=42,
            amount=Decimal("1000.00"),
            order_subtotal=Decimal("1000.00"),
        )
        
        assert spent == Decimal("500.00")

    def test_spend_insufficient_balance(self, db_session: Session, sample_user_id: int):
        wallet = get_or_create_wallet(db_session, sample_user_id)
        wallet.balance = Decimal("10.00")
        db_session.commit()
        
        with pytest.raises(ValueError, match="Недостаточно бонусов"):
            spend_on_order(
                db_session,
                sample_user_id,
                order_id=42,
                amount=Decimal("50.00"),
                order_subtotal=Decimal("1000.00"),
            )

    def test_spend_zero_amount(self, db_session: Session, sample_user_id: int):
        spent = spend_on_order(
            db_session,
            sample_user_id,
            order_id=42,
            amount=Decimal("0"),
            order_subtotal=Decimal("1000.00"),
        )
        
        assert spent == Decimal("0")

    def test_spend_creates_transaction(self, db_session: Session, sample_user_id: int):
        wallet = get_or_create_wallet(db_session, sample_user_id)
        wallet.balance = Decimal("100.00")
        db_session.commit()
        
        spend_on_order(
            db_session, sample_user_id, 42, Decimal("50.00"), Decimal("1000.00")
        )
        db_session.commit()
        
        transactions = db_session.query(BonusTransaction).all()
        
        assert len(transactions) == 1
        assert transactions[0].tx_type == BonusTransactionType.SPEND


class TestBonusAdjustment:
    def test_adjust_positive(self, db_session: Session, sample_user_id: int):
        new_balance = adjust_balance(
            db_session,
            sample_user_id,
            Decimal("100.00"),
            "Initial bonus",
        )
        db_session.commit()
        
        assert new_balance == Decimal("100.00")
        assert get_balance(db_session, sample_user_id) == Decimal("100.00")

    def test_adjust_negative(self, db_session: Session, sample_user_id: int):
        wallet = get_or_create_wallet(db_session, sample_user_id)
        wallet.balance = Decimal("100.00")
        db_session.commit()
        
        new_balance = adjust_balance(
            db_session,
            sample_user_id,
            Decimal("-50.00"),
            "Penalty",
        )
        
        assert new_balance == Decimal("50.00")

    def test_adjust_clamps_to_zero(self, db_session: Session, sample_user_id: int):
        adjust_balance(
            db_session,
            sample_user_id,
            Decimal("-100.00"),
            "Overpayment correction",
        )
        db_session.commit()
        
        balance = get_balance(db_session, sample_user_id)
        assert balance == Decimal("0")


class TestBonusTransactions:

    def test_get_transactions(self, db_session: Session, sample_user_id: int):
        earn_for_delivered_order(db_session, sample_user_id, 1, Decimal("1000"))
        earn_for_delivered_order(db_session, sample_user_id, 2, Decimal("500"))
        db_session.commit()
        
        transactions, total = get_transactions(db_session, sample_user_id)
        
        assert total == 2
        assert len(transactions) == 2

    def test_get_transactions_with_type_filter(self, db_session: Session, sample_user_id: int):
        earn_for_delivered_order(db_session, sample_user_id, 1, Decimal("1000"))
        
        wallet = get_or_create_wallet(db_session, sample_user_id)
        wallet.balance = Decimal("100")
        spend_on_order(db_session, sample_user_id, 2, Decimal("50"), Decimal("1000"))
        db_session.commit()
        
        earn_txs, earn_count = get_transactions(db_session, sample_user_id, tx_type="earn")
        spend_txs, spend_count = get_transactions(db_session, sample_user_id, tx_type="spend")
        
        assert earn_count == 1
        assert spend_count == 1

    def test_get_transactions_pagination(self, db_session: Session, sample_user_id: int):
        for i in range(100):
            earn_for_delivered_order(db_session, sample_user_id, i, Decimal("100"))
        db_session.commit()
        
        page1, total = get_transactions(db_session, sample_user_id, limit=50, offset=0)
        page2, _ = get_transactions(db_session, sample_user_id, limit=50, offset=50)
        
        assert total == 100
        assert len(page1) == 50
        assert len(page2) == 50
        assert page1[0].id != page2[0].id


class TestBonusStats:

    def test_get_wallet_stats(self, db_session: Session, sample_user_id: int):
        earn_for_delivered_order(db_session, sample_user_id, 1, Decimal("1000"))
        
        wallet = get_or_create_wallet(db_session, sample_user_id)
        wallet.balance = Decimal("30")
        spend_on_order(db_session, sample_user_id, 2, Decimal("10"), Decimal("1000"))
        db_session.commit()
        
        stats = get_wallet_stats(db_session, sample_user_id)
        
        assert stats["balance"] == Decimal("20.00")
        assert stats["earned"] == Decimal("30.00")
        assert stats["spent"] == Decimal("10.00")
        assert "updated_at" in stats
