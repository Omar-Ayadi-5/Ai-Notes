import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError
from starlette.concurrency import run_in_threadpool

from app.database import get_db
from app.models.schemas import TokenResponse, UserLogin, UserResponse, UserSignup
from app.utils.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    needs_rehash,
    verify_password,
)
from app.utils.rate_limit import limit_auth

router = APIRouter(prefix="/auth", tags=["auth"])
_dummy_hash = hash_password("unused-account-timing-placeholder")


@router.post("/signup", response_model=TokenResponse, dependencies=[Depends(limit_auth)])
async def signup(data: UserSignup):
    db = get_db()
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user_id = f"USR_{uuid.uuid4().hex}"
    user_doc = {
        "_id": user_id,
        "name": data.name,
        "email": data.email.lower(),
        "password_hash": await run_in_threadpool(hash_password, data.password),
    }
    try:
        await db.users.insert_one(user_doc)
    except DuplicateKeyError:
        raise HTTPException(400, "Email already registered") from None

    token = create_access_token(user_id)
    user = UserResponse(id=user_id, name=data.name, email=data.email.lower())
    return TokenResponse(access_token=token, user=user)


@router.post("/login", response_model=TokenResponse, dependencies=[Depends(limit_auth)])
async def login(data: UserLogin):
    db = get_db()
    user = await db.users.find_one({"email": data.email.lower()})
    valid = await run_in_threadpool(
        verify_password, data.password, user["password_hash"] if user else _dummy_hash
    )
    if not user or not valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if needs_rehash(user["password_hash"]):
        upgraded = await run_in_threadpool(hash_password, data.password)
        await db.users.update_one({"_id": user["_id"]}, {"$set": {"password_hash": upgraded}})
    token = create_access_token(user["_id"])
    user_resp = UserResponse(id=user["_id"], name=user["name"], email=user["email"])
    return TokenResponse(access_token=token, user=user_resp)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user
