import pytest


def test_health(client):
    assert client.get("/health").status_code == 200


def test_categories_public(client):
    r = client.get("/api/v1/categories")
    assert r.status_code == 200
    assert len(r.json()) >= 8


def test_products_filter_by_price(client):
    r = client.get("/api/v1/products?max_price=5000")
    assert r.status_code == 200
    for p in r.json()["items"]:
        assert float(p["price"]) <= 5000


def test_login_wrong_password(client):
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "buyer@mayss.io", "password": "wrong"},
    )
    assert r.status_code == 401


def test_cart_requires_auth(client):
    assert client.get("/api/v1/cart").status_code == 401


def test_order_split_by_seller(client, buyer_headers):
    h = buyer_headers
    cart = client.get("/api/v1/cart", headers=h).json()
    for it in cart["items"]:
        client.delete(f"/api/v1/cart/items/{it['product_id']}", headers=h)
    client.post("/api/v1/cart/items", json={"product_id": 1, "quantity": 1}, headers=h)
    client.post("/api/v1/cart/items", json={"product_id": 2, "quantity": 1}, headers=h)
    r = client.post("/api/v1/orders", json={"address": "Test"}, headers=h)
    assert r.status_code == 200
    sellers = {o["seller_id"] for o in r.json()}
    assert len(sellers) == 2


def test_payment_idempotency(client, buyer_headers):
    h = buyer_headers
    client.post("/api/v1/cart/items", json={"product_id": 3, "quantity": 1}, headers=h)
    orders = client.post("/api/v1/orders", json={"address": "X"}, headers=h).json()
    if not orders:
        pytest.skip("cart was empty after split test")
    oid = orders[0]["id"]
    body = {"order_id": oid, "method": "card", "idempotency_key": "same-key-001"}
    r1 = client.post("/api/v1/payments", json=body, headers=h)
    r2 = client.post("/api/v1/payments", json=body, headers=h)
    assert r1.status_code == 200 and r2.status_code == 200
    assert r1.json()["id"] == r2.json()["id"]


def test_buyer_cannot_access_admin(client, buyer_headers):
    assert client.get("/api/v1/admin/stats", headers=buyer_headers).status_code == 403


def test_admin_can_access_admin(client, admin_headers):
    r = client.get("/api/v1/admin/stats", headers=admin_headers)
    assert r.status_code == 200
    assert "users_total" in r.json()


def test_review_requires_purchase(client, buyer_headers):
    r = client.post(
        "/api/v1/reviews",
        json={"product_id": 99, "rating": 5, "text": "x"},
        headers=buyer_headers,
    )
    assert r.status_code in (403, 404)


def test_pending_product_hidden_from_public_but_visible_to_owner(client, admin_headers):
    email = "pending-owner@mayss.io"
    password = "seller123"
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": "Pending Owner"},
    )
    token = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    profile = client.post(
        "/api/v1/seller/profile",
        json={"shop_name": "Pending Shop", "description": "wait"},
        headers=headers,
    ).json()
    client.post(
        f"/api/v1/admin/sellers/{profile['id']}/moderate",
        json={"approve": True},
        headers=admin_headers,
    )
    created = client.post(
        "/api/v1/seller/products",
        json={
            "title": "Черновой товар",
            "description": "secret",
            "brand": "Test",
            "category_id": 1,
            "price": 1000,
            "stock": 2,
        },
        headers=headers,
    )
    assert created.status_code == 200
    product_id = created.json()["id"]
    assert client.get(f"/api/v1/products/{product_id}").status_code == 404
    assert client.get(f"/api/v1/products/{product_id}", headers=headers).status_code == 200


def test_admin_can_reject_store_with_reason(client, admin_headers):
    email = "new-shop@mayss.io"
    password = "seller123"
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": "Shop Owner"},
    )
    token = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    ).json()["access_token"]
    seller_headers = {"Authorization": f"Bearer {token}"}
    profile = client.post(
        "/api/v1/seller/profile",
        json={"shop_name": "Need Review", "description": "desc"},
        headers=seller_headers,
    ).json()
    reject = client.post(
        f"/api/v1/admin/sellers/{profile['id']}/moderate",
        json={"approve": False, "reason": "Документы неполные"},
        headers=admin_headers,
    )
    assert reject.status_code == 200
    seller_profile = client.get("/api/v1/seller/profile", headers=seller_headers).json()
    assert seller_profile["is_verified"] is False
    assert seller_profile["rejection_reason"] == "Документы неполные"


def test_updating_verified_store_resets_verification(client):
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "seller1@mayss.io", "password": "seller123"},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    response = client.patch(
        "/api/v1/seller/profile",
        json={"shop_name": "ElectroShop+", "description": "updated", "inn": "1234567890"},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_verified"] is False
    assert data["rejection_reason"] is None


def test_unverified_store_cannot_open_orders_and_products(client):
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "seller1@mayss.io", "password": "seller123"},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    assert client.get("/api/v1/seller/orders", headers=headers).status_code == 403
    assert client.get("/api/v1/seller/products", headers=headers).status_code == 403


def test_seller_cannot_mark_order_delivered_directly(client):
    buyer_login = client.post(
        "/api/v1/auth/login",
        json={"email": "buyer@mayss.io", "password": "buyer123"},
    )
    buyer_headers = {"Authorization": f"Bearer {buyer_login.json()['access_token']}"}
    cart = client.get("/api/v1/cart", headers=buyer_headers).json()
    for item in cart["items"]:
        client.delete(f"/api/v1/cart/items/{item['product_id']}", headers=buyer_headers)
    client.post("/api/v1/cart/items", json={"product_id": 2, "quantity": 1}, headers=buyer_headers)
    orders = client.post(
        "/api/v1/orders", json={"address": "Seller Test"}, headers=buyer_headers
    ).json()
    order_id = orders[0]["id"]
    client.post(
        "/api/v1/payments",
        json={
            "order_id": order_id,
            "method": "card",
            "idempotency_key": f"seller-test-{order_id}",
        },
        headers=buyer_headers,
    )
    seller_login = client.post(
        "/api/v1/auth/login",
        json={"email": "seller2@mayss.io", "password": "seller123"},
    )
    seller_headers = {"Authorization": f"Bearer {seller_login.json()['access_token']}"}
    response = client.post(
        f"/api/v1/seller/orders/{order_id}/status?status=delivered",
        headers=seller_headers,
    )
    assert response.status_code == 403


def test_admin_can_open_order_detail(client, admin_headers, buyer_headers):
    cart = client.get("/api/v1/cart", headers=buyer_headers).json()
    for item in cart["items"]:
        client.delete(f"/api/v1/cart/items/{item['product_id']}", headers=buyer_headers)
    client.post("/api/v1/cart/items", json={"product_id": 3, "quantity": 1}, headers=buyer_headers)
    orders = client.post(
        "/api/v1/orders", json={"address": "Admin detail"}, headers=buyer_headers
    ).json()
    detail = client.get(f"/api/v1/admin/orders/{orders[0]['id']}", headers=admin_headers)
    assert detail.status_code == 200
    payload = detail.json()
    assert payload["buyer"]["email"] == "buyer@mayss.io"
    assert payload["seller"]["shop_name"]


def test_admin_can_read_shop_and_user_analytics(client, admin_headers):
    seller_stats = client.get("/api/v1/admin/sellers/2/analytics", headers=admin_headers)
    user_stats = client.get("/api/v1/admin/users/2/analytics", headers=admin_headers)
    assert seller_stats.status_code == 200
    assert user_stats.status_code == 200
    assert "turnover" in seller_stats.json()
    assert "spent_total" in user_stats.json()
