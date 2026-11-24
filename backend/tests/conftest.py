import os
import secrets
import sys
from pathlib import Path

os.environ["SECRET_KEY"] = secrets.token_urlsafe(48)
os.environ["OPENROUTER_API_KEY"] = ""
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

from app import database
from app.main import app
from app.utils.auth import create_access_token


@pytest.fixture
def db(monkeypatch):
    handle = AsyncMongoMockClient()["ai_notes_test"]
    monkeypatch.setattr(database, "db", handle)
    return handle


@pytest.fixture
def client(db):
    # No lifespan: these isolated route tests must never connect to an external DB.
    instance = TestClient(app, raise_server_exceptions=False)
    yield instance
    instance.close()


@pytest.fixture
async def headers(db):
    await db.users.insert_one({"_id": "owner", "name": "Reviewer", "email": "reviewer@example.com"})
    return {"Authorization": "Bearer " + create_access_token("owner")}
