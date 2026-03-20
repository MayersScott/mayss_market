import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import Base, engine
from app.core.logger import setup_logging, logger
from app.api import (
    addresses, admin, auth, cards, cart, catalog,
    favorites, orders, payments, promos, reviews, seller, support, notifications, bonuses
)
import app.models.promotions  # noqa: F401 — register promo tables
from app.services.bootstrap import ensure_runtime_schema

setup_logging()
logger.info("Starting MAYSS Marketplace API")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Full-featured marketplace API with bonuses, promotions, and orders",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

if "pytest_db.sqlite" not in settings.DATABASE_URL:
    try:
        Base.metadata.create_all(bind=engine)
        ensure_runtime_schema()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests and responses."""
    start_time = time.time()
    ip = request.client.host if request.client else "unknown"
    
    logger.debug("REQ | IP: %s | %s %s", ip, request.method, request.url.path)
    
    try:
        response = await call_next(request)
    except Exception as e:
        logger.error(f"Unhandled exception: {e}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )
    
    process_time = (time.time() - start_time) * 1000
    logger.info(
        "RES | IP: %s | %s %s | Status: %s | Time: %.2fms",
        ip, request.method, request.url.path, response.status_code, process_time
    )
    return response

api_routers = [
    auth.router, catalog.router, cart.router, orders.router,
    payments.router, seller.router, reviews.router, favorites.router,
    addresses.router, cards.router, support.router, admin.router,
    bonuses.router,
    notifications.router, promos.router,
]

for router in api_routers:
    app.include_router(router, prefix=settings.API_V1_PREFIX)

def _bootstrap_search_index_blocking():
    """Ensure ES index exists; reindex all active products if empty. Best-effort."""
    try:
        from app.core.database import SessionLocal
        from app.services import search_service
        if not search_service.is_available():
            logger.info("Elasticsearch not available — skipping search bootstrap")
            return
        if not search_service.ensure_index():
            return
        db = SessionLocal()
        try:
            try:
                es = search_service._get_es()
                count = es.count(index=search_service.INDEX_NAME).get("count", 0) if es else 0
            except Exception:
                count = 0
            if count == 0:
                logger.info("ES index empty — running initial reindex (this may take a few minutes on first run while the embedding model is downloaded)")
                indexed = search_service.reindex_all(db)
                logger.info("ES bootstrap reindexed %d products", indexed)
            else:
                logger.info("ES index already has %d documents", count)
        finally:
            db.close()
    except Exception as exc:
        logger.warning("Search bootstrap failed (non-fatal): %s", exc)


@app.on_event("startup")
def _bootstrap_search_index():
    """Kick the search bootstrap off in a background thread so uvicorn can accept
    requests immediately. Until indexing completes, ?semantic=true returns empty
    results and the catalog falls back to the SQL path automatically."""
    if "pytest_db.sqlite" in settings.DATABASE_URL:
        return
    import threading
    t = threading.Thread(target=_bootstrap_search_index_blocking, daemon=True, name="es-bootstrap")
    t.start()


@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"service": settings.PROJECT_NAME, "docs": "/docs"}
