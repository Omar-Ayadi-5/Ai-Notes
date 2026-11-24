"""Optional real-MongoDB check; CI supplies a disposable service."""

import os
import uuid

import httpx
import pytest
from motor.motor_asyncio import AsyncIOMotorClient

from app import database
from app.main import app


@pytest.mark.skipif(not os.getenv("MONGODB_TEST_URL"), reason="MONGODB_TEST_URL is not configured")
async def test_real_mongo_auth_notes_sharing_and_indexes(monkeypatch):
    connection = AsyncIOMotorClient(os.environ["MONGODB_TEST_URL"], serverSelectionTimeoutMS=5000)
    database_name = "ai_notes_test_" + uuid.uuid4().hex
    handle = connection[database_name]
    monkeypatch.setattr(database, "db", handle)
    try:
        for keys, options in database.USER_INDEXES:
            await handle.users.create_index(keys, **options)
        for keys, options in database.NOTE_INDEXES:
            await handle.notes.create_index(keys, **options)
        await handle.rate_limits.create_index("expires_at", expireAfterSeconds=0)
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            signup = await client.post(
                "/api/auth/signup",
                json={
                    "name": "Integration",
                    "email": "integration@example.com",
                    "password": "a" * 100,
                },
            )
            assert signup.status_code == 200
            headers = {"Authorization": "Bearer " + signup.json()["access_token"]}
            response = await client.post(
                "/api/notes", headers=headers, json={"title": "[literal]", "content": "- Follow up"}
            )
            assert response.status_code == 201
            root = "/api/notes/" + response.json()["note_id"]
            assert len((await client.get("/api/notes?q=%5B", headers=headers)).json()) == 1
            assert (
                await client.post(root + "/generate-summary", headers=headers)
            ).status_code == 200
            share = (await client.post(root + "/share", headers=headers)).json()["share_id"]
            assert (await client.get("/api/shared/" + share)).status_code == 200
            assert (await client.post(root + "/unshare", headers=headers)).status_code == 200
            assert (await client.get("/api/shared/" + share)).status_code == 404
            assert (await client.get("/api/health")).status_code == 200
        assert (await handle.rate_limits.index_information())["expires_at_1"][
            "expireAfterSeconds"
        ] == 0
    finally:
        assert database_name.startswith("ai_notes_test_")
        await connection.drop_database(database_name)
        connection.close()
