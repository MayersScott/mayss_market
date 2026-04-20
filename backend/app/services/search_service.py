"""Semantic search service backed by Elasticsearch + sentence-transformers"""
from __future__ import annotations

import logging
import os
import threading
from typing import Iterable

from sqlalchemy.orm import Session

from app.models import Product, ProductStatus

logger = logging.getLogger("mayss")

INDEX_NAME = "mayss_products"
EMBEDDING_DIMS = 384
EMBEDDING_MODEL_NAME = "intfloat/multilingual-e5-small"

_es_client = None
_model = None
_model_lock = threading.Lock()


def _es_url() -> str | None:
    url = os.environ.get("ELASTICSEARCH_URL")
    return url or None


def _get_es():
    """Return cached ES client, or None if ELASTICSEARCH_URL is not set"""
    global _es_client
    if _es_client is not None:
        return _es_client
    url = _es_url()
    if not url:
        return None
    try:
        from elasticsearch import Elasticsearch
        _es_client = Elasticsearch(url, request_timeout=5, retry_on_timeout=False)
        return _es_client
    except Exception as exc:
        logger.warning("ES client init failed: %s", exc)
        return None


def is_available() -> bool:
    es = _get_es()
    if es is None:
        return False
    try:
        return bool(es.ping())
    except Exception:
        return False


def _get_model():
    """Lazy-load the embedding model. Thread-safe"""
    global _model
    if _model is not None:
        return _model
    with _model_lock:
        if _model is not None:
            return _model
        from sentence_transformers import SentenceTransformer
        logger.info("Loading embedding model %s …", EMBEDDING_MODEL_NAME)
        _model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        logger.info("Embedding model loaded.")
        return _model


def embed_passage(text: str) -> list[float]:
    """Embed a document. e5 expects the 'passage: ' prefix"""
    model = _get_model()
    vec = model.encode("passage: " + (text or ""), normalize_embeddings=True)
    return vec.tolist()


def embed_query(text: str) -> list[float]:
    """Embed a search query. e5 expects the 'query: ' prefix"""
    model = _get_model()
    vec = model.encode("query: " + (text or ""), normalize_embeddings=True)
    return vec.tolist()


def _product_text(product: Product) -> str:
    parts = [product.title, product.brand, product.description]
    if product.category and product.category.name:
        parts.append(product.category.name)
    return " — ".join(p for p in parts if p)


def ensure_index() -> bool:
    """Create the product index with a proper mapping if it doesn't exist

    Returns True if the index exists (or was created), False if ES is unreachable
    """
    es = _get_es()
    if es is None:
        return False
    try:
        if es.indices.exists(index=INDEX_NAME):
            return True
        es.indices.create(
            index=INDEX_NAME,
            mappings={
                "properties": {
                    "id": {"type": "integer"},
                    "title": {"type": "text"},
                    "description": {"type": "text"},
                    "brand": {"type": "keyword"},
                    "category_id": {"type": "integer"},
                    "category_name": {"type": "text"},
                    "seller_id": {"type": "integer"},
                    "price": {"type": "float"},
                    "rating": {"type": "float"},
                    "stock": {"type": "integer"},
                    "status": {"type": "keyword"},
                    "embedding": {
                        "type": "dense_vector",
                        "dims": EMBEDDING_DIMS,
                        "index": True,
                        "similarity": "cosine",
                    },
                },
            },
        )
        logger.info("Created ES index %s", INDEX_NAME)
        return True
    except Exception as exc:
        logger.warning("ensure_index failed: %s", exc)
        return False


