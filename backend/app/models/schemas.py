from datetime import datetime
from typing import Annotated, Optional

from pydantic import BaseModel, EmailStr, Field, StringConstraints

Tag = Annotated[str, StringConstraints(max_length=50)]


# Auth
class UserSignup(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


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
    title: str = Field(default="", max_length=200)
    content: str = Field(default="", max_length=50000)
    tags: list[Tag] = Field(default_factory=list, max_length=30)
    category: str = Field(default="", max_length=60)


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    content: Optional[str] = Field(default=None, max_length=50000)
    tags: Optional[list[Tag]] = Field(default=None, max_length=30)
    category: Optional[str] = Field(default=None, max_length=60)
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
