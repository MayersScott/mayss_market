import httpx
from pywebpush import webpush, WebPushException
from app.core.config import settings
from app.core.logger import logger

def send_web_push(subscription_info: dict, payload: str):
    if not settings.VAPID_PRIVATE_KEY:
        return
    try:
        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_CLAIMS_EMAIL}
        )
    except WebPushException as e:
        logger.warning("WebPush error: %s", e)

async def send_telegram_message(chat_id: str, text: str):
    if not settings.TELEGRAM_BOT_TOKEN:
        return
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    async with httpx.AsyncClient() as client:
        try:
            await client.post(url, json={"chat_id": chat_id, "text": text})
        except Exception as e:
            logger.warning("Telegram error: %s", e)

def notify_user_order_status(db, order, new_status: str):
    buyer = order.buyer
    title = f"MAYSS: Заказ M-{str(order.id).zfill(8)}"
    status_ru = {
        "paid": "оплачен 💸",
        "assembling": "в сборке 📦",
        "shipped": "в пути 🚚",
        "delivered": "доставлен 🎉"
    }.get(new_status, new_status)
    
    body = f"Статус вашего заказа изменился: {status_ru}"

    import json
    import asyncio
    
    payload = json.dumps({"title": title, "body": body})
    for sub in buyer.push_subscriptions:
        sub_info = {
            "endpoint": sub.endpoint,
            "keys": {"p256dh": sub.p256dh, "auth": sub.auth}
        }
        send_web_push(sub_info, payload)

    if buyer.telegram_chat_id:
        asyncio.create_task(send_telegram_message(buyer.telegram_chat_id, f"{title}\n{body}"))
