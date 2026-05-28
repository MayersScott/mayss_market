import pytest
from decimal import Decimal
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import Base, engine, SessionLocal, get_db
from app.models import User, UserRole
from app.models.promotions import BonusWallet
from app.core.security import create_access_token


@pytest.fixture
def db_session():
    """Create test database session."""
    Base.metadata.create_all(bind=engine)
    connection = engine.connect()
    transaction = connection.begin()
    db = SessionLocal(bind=connection)
    yield db
    db.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def test_user(db_session):
    """Create test user."""
    user = User(
        email="test@example.com",
        password_hash="hashedpassword",
        full_name="Test User",
        is_active=True,
        role=UserRole.BUYER,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_user(db_session):
    """Create admin user."""
    user = User(
        email="admin@example.com",
        password_hash="hashedpassword",
        full_name="Admin User",
        is_active=True,
        role=UserRole.ADMIN,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_token(test_user):
    """Create JWT token for test user."""
    return create_access_token(subject=str(test_user.id))


@pytest.fixture
def admin_token(admin_user):
    """Create JWT token for admin user."""
    return create_access_token(subject=str(admin_user.id))


@pytest.fixture
def client(db_session):
    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_db, None)


class TestBonusBalanceEndpoint:
    """Tests for GET /bonuses/balance."""

    def test_get_balance_unauthorized(self, client: TestClient):
        """Test accessing balance without authentication."""
        response = client.get("/api/v1/bonuses/balance")
        
        assert response.status_code == 401

    def test_get_balance_authorized(self, client: TestClient, test_token: str, test_user: User, db_session):
        wallet = BonusWallet(user_id=test_user.id, balance=Decimal("100.50"))
        db_session.add(wallet)
        db_session.commit()
        
        response = client.get(
            "/api/v1/bonuses/balance",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["balance"] == "100.50"


class TestBonusStatsEndpoint:
    """Tests for GET /bonuses/stats."""

    def test_get_stats(self, client: TestClient, test_token: str):
        """Test getting wallet statistics."""
        response = client.get(
            "/api/v1/bonuses/stats",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "balance" in data
        assert "earned" in data
        assert "spent" in data
        assert "updated_at" in data
        
        assert float(data["balance"]) == 0
        assert float(data["earned"]) == 0
        assert float(data["spent"]) == 0


class TestBonusTransactionsEndpoint:
    """Tests for GET /bonuses/transactions."""

    def test_get_transactions_empty(self, client: TestClient, test_token: str):
        """Test getting empty transaction list."""
        response = client.get(
            "/api/v1/bonuses/transactions",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["items"] == []
        assert data["total"] == 0
        assert data["limit"] == 50
        assert data["offset"] == 0

    def test_get_transactions_pagination(self, client: TestClient, test_token: str):
        """Test transaction pagination parameters."""
        response = client.get(
            "/api/v1/bonuses/transactions?limit=10&offset=5",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["limit"] == 10
        assert data["offset"] == 5

    def test_get_transactions_invalid_limit(self, client: TestClient, test_token: str):
        """Test that limit > 100 is rejected."""
        response = client.get(
            "/api/v1/bonuses/transactions?limit=200",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        
        assert response.status_code == 422

    def test_get_transactions_filter_by_type(self, client: TestClient, test_token: str):
        """Test filtering transactions by type."""
        response = client.get(
            "/api/v1/bonuses/transactions?tx_type=earn",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        
        assert response.status_code == 200
        data = response.json()
        
        for item in data["items"]:
            assert item["tx_type"] == "earn"


class TestBonusAdjustAdminEndpoint:
    """Tests for POST /bonuses/admin/adjust."""

    def test_adjust_unauthorized(self, client: TestClient, test_token: str):
        """Test that non-admin cannot adjust bonuses."""
        response = client.post(
            "/api/v1/bonuses/admin/adjust",
            json={
                "user_id": 1,
                "amount": 100.00,
                "description": "Test adjustment",
            },
            headers={"Authorization": f"Bearer {test_token}"},
        )
        
        assert response.status_code == 403

    def test_adjust_as_admin(self, client: TestClient, admin_token: str, test_user: User):
        """Test admin can adjust bonuses."""
        response = client.post(
            "/api/v1/bonuses/admin/adjust",
            json={
                "user_id": test_user.id,
                "amount": 100.00,
                "description": "Compensation for issue",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["user_id"] == test_user.id
        assert float(data["adjusted_amount"]) == 100.00
        assert float(data["new_balance"]) == 100.00

    def test_adjust_negative(self, client: TestClient, admin_token: str, test_user: User, db_session):
        wallet = BonusWallet(user_id=test_user.id, balance=Decimal("500"))
        db_session.add(wallet)
        db_session.commit()
        
        response = client.post(
            "/api/v1/bonuses/admin/adjust",
            json={
                "user_id": test_user.id,
                "amount": -100.00,
                "description": "Fraud penalty",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert float(data["new_balance"]) == 400.00

    def test_adjust_invalid_description(self, client: TestClient, admin_token: str, test_user: User):
        """Test that description must be at least 10 chars."""
        response = client.post(
            "/api/v1/bonuses/admin/adjust",
            json={
                "user_id": test_user.id,
                "amount": 100.00,
                "description": "short",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        
        assert response.status_code == 422