def index_product(product: Product) -> None:
    """Index or update a single product. Best-effort — never raises"""
    es = _get_es()
    if es is None:
        return
    try:
        if not ensure_index():
            return
        doc = {
            "id": product.id,
            "title": product.title,
            "description": product.description or "",
            "brand": product.brand,
            "category_id": product.category_id,
            "category_name": product.category.name if product.category else None,
            "seller_id": product.seller_id,
            "price": float(product.price),
            "rating": float(product.rating or 0),
            "stock": product.stock,
            "status": product.status.value if hasattr(product.status, "value") else str(product.status),
            "embedding": embed_passage(_product_text(product)),
        }
        es.index(index=INDEX_NAME, id=str(product.id), document=doc)
    except Exception as exc:
        logger.warning("index_product(%s) failed: %s", product.id, exc)


def delete_product(product_id: int) -> None:
    """Remove a product from the index. Best-effort"""
    es = _get_es()
    if es is None:
        return
    try:
        es.delete(index=INDEX_NAME, id=str(product_id), ignore=[404])
    except Exception as exc:
        logger.warning("delete_product(%s) failed: %s", product_id, exc)


def reindex_all(db: Session) -> int:
    """Wipe the index and re-index every active product. Returns count indexed"""
    es = _get_es()
    if es is None:
        return 0
    if not ensure_index():
        return 0

    try:
        from elasticsearch.helpers import bulk
    except Exception as exc:
        logger.warning("bulk helper unavailable: %s", exc)
        return 0

    products: Iterable[Product] = (
        db.query(Product).filter(Product.status == ProductStatus.ACTIVE).all()
    )
    actions = []
    for p in products:
        try:
            actions.append({
                "_index": INDEX_NAME,
                "_id": str(p.id),
                "_source": {
                    "id": p.id,
                    "title": p.title,
                    "description": p.description or "",
                    "brand": p.brand,
                    "category_id": p.category_id,
                    "category_name": p.category.name if p.category else None,
                    "seller_id": p.seller_id,
                    "price": float(p.price),
                    "rating": float(p.rating or 0),
                    "stock": p.stock,
                    "status": p.status.value if hasattr(p.status, "value") else str(p.status),
                    "embedding": embed_passage(_product_text(p)),
                },
            })
        except Exception as exc:
            logger.warning("embed for product %s failed: %s", p.id, exc)

    if not actions:
        return 0
    try:
        ok, _ = bulk(es, actions, refresh="wait_for")
        logger.info("Indexed %d products into ES", ok)
        return ok
    except Exception as exc:
        logger.warning("bulk index failed: %s", exc)
        return 0


def search_semantic(
    query: str,
    *,
    limit: int = 20,
    category_ids: list[int] | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
) -> list[int]:
    """Hybrid BM25 + kNN search. Returns product IDs in relevance order.

    Returns empty list (not error) if ES is unavailable — caller should fall
    back to the SQL search path
    """
    es = _get_es()
    if es is None or not query.strip():
        return []
    try:
        qvec = embed_query(query)
    except Exception as exc:
        logger.warning("embed_query failed: %s", exc)
        return []

    filters: list[dict] = [{"term": {"status": "active"}}]
    if category_ids:
        filters.append({"terms": {"category_id": category_ids}})
    if min_price is not None:
        filters.append({"range": {"price": {"gte": min_price}}})
    if max_price is not None:
        filters.append({"range": {"price": {"lte": max_price}}})

    try:
        resp = es.search(
            index=INDEX_NAME,
            size=limit,
            knn={
                "field": "embedding",
                "query_vector": qvec,
                "k": limit * 2,
                "num_candidates": max(50, limit * 4),
                "filter": filters,
                "similarity": 0.78,
            },
        )
        hits = resp.get("hits", {}).get("hits", [])
        if not hits:
            return []
        scores = [h.get("_score") or 0.0 for h in hits]
        cutoff = len(hits)
        for i in range(len(scores) - 1):
            if scores[i] > 0 and scores[i + 1] < scores[i] * 0.7:
                cutoff = i + 1
                break
        return [int(h["_id"]) for h in hits[:cutoff]]
    except Exception as exc:
        logger.warning("search_semantic failed: %s", exc)
        return []
