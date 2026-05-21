import json

from sqlalchemy import inspect, text

from app.core.database import engine

ORDER_COLUMNS = {
    "paid_at": "TIMESTAMP NULL",
    "shipped_at": "TIMESTAMP NULL",
    "delivered_at": "TIMESTAMP NULL",
    "subtotal": "NUMERIC(12, 2) DEFAULT 0",
    "promo_discount": "NUMERIC(12, 2) DEFAULT 0",
    "bonus_spent": "NUMERIC(12, 2) DEFAULT 0",
    "promo_code": "VARCHAR(64) NULL",
}

def _is_postgres() -> bool:
    return "postgresql" in str(engine.url)


PROMO_TABLES_SQL_PG = [
    """
    CREATE TABLE IF NOT EXISTS promo_codes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(64) UNIQUE NOT NULL,
        owner_type VARCHAR(32) NOT NULL,
        seller_id INTEGER REFERENCES seller_profiles(id),
        title VARCHAR(255) DEFAULT '',
        discount_type VARCHAR(32) NOT NULL,
        discount_value NUMERIC(12, 2) NOT NULL,
        min_order_amount NUMERIC(12, 2),
        max_uses INTEGER,
        uses_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        valid_from TIMESTAMP,
        valid_until TIMESTAMP,
        applies_to_all_products BOOLEAN DEFAULT TRUE,
        product_ids TEXT,
        category_ids TEXT,
        created_by_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS promo_code_usages (
        id SERIAL PRIMARY KEY,
        promo_id INTEGER NOT NULL REFERENCES promo_codes(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        order_id INTEGER NOT NULL REFERENCES orders(id),
        discount_amount NUMERIC(12, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (promo_id, user_id, order_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS bonus_wallets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
        balance NUMERIC(12, 2) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS bonus_transactions (
        id SERIAL PRIMARY KEY,
        wallet_id INTEGER NOT NULL REFERENCES bonus_wallets(id),
        amount NUMERIC(12, 2) NOT NULL,
        tx_type VARCHAR(32) NOT NULL,
        order_id INTEGER REFERENCES orders(id),
        description VARCHAR(500) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
]


def ensure_runtime_schema() -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    if "orders" in tables:
        existing = {column["name"] for column in inspector.get_columns("orders")}
        missing = {
            name: ddl for name, ddl in ORDER_COLUMNS.items() if name not in existing
        }
        if missing:
            with engine.begin() as connection:
                for column_name, ddl in missing.items():
                    connection.execute(
                        text(f"ALTER TABLE orders ADD COLUMN {column_name} {ddl}")
                    )

    if _is_postgres():
        with engine.begin() as connection:
            for ddl in PROMO_TABLES_SQL_PG:
                connection.execute(text(ddl))
