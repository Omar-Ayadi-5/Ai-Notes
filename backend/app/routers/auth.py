import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_db
from app.models.schemas import TokenResponse, UserLogin, UserResponse, UserSignup
from app.utils.auth import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
async def signup(data: UserSignup):
    db = get_db()
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user_id = f"USR_{uuid.uuid4().hex[:8].upper()}"
    user_doc = {
        "_id": user_id,
        "name": data.name,
        "email": data.email.lower(),
        "password_hash": hash_password(data.password),
    }
    await db.users.insert_one(user_doc)

    token = create_access_token(user_id)
    user = UserResponse(id=user_id, name=data.name, email=data.email.lower())
    return TokenResponse(access_token=token, user=user)


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    db = get_db()
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(user["_id"])
    user_resp = UserResponse(id=user["_id"], name=user["name"], email=user["email"])
    return TokenResponse(access_token=token, user=user_resp)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user
