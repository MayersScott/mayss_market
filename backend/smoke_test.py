"""End-to-end smoke test using FastAPI TestClient."""
import os
os.environ["DATABASE_URL"] = "sqlite:///./smoketest.db"

import sys
sys.path.insert(0, ".")

if os.path.exists("smoketest.db"):
    os.remove("smoketest.db")

from app.core.database import Base, engine
Base.metadata.create_all(bind=engine)

import seed
seed.run()

from fastapi.testclient import TestClient
from app.main import app

c = TestClient(app)

def ok(name, resp, expected=200):
    assert resp.status_code == expected, f"{name}: {resp.status_code} {resp.text}"
    print(f"  [OK] {name}")
    return resp.json() if resp.content else None

print("\n=== Public endpoints ===")
ok("health", c.get("/health"))
cats = ok("categories", c.get("/api/v1/categories"))
print(f"     {len(cats)} categories")
prods = ok("products", c.get("/api/v1/products?page_size=5"))
print(f"     {prods['total']} total products")
product_id = prods["items"][0]["id"]
ok("get one product", c.get(f"/api/v1/products/{product_id}"))

print("\n=== Buyer flow ===")
tok_resp = ok("login buyer", c.post("/api/v1/auth/login", json={"email":"buyer@mayss.io","password":"buyer123"}))
btok = tok_resp["access_token"]
bh = {"Authorization": f"Bearer {btok}"}
me = ok("me", c.get("/api/v1/auth/me", headers=bh))
print(f"     logged in as {me['email']} ({me['role']})")

ok("add to cart 1", c.post("/api/v1/cart/items", json={"product_id":prods["items"][0]["id"],"quantity":2}, headers=bh))
ok("add to cart 2", c.post("/api/v1/cart/items", json={"product_id":prods["items"][1]["id"],"quantity":1}, headers=bh))
cart = ok("get cart", c.get("/api/v1/cart", headers=bh))
print(f"     cart: {len(cart['items'])} items, total {cart['total']}")

orders = ok("create order (split by seller)", c.post("/api/v1/orders", json={"address":"Test addr"}, headers=bh))
print(f"     created {len(orders)} order(s) — split by seller works")
order_id = orders[0]["id"]

pay1 = ok("pay (first time)", c.post("/api/v1/payments", json={"order_id":order_id,"method":"card","idempotency_key":"test-key-123"}, headers=bh))
print(f"     payment status: {pay1['status']}")

# Idempotency check
pay2 = ok("pay again with same key (idempotency)", c.post("/api/v1/payments", json={"order_id":order_id,"method":"card","idempotency_key":"test-key-123"}, headers=bh))
assert pay1["id"] == pay2["id"], "Idempotency broken!"
print(f"     same payment returned (id={pay2['id']}) — idempotency works")

print("\n=== Seller flow ===")
stok = ok("login seller", c.post("/api/v1/auth/login", json={"email":"seller1@mayss.io","password":"seller123"}))["access_token"]
sh = {"Authorization": f"Bearer {stok}"}
sp = ok("get seller profile", c.get("/api/v1/seller/profile", headers=sh))
print(f"     shop: {sp['shop_name']}")
sprods = ok("seller products", c.get("/api/v1/seller/products", headers=sh))
print(f"     {len(sprods)} products owned")
new_p = ok("create product", c.post("/api/v1/seller/products",
    json={"title":"Test new","price":1000,"category_id":cats[0]["id"],"stock":5}, headers=sh))
print(f"     created product id={new_p['id']}, status={new_p['status']}")

print("\n=== Admin flow ===")
atok = ok("login admin", c.post("/api/v1/auth/login", json={"email":"admin@mayss.io","password":"admin123"}))["access_token"]
ah = {"Authorization": f"Bearer {atok}"}
stats = ok("admin stats", c.get("/api/v1/admin/stats", headers=ah))
print(f"     users={stats['users_total']} sellers={stats['sellers_total']} products={stats['products_total']} pending={stats['products_pending']}")
pending = ok("pending products", c.get("/api/v1/admin/products/pending", headers=ah))
print(f"     {len(pending)} pending")
if pending:
    ok("approve product", c.post(f"/api/v1/admin/products/{pending[0]['id']}/moderate", json={"approve":True}, headers=ah))
    print(f"     approved product {pending[0]['id']}")

print("\n=== Auth failures (must reject) ===")
r = c.get("/api/v1/auth/me")
assert r.status_code == 401, f"expected 401, got {r.status_code}"
print(f"  [OK] no token -> 401")
r = c.get("/api/v1/admin/stats", headers=bh)
assert r.status_code == 403, f"expected 403 for buyer accessing admin, got {r.status_code}"
print(f"  [OK] buyer -> admin endpoint -> 403")

print("\n✓ ALL SMOKE TESTS PASSED")
os.remove("smoketest.db")
