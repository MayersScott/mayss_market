#!/usr/bin/env python3
import os
import sys
import time

import httpx

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import settings
from app.core.database import SessionLocal
from app.services.telegram_bot import handle_telegram_update


def main() -> None:
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        print("Set TELEGRAM_BOT_TOKEN in environment")
        sys.exit(1)

    base = f"https://api.telegram.org/bot{token}"
    offset = 0
    print("Telegram polling started…")

    with httpx.Client(timeout=60) as client:
        while True:
            response = client.get(
                f"{base}/getUpdates",
                params={"timeout": 30, "offset": offset},
            )
            response.raise_for_status()
            for update in response.json().get("result", []):
                offset = update["update_id"] + 1
                db = SessionLocal()
                try:
                    import asyncio
                    asyncio.run(handle_telegram_update(db, update))
                finally:
                    db.close()
            time.sleep(0.5)


if __name__ == "__main__":
    main()
