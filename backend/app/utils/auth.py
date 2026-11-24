from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.database import get_db
from app.models.schemas import UserResponse

password_hasher = PasswordHasher()
security = HTTPBearer()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        if hashed.startswith(("$2a$", "$2b$", "$2y$")):
            # Preserve old accounts without silently truncating long passwords.
            encoded = plain.encode("utf-8")
            return len(encoded) <= 72 and bcrypt.checkpw(encoded, hashed.encode("utf-8"))
        return password_hasher.verify(hashed, plain)
    except (VerificationError, InvalidHashError, ValueError, TypeError):
        return False


def needs_rehash(hashed: str) -> bool:
    return not hashed.startswith("$argon2") or password_hasher.check_needs_rehash(hashed)


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.secret_key_value, algorithm="HS256")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UserResponse:
    error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.secret_key_value,
            algorithms=["HS256"],
            options={"require": ["exp", "sub"]},
        )
        user_id = payload["sub"]
        if not isinstance(user_id, str) or not user_id:
            raise error
    except jwt.InvalidTokenError:
        raise error from None
    user = await get_db().users.find_one({"_id": user_id})
    if not user:
        raise error
    return UserResponse(id=user["_id"], name=user["name"], email=user["email"])
