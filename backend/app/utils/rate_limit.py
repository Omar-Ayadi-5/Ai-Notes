"""Atomic MongoDB counters shared by API workers; TTL indexes expire old windows."""

import hashlib
import time
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request
from pymongo import ReturnDocument

from app.database import get_db
from app.models.schemas import UserResponse
from app.utils.auth import get_current_user


async def check_limit(key: str, limit: int, seconds: int) -> None:
    now = int(time.time())
    window = now // seconds
    expires = (window + 1) * seconds
    counter = await get_db().rate_limits.find_one_and_update(
        {"_id": f"{key}:{window}"},
        {
            "$inc": {"count": 1},
            "$setOnInsert": {"expires_at": datetime.fromtimestamp(expires, timezone.utc)},
        },
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    if counter["count"] > limit:
        raise HTTPException(
            429,
            "Too many requests. Please try again shortly.",
            headers={"Retry-After": str(expires - now)},
        )


def client_key(request: Request) -> str:
    # Trust ASGI's client address, not arbitrary forwarding headers.
    address = request.client.host if request.client else "unknown"
    return hashlib.sha256(address.encode()).hexdigest()


async def limit_auth(request: Request) -> None:
    signup = request.url.path.endswith("/signup")
    await check_limit(
        f"{'signup' if signup else 'login'}:{client_key(request)}",
        5 if signup else 15,
        3600 if signup else 60,
    )


async def limit_notes(current_user: UserResponse = Depends(get_current_user)) -> None:
    await check_limit(f"notes:{current_user.id}", 120, 60)


async def limit_ai(current_user: UserResponse = Depends(get_current_user)) -> None:
    await check_limit(f"ai:{current_user.id}", 5, 60)


async def limit_shared(request: Request) -> None:
    await check_limit(f"shared:{client_key(request)}", 60, 60)
