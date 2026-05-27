from difflib import SequenceMatcher

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_optional_user
from app.core.database import get_db
from app.models import Category, Product, ProductStatus, SellerProfile, User
from app.schemas import CategoryOut, ProductListResponse, ProductOut
from app.services import search_service
from app.services.analytics import recommend_products

router = APIRouter(tags=["catalog"])


def _expand_category(db: Session, category_id: int) -> list[int]:
    ids = [category_id]
    frontier = [category_id]
    while frontier:
        children = (
            db.query(Category.id)
            .filter(Category.parent_id.in_(frontier))
            .all()
        )
        child_ids = [c.id for c in children]
        if not child_ids:
            break
        ids.extend(child_ids)
        frontier = child_ids
    return ids


def _rank_products(products: list[Product], query: str) -> list[Product]:
    terms = [term.strip().lower() for term in query.split() if term.strip()]
    if not terms:
        return products

    def score(product: Product) -> tuple[float, float, int]:
        haystack = " ".join(
            filter(
                None,
                [
                    product.title,
                    product.brand,
                    product.description,
                    product.category.name if product.category else None,
                ],
            )
        ).lower()
        term_hits = sum(1 for term in terms if term in haystack)
        fuzzy = max(
            (
                SequenceMatcher(None, term, product.title.lower()).ratio()
                for term in terms
            ),
            default=0,
        )
        return (term_hits + fuzzy, float(product.rating), product.id)

    return sorted(products, key=score, reverse=True)


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.id).all()


@router.get("/products", response_model=ProductListResponse)
def list_products(
    db: Session = Depends(get_db),
    q: str | None = None,
    category_id: int | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    sort: str = Query("new", pattern="^(new|price_asc|price_desc|rating)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    semantic: bool = Query(False),
):
    category_ids = _expand_category(db, category_id) if category_id else None

    if semantic and q and q.strip() and search_service.is_available():
        ids = search_service.search_semantic(
            q,
            limit=page * page_size,
            category_ids=category_ids,
            min_price=min_price,
            max_price=max_price,
        )
        if ids:
            rows = db.query(Product).filter(Product.id.in_(ids)).all()
            by_id = {p.id: p for p in rows}
            ordered = [by_id[i] for i in ids if i in by_id]
            total = len(ordered)
            start = (page - 1) * page_size
            return ProductListResponse(
                items=ordered[start:start + page_size],
                total=total,
                page=page,
                page_size=page_size,
            )

    query = db.query(Product).filter(Product.status == ProductStatus.ACTIVE)

    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(Product.title.ilike(like), Product.description.ilike(like))
        )
    if category_ids:
        query = query.filter(Product.category_id.in_(category_ids))
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)

    if sort == "price_asc":
        query = query.order_by(Product.price.asc())
    elif sort == "price_desc":
        query = query.order_by(Product.price.desc())
    elif sort == "rating":
        query = query.order_by(Product.rating.desc())
    else:
        query = query.order_by(Product.id.desc())

    if q:
        ranked = _rank_products(query.all(), q)
        total = len(ranked)
        start = (page - 1) * page_size
        items = ranked[start:start + page_size]
    else:
        total = query.count()
        items = query.offset((page - 1) * page_size).limit(page_size).all()

    return ProductListResponse(
        items=items, total=total, page=page, page_size=page_size
    )


@router.get("/products/recommendations", response_model=list[ProductOut])
def list_recommendations(
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
    limit: int = Query(8, ge=1, le=24),
):
    return recommend_products(db, user=user, limit=limit)


@router.get("/products/{product_id}", response_model=ProductOut)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.status != ProductStatus.ACTIVE:
        is_admin = bool(user and user.role.value == "admin")
        is_owner = bool(
            user
            and user.seller_profile
            and product.seller_id == user.seller_profile.id
        )
        if not (is_admin or is_owner):
            raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.get("/public/shops/{shop_id}")
def get_public_shop(shop_id: int, db: Session = Depends(get_db)):
    shop = db.query(SellerProfile).filter(SellerProfile.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Магазин не найден")
    
    products = db.query(Product).filter(
        Product.seller_id == shop.id, 
        Product.status == ProductStatus.ACTIVE
    ).order_by(Product.id.desc()).all()
    
    return {
        "id": shop.id,
        "shop_name": shop.shop_name,
        "description": shop.description,
        "rating": float(shop.rating),
        "is_verified": shop.is_verified,
        "created_at": shop.created_at.isoformat(),
        "products": [ProductOut.model_validate(p).model_dump() for p in products]
    }

@router.get("/public/users/{user_id}")
def get_public_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return {
        "id": user.id,
        "full_name": user.full_name,
        "role": user.role.value,
        "created_at": user.created_at.isoformat()
    }
