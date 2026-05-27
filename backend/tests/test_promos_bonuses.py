import pytest


def _clear_cart(client, headers):
    cart = client.get("/api/v1/cart", headers=headers).json()
    for item in cart["items"]:
        client.delete(f"/api/v1/cart/items/{item['product_id']}", headers=headers)


def test_bonus_balance_starts_zero(client, buyer_headers):
    r = client.get("/api/v1/bonuses/balance", headers=buyer_headers)
    assert r.status_code == 200
    assert float(r.json()["balance"]) == 0


def test_promo_preview_mayss7(client, buyer_headers):
    _clear_cart(client, buyer_headers)
    client.post("/api/v1/cart/items", json={"product_id": 1, "quantity": 1}, headers=buyer_headers)
    r = client.post("/api/v1/promos/preview", json={"code": "MAYSS7"}, headers=buyer_headers)
    assert r.status_code == 200
    assert float(r.json()["discount"]) > 0


def test_promo_preview_invalid(client, buyer_headers):
    _clear_cart(client, buyer_headers)
    client.post("/api/v1/cart/items", json={"product_id": 1, "quantity": 1}, headers=buyer_headers)
    r = client.post("/api/v1/promos/preview", json={"code": "NOPE"}, headers=buyer_headers)
    assert r.status_code == 400


def test_order_with_promo_reduces_total(client, buyer_headers):
    _clear_cart(client, buyer_headers)
    client.post("/api/v1/cart/items", json={"product_id": 3, "quantity": 1}, headers=buyer_headers)
    cart_total = float(client.get("/api/v1/cart", headers=buyer_headers).json()["total"])
    orders = client.post(
        "/api/v1/orders",
        json={"address": "Promo test", "promo_code": "MAYSS7"},
        headers=buyer_headers,
    ).json()
    assert len(orders) == 1
    assert float(orders[0]["promo_discount"]) > 0
    assert float(orders[0]["total"]) < cart_total


def test_admin_lists_promos(client, admin_headers):
    r = client.get("/api/v1/admin/promos", headers=admin_headers)
    assert r.status_code == 200
    assert "MAYSS7" in {p["code"] for p in r.json()}


def test_admin_creates_marketplace_promo(client, admin_headers):
    r = client.post(
        "/api/v1/admin/promos",
        json={
            "code": "ADMIN15",
            "owner_type": "marketplace",
            "title": "Admin promo",
            "discount_type": "percent",
            "discount_value": 15,
            "applies_to_all_products": True,
        },
        headers=admin_headers,
    )
    assert r.status_code == 200


def test_seller_promo_requires_verification(client):
    email = "unverified-promo@mayss.io"
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "seller123", "full_name": "UV"},
    )
    token = client.post(
        "/api/v1/auth/login", json={"email": email, "password": "seller123"}
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    client.post(
        "/api/v1/seller/profile",
        json={"shop_name": "UV Shop", "description": "x"},
        headers=headers,
    )
    r = client.post(
        "/api/v1/seller/promos",
        json={
            "code": "FAILSHOP",
            "owner_type": "shop",
            "title": "x",
            "discount_type": "fixed",
            "discount_value": 100,
        },
        headers=headers,
    )
    assert r.status_code == 403


def test_verified_seller_creates_shop_promo(client, admin_headers):
    seller_token = client.post(
        "/api/v1/auth/login",
        json={"email": "seller2@mayss.io", "password": "seller123"},
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {seller_token}"}
    r = client.post(
        "/api/v1/seller/promos",
        json={
            "code": "SHOPNEW5",
            "owner_type": "shop",
            "title": "Shop 5%",
            "discount_type": "percent",
            "discount_value": 5,
            "applies_to_all_products": True,
        },
        headers=headers,
    )
    assert r.status_code == 200


def test_payment_sets_assembling(client, buyer_headers):
    _clear_cart(client, buyer_headers)
    client.post("/api/v1/cart/items", json={"product_id": 4, "quantity": 1}, headers=buyer_headers)
    order_id = client.post(
        "/api/v1/orders", json={"address": "Asm"}, headers=buyer_headers
    ).json()[0]["id"]
    pay = client.post(
        "/api/v1/payments",
        json={"order_id": order_id, "method": "card", "idempotency_key": f"asm-test-key-{order_id:08d}"},
        headers=buyer_headers,
    )
    assert pay.status_code == 200, pay.text
    order = client.get(f"/api/v1/orders/{order_id}", headers=buyer_headers).json()
    assert order["status"] == "assembling"


def test_unverified_seller_cannot_create_product(client):
    email = "no-prod@mayss.io"
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "seller123", "full_name": "NP"},
    )
    token = client.post(
        "/api/v1/auth/login", json={"email": email, "password": "seller123"}
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    client.post(
        "/api/v1/seller/profile",
        json={"shop_name": "NP Shop", "description": "x"},
        headers=headers,
    )
    r = client.post(
        "/api/v1/seller/products",
        json={"title": "Blocked", "category_id": 1, "price": 100, "stock": 1},
        headers=headers,
    )
    assert r.status_code == 403


def test_telegram_webhook_start_invalid_token(client):
    r = client.post(
        "/api/v1/notifications/telegram/webhook",
        json={"message": {"chat": {"id": 1}, "text": "/start bad-token"}},
    )
    assert r.status_code == 200


def test_push_key_without_vapid_returns_503(client):
    assert client.get("/api/v1/notifications/push/public-key").status_code == 503


def test_bonus_transactions_empty(client, buyer_headers):
    r = client.get("/api/v1/bonuses/transactions", headers=buyer_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
