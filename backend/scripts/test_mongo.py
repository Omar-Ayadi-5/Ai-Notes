"""Test MongoDB connectivity. Run: python scripts/test_mongo.py (from backend/)"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import database
from app.config import settings


async def main():
    print(f"Python: {sys.version.split()[0]}")
    print(f"DB:  {settings.database_name}")
    try:
        await database.connect_db()
        if database.db is None:
            print("WARN: Connected with MONGODB_REQUIRED=false (no active db handle)")
            return 1
        users = await database.db.users.count_documents({})
        notes = await database.db.notes.count_documents({})
        print(f"OK — users: {users}, notes: {notes}")
        return 0
    except Exception as exc:
        print(f"FAIL — database unavailable ({type(exc).__name__})")
        return 1
    finally:
        await database.close_db()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
