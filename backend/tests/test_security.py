from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
import pytest
from pydantic import ValidationError
from pymongo.errors import OperationFailure

from app.config import Settings, settings
from app.utils.auth import hash_password, verify_password


def test_signing_secret_is_required_and_placeholders_are_rejected(monkeypatch):
    monkeypatch.delenv("SECRET_KEY")
    for kwargs in (
        {},
        {"secret_key": "short"},
        {"secret_key": "replace-with-a-long-random-secret"},
    ):
        with pytest.raises(ValidationError):
            Settings(_env_file=None, **kwargs)


def test_long_password_suffixes_are_distinct():
    hashed = hash_password("a" * 72 + "first")
    assert hashed.startswith("$argon2")
    assert verify_password("a" * 72 + "first", hashed)
    assert not verify_password("a" * 72 + "second", hashed)


def test_legacy_bcrypt_never_truncates_input():
    hashed = bcrypt.hashpw(b"a" * 72, bcrypt.gensalt(rounds=4)).decode()
    assert verify_password("a" * 72, hashed)
    assert not verify_password("a" * 72 + "suffix", hashed)


@pytest.mark.parametrize(
    "payload,algorithm",
    [
        ({"sub": "owner"}, "HS256"),
        ({"sub": "owner", "exp": datetime.now(timezone.utc) - timedelta(seconds=1)}, "HS256"),
        ({"sub": "owner", "exp": datetime.now(timezone.utc) + timedelta(minutes=1)}, "HS384"),
    ],
)
def test_invalid_token_claims_and_algorithms(client, headers, payload, algorithm):
    token = jwt.encode(payload, settings.secret_key_value, algorithm=algorithm)
    response = client.get("/api/notes", headers={"Authorization": "Bearer " + token})
    assert response.status_code == 401


def test_login_throttles_even_with_spoofed_forwarding_headers(client, monkeypatch):
    monkeypatch.setattr("app.routers.auth.verify_password", lambda *_: False)
    for attempt in range(15):
        response = client.post(
            "/api/auth/login",
            json={"email": "missing@example.com", "password": "incorrect"},
            headers={"X-Forwarded-For": str(attempt)},
        )
        assert response.status_code == 401
    response = client.post(
        "/auth/login", json={"email": "missing@example.com", "password": "incorrect"}
    )
    assert response.status_code == 429
    assert int(response.headers["Retry-After"]) >= 1


def test_request_size_limit_precedes_route_writes(client):
    response = client.post("/api/auth/signup", content=iter([b"x" * 150000, b"x" * 150000]))
    assert response.status_code == 413


async def test_signup_and_legacy_hash_upgrade(client, db):
    response = client.post(
        "/api/auth/signup",
        json={"name": "New User", "email": "new@example.com", "password": "a" * 100},
    )
    assert response.status_code == 200
    assert (await db.users.find_one({"email": "new@example.com"}))["password_hash"].startswith(
        "$argon2"
    )
    legacy = bcrypt.hashpw(b"legacy-example", bcrypt.gensalt(rounds=4)).decode()
    await db.users.insert_one(
        {"_id": "legacy", "name": "Legacy", "email": "legacy@example.com", "password_hash": legacy}
    )
    assert (
        client.post(
            "/api/auth/login", json={"email": "legacy@example.com", "password": "legacy-example"}
        ).status_code
        == 200
    )
    assert (await db.users.find_one({"_id": "legacy"}))["password_hash"].startswith("$argon2")


def test_health_does_not_disclose_database_errors(client, db, monkeypatch):
    async def broken(*args):
        raise OperationFailure("private infrastructure information")

    monkeypatch.setattr(db, "command", broken)
    response = client.get("/api/health")
    assert response.status_code == 503
    assert "private" not in response.text
    assert response.json()["database"] == "disconnected"
