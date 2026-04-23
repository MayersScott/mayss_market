from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Order, OrderStatus, Payment, User  # noqa: F401
from app.schemas import PaymentCreate, PaymentOut

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("", response_model=PaymentOut)
def create_payment(
    data: PaymentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    key = idempotency_key or data.idempotency_key

    existing = db.query(Payment).filter(Payment.idempotency_key == key).first()
    if existing:
        return existing

    order = db.query(Order).filter(Order.id == data.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.buyer_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if order.status != OrderStatus.CREATED:
        raise HTTPException(status_code=400, detail="Order is not payable")

    payment = Payment(
        order_id=order.id,
        idempotency_key=key,
        amount=order.total,
        status="succeeded",
        method=data.method,
    )
    db.add(payment)
    order.status = OrderStatus.ASSEMBLING
    order.paid_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(payment)

    from app.services.notifier import notify_user_order_status
    notify_user_order_status(db, order, OrderStatus.ASSEMBLING.value)
    return payment


@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(
    payment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.order.buyer_id != user.id and user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    return payment
