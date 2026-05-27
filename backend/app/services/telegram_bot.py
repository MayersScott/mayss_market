from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logger import logger
from app.models import Order, User
from app.services.notifier import send_telegram_message


WELCOME_TEXT = (
    "👋 Добро пожаловать в MAYSS Bot!\n\n"
    "Команды:\n"
    "/start <token> — привязать аккаунт (ссылка из личного кабинета)\n"
    "/status — последние заказы\n"
    "/unlink — отвязать аккаунт\n"
    "/help — справка"
)


async def handle_telegram_update(db: Session, payload: dict) -> None:
    message = payload.get("message") or payload.get("edited_message")
    if not message:
        return

    chat_id = str(message.get("chat", {}).get("id", ""))
    text = (message.get("text") or "").strip()
    if not chat_id or not text:
        return

    if text.startswith("/start"):
        await _cmd_start(db, chat_id, text)
    elif text == "/help":
        await send_telegram_message(chat_id, WELCOME_TEXT)
    elif text == "/status":
        await _cmd_status(db, chat_id)
    elif text == "/unlink":
        await _cmd_unlink(db, chat_id)
    else:
        await send_telegram_message(
            chat_id,
            "Неизвестная команда. Напишите /help",
        )


async def _cmd_start(db: Session, chat_id: str, text: str) -> None:
    parts = text.split(maxsplit=1)
    if len(parts) < 2:
        await send_telegram_message(
            chat_id,
            "Откройте ссылку привязки в личном кабинете MAYSS → Уведомления.",
        )
        return
    token = parts[1].strip()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("user_id")
    except JWTError:
        await send_telegram_message(chat_id, "❌ Ссылка привязки недействительна или устарела.")
        return

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        await send_telegram_message(chat_id, "❌ Пользователь не найден.")
        return

    user.telegram_chat_id = chat_id
    db.commit()
    await send_telegram_message(
        chat_id,
        f"✅ Аккаунт {user.email} привязан. Уведомления о заказах включены.",
    )
    logger.info("Telegram linked user_id=%s chat_id=%s", user.id, chat_id)


async def _cmd_status(db: Session, chat_id: str) -> None:
    user = db.query(User).filter(User.telegram_chat_id == chat_id).first()
    if not user:
        await send_telegram_message(chat_id, "Сначала привяжите аккаунт через /start <token>.")
        return

    orders = (
        db.query(Order)
        .filter(Order.buyer_id == user.id)
        .order_by(Order.id.desc())
        .limit(5)
        .all()
    )
    if not orders:
        await send_telegram_message(chat_id, "У вас пока нет заказов.")
        return

    lines = ["📦 Последние заказы:"]
    for order in orders:
        lines.append(f"• M-{order.id:08d} — {order.status.value} — {order.total} ₽")
    await send_telegram_message(chat_id, "\n".join(lines))


async def _cmd_unlink(db: Session, chat_id: str) -> None:
    user = db.query(User).filter(User.telegram_chat_id == chat_id).first()
    if not user:
        await send_telegram_message(chat_id, "Аккаунт не привязан.")
        return
    user.telegram_chat_id = None
    db.commit()
    await send_telegram_message(chat_id, "Аккаунт отвязан.")
