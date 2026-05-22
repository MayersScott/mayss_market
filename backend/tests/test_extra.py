def test_recommendations_endpoint(client):
    r = client.get("/api/v1/products/recommendations?limit=4")
    assert r.status_code == 200
    assert len(r.json()) <= 4


def test_search_query(client):
    r = client.get("/api/v1/products?q=наушники")
    assert r.status_code == 200
    assert r.json()["total"] >= 0


def test_public_shop_page(client):
    r = client.get("/api/v1/public/shops/1")
    assert r.status_code == 200
    assert "shop_name" in r.json()


def test_admin_can_close_ticket(client, buyer_headers, admin_headers):
    created = client.post(
        "/api/v1/support/tickets",
        json={"subject": "Test", "message": "Help"},
        headers=buyer_headers,
    ).json()
    close = client.post(
        f"/api/v1/admin/tickets/{created['id']}/close",
        headers=admin_headers,
    )
    assert close.status_code == 200


def test_admin_ticket_reply(client, buyer_headers, admin_headers):
    created = client.post(
        "/api/v1/support/tickets",
        json={"subject": "Reply test", "message": "Need help"},
        headers=buyer_headers,
    ).json()
    reply = client.post(
        f"/api/v1/admin/tickets/{created['id']}/reply",
        json={"body": "We are on it"},
        headers=admin_headers,
    )
    assert reply.status_code == 200


def test_catalog_sort_price_asc(client):
    r = client.get("/api/v1/products?sort=price_asc&page_size=5")
    assert r.status_code == 200
    prices = [float(p["price"]) for p in r.json()["items"]]
    assert prices == sorted(prices)
