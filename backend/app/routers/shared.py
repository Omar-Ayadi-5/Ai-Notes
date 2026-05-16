from fastapi import APIRouter, HTTPException

from app.database import get_db
from app.models.schemas import SharedNoteResponse

router = APIRouter(tags=["shared"])


@router.get("/shared/{share_id}", response_model=SharedNoteResponse)
async def get_shared_note(share_id: str):
    db = get_db()
    note = await db.notes.find_one({"share_id": share_id, "is_public": True})
    if not note:
        raise HTTPException(status_code=404, detail="Shared note not found or is private")

    user = await db.users.find_one({"_id": note["user_id"]})
    author_name = user["name"] if user else "Anonymous"

    return SharedNoteResponse(
        note_id=note["_id"],
        title=note.get("title", "Untitled"),
        content=note.get("content", ""),
        tags=note.get("tags", []),
        category=note.get("category", ""),
        summary=note.get("summary"),
        updated_at=note["updated_at"],
        author_name=author_name,
    )
