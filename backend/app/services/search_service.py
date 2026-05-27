"""Semantic search service backed by PostgreSQL + pgvector + sentence-transformers"""
from __future__ import annotations

import logging
import threading
from typing import List

from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models import Product, ProductStatus

logger = logging.getLogger("mayss")

EMBEDDING_DIMS = 384
EMBEDDING_MODEL_NAME = "intfloat/multilingual-e5-small"

_model = None
_model_lock = threading.Lock()


def is_available() -> bool:
    """pgvector всегда доступен, если доступна основная база данных"""
    return True


def _get_model():
    """Lazy-load the embedding model. Thread-safe"""
    global _model
    if _model is not None:
        return _model
    with _model_lock:
        if _model is not None:
            return _model
        from sentence_transformers import SentenceTransformer
        logger.info("Loading embedding model %s ...", EMBEDDING_MODEL_NAME)
        _model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        logger.info("Embedding model loaded.")
        return _model


def embed_passage(text_str: str) -> list[float]:
    """Embed a document. e5 expects the 'passage: ' prefix"""
    model = _get_model()
    vec = model.encode("passage: " + (text_str or ""), normalize_embeddings=True)
    return vec.tolist()


def embed_query(text_str: str) -> list[float]:
    """Embed a search query. e5 expects the 'query: ' prefix"""
    model = _get_model()
    vec = model.encode("query: " + (text_str or ""), normalize_embeddings=True)
    return vec.tolist()


def _product_text(product: Product) -> str:
    parts = [product.title, product.brand, product.description]
    if product.category and product.category.name:
        parts.append(product.category.name)
    return " — ".join(p for p in parts if p)


def ensure_index() -> bool:
    """Для pgvector индекс создается на уровне миграций или принудительно в БД"""
    return True


def index_product(product: Product) -> None:
    """
    Метод вызывается при обновлении товара. 
    Если у тебя в модели Product уже есть колонка `embedding`, 
    расчет запишется автоматически перед коммитом в основной сессии.
    """
    pass


def delete_product(product_id: int) -> None:
    """Товар удаляется стандартными средствами SQLAlchemy из таблицы products"""
    pass


def reindex_all(db: Session) -> int:
    """Генерирует векторы для всех активных товаров и сохраняет их в БД"""
    products = db.query(Product).filter(Product.status == ProductStatus.ACTIVE).all()
    count = 0
    for p in products:
        try:
            p.embedding = embed_passage(_product_text(p))
            count += 1
        except Exception as exc:
            logger.warning("Failed to embed product %s: %s", p.id, exc)
    db.commit()
    logger.info("Successfully reindexed %d products with pgvector", count)
    return count


def search_semantic(
    query: str,
    *,
    limit: int = 20,
    category_ids: list[int] | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
) -> list[int]:
    """Семантический поиск через косинусное сходство pgvector (оператор <=>)"""
    if not query.strip():
        return []
    
    try:
        qvec = embed_query(query)
    except Exception as exc:
        logger.warning("embed_query failed: %s", exc)
        return []

    from app.database import SessionLocal
    
    with SessionLocal() as db:
        sql_query = """
            SELECT id FROM products 
            WHERE status = 'ACTIVE' AND embedding IS NOT NULL
        """
        params = {"qvec": str(qvec), "limit": limit}

        if category_ids:
            sql_query += " AND category_id IN :category_ids"
            params["category_ids"] = tuple(category_ids)
        if min_price is not None:
            sql_query += " AND price >= :min_price"
            params["min_price"] = min_price
        if max_price is not None:
            sql_query += " AND price <= :max_price"
            params["max_price"] = max_price

        sql_query += " ORDER BY embedding <=> :qvec LIMIT :limit"

        try:
            result = db.execute(text(sql_query), params).fetchall()
            return [int(row[0]) for row in result]
        except Exception as exc:
            logger.warning("pgvector search execution failed: %s", exc)
            return []