from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# Auth
class UserSignup(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# Notes
class NoteCreate(BaseModel):
    title: str = ""
    content: str = ""
    tags: list[str] = []
    category: str = ""


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[list[str]] = None
    category: Optional[str] = None
    archived: Optional[bool] = None


class NoteResponse(BaseModel):
    note_id: str
    title: str
    content: str
    tags: list[str]
    category: str
    archived: bool
    is_public: bool
    share_id: Optional[str] = None
    summary: Optional[str] = None
    action_items: list[str] = []
    updated_at: datetime
    created_at: datetime


class SharedNoteResponse(BaseModel):
    note_id: str
    title: str
    content: str
    tags: list[str]
    category: str
    summary: Optional[str] = None
    updated_at: datetime
    author_name: str


class AIResult(BaseModel):
    summary: str
    action_items: list[str]
    suggested_title: str


class InsightsResponse(BaseModel):
    total_notes: int
    archived_notes: int
    notes_this_week: int
    top_tags: list[dict]
    notes_by_category: list[dict]
    recent_activity: list[dict]
