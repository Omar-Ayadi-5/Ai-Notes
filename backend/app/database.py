import logging

import certifi
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import OperationFailure, ServerSelectionTimeoutError

from app.config import settings

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient | None = None
db: AsyncIOMotorDatabase | None = None

USER_INDEXES = [
    (["email"], {"unique": True, "name": "idx_users_email_unique"}),
]
NOTE_INDEXES = [
    (["user_id"], {"name": "idx_notes_user_id"}),
    (
        ["share_id"],
        {
            "unique": True,
            "name": "idx_notes_share_id_unique_sparse",
            "partialFilterExpression": {"share_id": {"$type": "string"}},
        },
    ),
    (
        [("user_id", 1), ("updated_at", -1)],
        {"name": "idx_notes_user_updated"},
    ),
]


def _client_kwargs() -> dict:
    """Motor/PyMongo options for reliable Atlas TLS (incl. Python 3.13+ on Windows)."""
    timeout = (
        5000
        if not settings.mongodb_required
        else settings.mongodb_server_selection_timeout_ms
    )
    kwargs: dict = {
        "serverSelectionTimeoutMS": timeout,
        "connectTimeoutMS": timeout,
        "retryWrites": True,
    }
    if settings.uses_atlas:
        # mongodb+srv enables TLS automatically — do not pass tls=True (can break handshake)
        kwargs["tlsCAFile"] = certifi.where()
        kwargs["tlsDisableOCSPEndpointCheck"] = True
    return kwargs


async def _create_index_safe(collection, keys, options: dict) -> None:
    try:
        await collection.create_index(keys, **options)
    except OperationFailure as exc:
        if exc.code in (85, 86):
            index_name = options.get("name")
            existing = await collection.index_information()
            existing_options = existing.get(index_name or "")
            desired_partial = options.get("partialFilterExpression")
            existing_partial = (
                existing_options.get("partialFilterExpression")
                if existing_options
                else None
            )
            if index_name and desired_partial and existing_partial != desired_partial:
                logger.info(
                    "Recreating index %s on %s with partial filter",
                    index_name,
                    collection.name,
                )
                await collection.drop_index(index_name)
                await collection.create_index(keys, **options)
                return

            logger.debug(
                "Index already exists on %s: %s",
                collection.name,
                index_name,
            )
            return
        raise


async def connect_db() -> None:
    global client, db
    if not settings.mongodb_url:
        raise RuntimeError("MONGODB_URL is not set in .env")

    client = AsyncIOMotorClient(settings.mongodb_url, **_client_kwargs())
    db = client[settings.database_name]

    try:
        await db.command("ping")
    except ServerSelectionTimeoutError as exc:
        client.close()
        client = None
        db = None
        msg = (
            "Cannot reach MongoDB. Check MONGODB_URL, Atlas Network Access (allow your IP or "
            "0.0.0.0/0 for dev), and cluster status. On Python 3.14 + Windows, SSL issues are "
            "common — try Python 3.12 or local MongoDB (mongodb://localhost:27017). "
            f"Details: {exc}"
        )
        if settings.mongodb_required:
            raise RuntimeError(msg) from exc
        logger.warning("%s Starting without database (MONGODB_REQUIRED=false).", msg)
        return

    logger.info("Connected to MongoDB database: %s", settings.database_name)

    for keys, opts in USER_INDEXES:
        await _create_index_safe(db.users, keys, opts)
    for keys, opts in NOTE_INDEXES:
        await _create_index_safe(db.notes, keys, opts)


async def close_db() -> None:
    global client, db
    if client:
        client.close()
        client = None
        db = None


def get_db() -> AsyncIOMotorDatabase:
    if db is None:
        raise RuntimeError("Database not initialized")
    return db
