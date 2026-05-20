from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import SupportMessage, SupportTicket, User
from app.schemas import (
    SupportMessageCreate,
    SupportTicketCreate,
    SupportTicketOut,
)

router = APIRouter(prefix="/support", tags=["support"])


@router.get("/tickets", response_model=list[SupportTicketOut])
def list_tickets(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(SupportTicket)
        .filter(SupportTicket.user_id == user.id)
        .order_by(SupportTicket.id.desc())
        .all()
    )


@router.get("/tickets/{ticket_id}", response_model=SupportTicketOut)
def get_ticket(
    ticket_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    t = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not t or (t.user_id != user.id and user.role.value != "admin"):
        raise HTTPException(status_code=404, detail="Ticket not found")
    return t


@router.post("/tickets", response_model=SupportTicketOut)
def create_ticket(
    data: SupportTicketCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    t = SupportTicket(
        user_id=user.id,
        subject=data.subject,
        message=data.message,
        status="open",
    )
    db.add(t)
    db.flush()
    first_msg = SupportMessage(ticket_id=t.id, author_id=user.id, body=data.message)
    db.add(first_msg)
    db.commit()
    db.refresh(t)
    return t


@router.post("/tickets/{ticket_id}/messages", response_model=SupportTicketOut)
def add_message(
    ticket_id: int,
    data: SupportMessageCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    t = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not t or (t.user_id != user.id and user.role.value != "admin"):
        raise HTTPException(status_code=404, detail="Ticket not found")

    msg = SupportMessage(ticket_id=t.id, author_id=user.id, body=data.body)
    db.add(msg)
    if t.status == "open" and user.role.value == "admin":
        t.status = "answered"
    elif t.status == "answered" and user.id == t.user_id:
        t.status = "open"
    db.commit()
    db.refresh(t)
    return t


@router.post("/tickets/{ticket_id}/close")
def close_ticket(
    ticket_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    t = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not t or (t.user_id != user.id and user.role.value != "admin"):
        raise HTTPException(status_code=404, detail="Ticket not found")
    t.status = "closed"
    db.commit()
    return {"ok": True}
