import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import get_db
from app.models.schemas import (
    AIResult,
    InsightsResponse,
    NoteCreate,
    NoteResponse,
    NoteUpdate,
    UserResponse,
)
from app.services.ai_service import generate_ai_insights
from app.utils.auth import get_current_user

router = APIRouter(prefix="/notes", tags=["notes"])


def _note_to_response(doc: dict) -> NoteResponse:
    return NoteResponse(
        note_id=doc["_id"],
        title=doc.get("title", ""),
        content=doc.get("content", ""),
        tags=doc.get("tags", []),
        category=doc.get("category", ""),
        archived=doc.get("archived", False),
        is_public=doc.get("is_public", False),
        share_id=doc.get("share_id"),
        summary=doc.get("summary"),
        action_items=doc.get("action_items", []),
        updated_at=doc["updated_at"],
        created_at=doc["created_at"],
    )


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


@router.get("/", response_model=list[NoteResponse], include_in_schema=False)
@router.get("", response_model=list[NoteResponse])
async def list_notes(
    q: Optional[str] = Query(None, description="Keyword search"),
    tag: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    archived: Optional[bool] = Query(False),
    sort: str = Query("updated_at", pattern="^(updated_at|created_at|title)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: UserResponse = Depends(get_current_user),
):
    db = get_db()
    query: dict = {"user_id": current_user.id, "archived": archived}

    if tag:
        query["tags"] = tag.lower()
    if category:
        query["category"] = category.lower()
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"content": {"$regex": q, "$options": "i"}},
            {"tags": {"$regex": q, "$options": "i"}},
        ]

    sort_dir = -1 if order == "desc" else 1
    cursor = db.notes.find(query).sort(sort, sort_dir)
    notes = await cursor.to_list(length=500)
    return [_note_to_response(n) for n in notes]


@router.post(
    "/",
    response_model=NoteResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    data: NoteCreate,
    current_user: UserResponse = Depends(get_current_user),
):
    db = get_db()
    now = datetime.now(timezone.utc)
    note_id = f"NOTE_{uuid.uuid4().hex[:8].upper()}"
    doc = {
        "_id": note_id,
        "user_id": current_user.id,
        "title": data.title,
        "content": data.content,
        "tags": [t.lower().strip() for t in data.tags if t.strip()],
        "category": data.category.lower().strip() if data.category else "",
        "archived": False,
        "is_public": False,
        "summary": None,
        "action_items": [],
        "created_at": now,
        "updated_at": now,
    }
    await db.notes.insert_one(doc)
    return _note_to_response(doc)


@router.get("/insights", response_model=InsightsResponse)
async def get_insights(current_user: UserResponse = Depends(get_current_user)):
    db = get_db()
    user_id = current_user.id
    all_notes = await db.notes.find({"user_id": user_id}).to_list(length=1000)

    now = datetime.now(timezone.utc)
    week_ago = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = week_ago - timedelta(days=7)

    tag_counts: dict[str, int] = {}
    category_counts: dict[str, int] = {}
    notes_this_week = 0
    archived_count = 0

    for n in all_notes:
        if n.get("archived"):
            archived_count += 1
        created = _as_utc(n.get("created_at"))
        if created and created >= week_ago:
            notes_this_week += 1
        for t in n.get("tags", []):
            tag_counts[t] = tag_counts.get(t, 0) + 1
        cat = n.get("category", "") or "uncategorized"
        category_counts[cat] = category_counts.get(cat, 0) + 1

    top_tags = sorted(
        [{"tag": k, "count": v} for k, v in tag_counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:8]

    notes_by_category = sorted(
        [{"category": k, "count": v} for k, v in category_counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )

    recent = sorted(
        all_notes,
        key=lambda x: _as_utc(x.get("updated_at")) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )[:5]
    recent_activity = [
        {
            "note_id": n["_id"],
            "title": n.get("title", "Untitled"),
            "updated_at": (
                _as_utc(n.get("updated_at")) or datetime.min.replace(tzinfo=timezone.utc)
            ).isoformat(),
        }
        for n in recent
    ]

    return InsightsResponse(
        total_notes=len(all_notes),
        archived_notes=archived_count,
        notes_this_week=notes_this_week,
        top_tags=top_tags,
        notes_by_category=notes_by_category,
        recent_activity=recent_activity,
    )


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    db = get_db()
    note = await db.notes.find_one({"_id": note_id, "user_id": current_user.id})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return _note_to_response(note)


@router.patch("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str,
    data: NoteUpdate,
    current_user: UserResponse = Depends(get_current_user),
):
    db = get_db()
    note = await db.notes.find_one({"_id": note_id, "user_id": current_user.id})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    update: dict = {"updated_at": datetime.now(timezone.utc)}
    if data.title is not None:
        update["title"] = data.title
    if data.content is not None:
        update["content"] = data.content
    if data.tags is not None:
        update["tags"] = [t.lower().strip() for t in data.tags if t.strip()]
    if data.category is not None:
        update["category"] = data.category.lower().strip()
    if data.archived is not None:
        update["archived"] = data.archived

    await db.notes.update_one({"_id": note_id}, {"$set": update})
    updated = await db.notes.find_one({"_id": note_id})
    return _note_to_response(updated)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    db = get_db()
    result = await db.notes.delete_one({"_id": note_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")


@router.post("/{note_id}/generate-summary", response_model=AIResult)
async def generate_summary(
    note_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    db = get_db()
    note = await db.notes.find_one({"_id": note_id, "user_id": current_user.id})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    result = await generate_ai_insights(note.get("content", ""), note.get("title", ""))

    await db.notes.update_one(
        {"_id": note_id},
        {
            "$set": {
                "summary": result.summary,
                "action_items": result.action_items,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    return result


@router.post("/{note_id}/share", response_model=NoteResponse)
async def share_note(
    note_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    db = get_db()
    note = await db.notes.find_one({"_id": note_id, "user_id": current_user.id})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    share_id = note.get("share_id") or uuid.uuid4().hex[:12]
    await db.notes.update_one(
        {"_id": note_id},
        {"$set": {"is_public": True, "share_id": share_id}},
    )
    updated = await db.notes.find_one({"_id": note_id})
    return _note_to_response(updated)


@router.post("/{note_id}/unshare", response_model=NoteResponse)
async def unshare_note(
    note_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    db = get_db()
    note = await db.notes.find_one({"_id": note_id, "user_id": current_user.id})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    await db.notes.update_one(
        {"_id": note_id},
        {"$set": {"is_public": False}},
    )
    updated = await db.notes.find_one({"_id": note_id})
    return _note_to_response(updated)
