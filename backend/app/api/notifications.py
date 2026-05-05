from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.config import settings
from app.models import PushSubscription, User
from app.schemas import NotificationStatus, PushSubCreate, TelegramLinkOut
from jose import jwt
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/status", response_model=NotificationStatus)
def get_status(user: User = Depends(get_current_user)):
    return NotificationStatus(
        telegram_linked=bool(user.telegram_chat_id),
        push_enabled=len(user.push_subscriptions) > 0
    )

@router.get("/push/public-key")
def get_push_key():
    if not settings.VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=503, detail="VAPID public key is not configured")
    return {"key": settings.VAPID_PUBLIC_KEY}

@router.post("/push/subscribe")
def subscribe_push(data: PushSubCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = db.query(PushSubscription).filter(PushSubscription.endpoint == data.endpoint).first()
    if not sub:
        sub = PushSubscription(user_id=user.id, endpoint=data.endpoint, p256dh=data.p256dh, auth=data.auth)
        db.add(sub)
        db.commit()
    return {"ok": True}

@router.delete("/push/unsubscribe")
def unsubscribe_push(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(PushSubscription).filter(PushSubscription.user_id == user.id).delete()
    db.commit()
    return {"ok": True}

@router.get("/telegram/link-url", response_model=TelegramLinkOut)
def get_telegram_link(user: User = Depends(get_current_user)):
    expire = datetime.now(timezone.utc) + timedelta(minutes=10)
    token = jwt.encode({"user_id": user.id, "exp": expire}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    webhook_hint = None
    if settings.TELEGRAM_BOT_TOKEN:
        webhook_hint = (
            f'curl -F "url={settings.PUBLIC_BASE_URL}/api/v1/notifications/telegram/webhook" '
            f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/setWebhook"
        )
    return {
        "url": f"https://t.me/{settings.TELEGRAM_BOT_NAME}?start={token}",
        "webhook_hint": webhook_hint,
    }

@router.post("/telegram/unlink")
def unlink_telegram(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.telegram_chat_id = None
    db.commit()
    return {"ok": True}

@router.post("/telegram/webhook")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    from app.services.telegram_bot import handle_telegram_update

    data = await request.json()
    await handle_telegram_update(db, data)
    return {"ok": True}
