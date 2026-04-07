import os
import sys

import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///./pytest_db.sqlite"
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
import seed  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    db_path = "pytest_db.sqlite"
    if os.path.exists(db_path):
        os.remove(db_path)
    Base.metadata.create_all(bind=engine)
    seed.run()
    yield
    if os.path.exists(db_path):
        os.remove(db_path)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def buyer_token(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "buyer@mayss.io", "password": "buyer123"},
    )
    return response.json()["access_token"]


@pytest.fixture
def buyer_headers(buyer_token):
    return {"Authorization": f"Bearer {buyer_token}"}


@pytest.fixture
def admin_token(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@mayss.io", "password": "admin123"},
    )
    return response.json()["access_token"]


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}
