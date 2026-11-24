import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pymongo.errors import PyMongoError

from app import database
from app.config import settings
from app.database import close_db, connect_db
from app.routers import auth, notes, shared
from app.utils.body_limit import BodyLimitMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    try:
        yield
    finally:
        await close_db()


app = FastAPI(
    title="AI Notes API",
    description="Private notes, revocable sharing, and optional AI analysis",
    version="1.1.0",
    lifespan=lifespan,
)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(BodyLimitMiddleware, max_bytes=settings.max_request_bytes)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["Retry-After"],
)

for router in (auth.router, notes.router, shared.router):
    app.include_router(router, prefix="/api")
    app.include_router(router, include_in_schema=False)


@app.exception_handler(PyMongoError)
async def database_error(request, exc):
    logger.warning("Database operation unavailable (%s)", type(exc).__name__)
    return JSONResponse({"detail": "Database is temporarily unavailable"}, status_code=503)


@app.get("/health", include_in_schema=False)
@app.get("/api/health")
async def health():
    if database.db is None:
        return JSONResponse({"status": "degraded", "database": "disconnected"}, status_code=503)
    try:
        await database.db.command("ping")
        return {"status": "ok", "database": "connected"}
    except PyMongoError:
        return JSONResponse({"status": "degraded", "database": "disconnected"}, status_code=503)


frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
