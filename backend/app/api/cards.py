from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Card, User
from app.schemas import CardCreate, CardOut

router = APIRouter(prefix="/cards", tags=["cards"])


def _detect_brand(number: str) -> str:
    digits = "".join(c for c in number if c.isdigit())
    if digits.startswith("4"):
        return "Visa"
    if digits[:2] in {"51", "52", "53", "54", "55"} or digits[:4] in {"2221", "2222", "2720"}:
        return "Mastercard"
    if digits.startswith(("34", "37")):
        return "Amex"
    if digits.startswith("62"):
        return "UnionPay"
    if digits.startswith(("2200", "2201", "2202", "2203", "2204")):
        return "Мир"
    return "Card"


@router.get("", response_model=list[CardOut])
def list_cards(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Card)
        .filter(Card.user_id == user.id)
        .order_by(Card.is_default.desc(), Card.id.desc())
        .all()
    )


@router.post("", response_model=CardOut)
def create_card(
    data: CardCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    digits = "".join(c for c in data.number if c.isdigit())
    if len(digits) < 13:
        raise HTTPException(status_code=400, detail="Card number too short")

    if data.is_default:
        db.query(Card).filter(Card.user_id == user.id).update({"is_default": False})

    card = Card(
        user_id=user.id,
        holder=data.holder.strip().upper(),
        last4=digits[-4:],
        brand=_detect_brand(digits),
        expiry=data.expiry,
        is_default=data.is_default,
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


@router.post("/{card_id}/default")
def set_default(
    card_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    card = db.query(Card).filter(Card.id == card_id, Card.user_id == user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    db.query(Card).filter(Card.user_id == user.id).update({"is_default": False})
    card.is_default = True
    db.commit()
    return {"ok": True}


@router.delete("/{card_id}")
def delete_card(
    card_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    card = db.query(Card).filter(Card.id == card_id, Card.user_id == user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    db.delete(card)
    db.commit()
    return {"ok": True}
