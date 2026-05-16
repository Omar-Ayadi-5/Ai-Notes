import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app import database
from app.database import close_db, connect_db
from app.routers import auth, notes, shared

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="AI Notes API",
    description="Collaborative AI-powered notes workspace",
    version="1.0.0",
    lifespan=lifespan,
)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(notes.router)
app.include_router(shared.router)


@app.get("/health")
async def health():
    if database.db is None:
        return {"status": "degraded", "database": "disconnected"}
    try:
        await database.db.command("ping")
        return {"status": "ok", "database": "connected"}
    except Exception as exc:
        return {"status": "degraded", "database": str(exc)}
