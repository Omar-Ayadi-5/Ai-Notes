from datetime import datetime, timezone

import pytest

from app.utils.auth import create_access_token


def create_note(client, headers, **extra):
    response = client.post(
        "/api/notes",
        headers=headers,
        json={"title": "A [literal] title", "content": "- Follow up", **extra},
    )
    assert response.status_code == 201, response.text
    return response.json()


async def test_note_ownership_for_every_private_action(client, db, headers):
    note = create_note(client, headers)
    await db.users.insert_one({"_id": "other", "name": "Other", "email": "other@example.com"})
    other = {"Authorization": "Bearer " + create_access_token("other")}
    root = "/api/notes/" + note["note_id"]
    for method, path, body in [
        ("get", root, None),
        ("patch", root, {"content": "changed"}),
        ("delete", root, None),
        ("post", root + "/share", None),
        ("post", root + "/unshare", None),
        ("post", root + "/generate-summary", None),
    ]:
        kwargs = {"headers": other}
        if body is not None:
            kwargs["json"] = body
        assert getattr(client, method)(path, **kwargs).status_code == 404


def test_revoked_share_urls_stay_revoked_after_resharing(client, headers):
    root = "/api/notes/" + create_note(client, headers)["note_id"]
    old_id = client.post(root + "/share", headers=headers).json()["share_id"]
    assert client.get("/api/shared/" + old_id).status_code == 200
    assert client.post(root + "/unshare", headers=headers).status_code == 200
    new_id = client.post(root + "/share", headers=headers).json()["share_id"]
    assert old_id != new_id
    assert client.get("/api/shared/" + old_id).status_code == 404
    assert client.get("/api/shared/" + new_id).status_code == 200


def test_search_is_literal_and_paginated(client, headers):
    create_note(client, headers)
    create_note(client, headers, title="A normal title")
    response = client.get("/api/notes", headers=headers, params={"q": "["})
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert len(client.get("/api/notes?limit=1&offset=1", headers=headers).json()) == 1
    assert client.get("/api/notes?limit=201", headers=headers).status_code == 422


@pytest.mark.parametrize(
    "body",
    [{"content": "x" * 50001}, {"title": "x" * 201}, {"tags": ["x"] * 31}, {"category": "x" * 61}],
)
def test_note_validation_limits(client, headers, body):
    assert client.post("/api/notes", headers=headers, json=body).status_code == 422


def test_ai_fallback_and_edit_invalidation(client, headers):
    root = "/api/notes/" + create_note(client, headers)["note_id"]
    result = client.post(root + "/generate-summary", headers=headers)
    assert result.status_code == 200
    assert result.json()["action_items"] == ["Follow up"]
    assert (
        client.patch(root, headers=headers, json={"content": "A new version"}).json()["summary"]
        is None
    )


async def test_ai_does_not_write_results_for_an_outdated_note(client, headers, db, monkeypatch):
    from app.models.schemas import AIResult

    note = create_note(client, headers)

    async def delayed_result(*args):
        await db.notes.update_one(
            {"_id": note["note_id"]}, {"$set": {"content": "Changed during analysis"}}
        )
        return AIResult(summary="stale", action_items=[], suggested_title="stale")

    monkeypatch.setattr("app.routers.notes.generate_ai_insights", delayed_result)
    response = client.post("/api/notes/" + note["note_id"] + "/generate-summary", headers=headers)
    assert response.status_code == 409
    assert (await db.notes.find_one({"_id": note["note_id"]}))["summary"] is None


async def test_insights_count_beyond_one_thousand(client, headers, db):
    now = datetime.now(timezone.utc)
    await db.notes.insert_many(
        [
            {
                "_id": str(i),
                "user_id": "owner",
                "archived": False,
                "tags": [],
                "category": "",
                "created_at": now,
                "updated_at": now,
            }
            for i in range(1005)
        ]
    )
    response = client.get("/api/notes/insights", headers=headers)
    assert response.status_code == 200
    assert response.json()["total_notes"] == 1005
    assert len(response.json()["recent_activity"]) == 5
