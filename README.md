# AI Notes

AI Notes is a full-stack notes workspace for writing, organizing, analyzing, and sharing personal notes. It combines a React workspace with a FastAPI backend, MongoDB persistence, JWT authentication, public share links, productivity insights, and optional OpenRouter-powered AI summaries.

The app is designed as a practical productivity tool rather than a demo landing page: users sign up, create notes, edit them in a focused workspace, add tags and categories, archive old notes, generate summaries and action items, and share selected notes through public read-only links.

## What It Does

- User accounts with signup, login, JWT sessions, and bcrypt password hashing
- Private note management with create, edit, delete, archive, tags, and categories
- Search and filtering by keyword, tag, category, archive state, and sort order
- AI analysis for summaries, action items, and suggested titles
- Local fallback AI behavior when no OpenRouter API key is configured
- Public note sharing through generated share links
- Insights dashboard with total notes, archived notes, weekly activity, top tags, categories, and recent activity
- React frontend served by Vite with API proxying to the backend

## Tech Stack

**Frontend**

- React
- React Router
- Tailwind CSS
- Lucide React icons
- Vite

**Backend**

- FastAPI
- MongoDB with Motor/PyMongo
- Pydantic settings
- JWT auth with python-jose
- Passlib/bcrypt password hashing
- OpenRouter-compatible OpenAI client for AI features

## Project Structure

```text
Ai_notes/
+-- backend/
|   +-- app/
|   |   +-- main.py              # FastAPI app setup, CORS, router registration
|   |   +-- config.py            # Environment-based settings
|   |   +-- database.py          # MongoDB connection and indexes
|   |   +-- routers/
|   |   |   +-- auth.py          # Signup, login, current user
|   |   |   +-- notes.py         # Notes CRUD, sharing, insights, AI summary
|   |   |   +-- shared.py        # Public shared notes
|   |   +-- models/
|   |   |   +-- schemas.py       # Pydantic request/response models
|   |   +-- services/
|   |   |   +-- ai_service.py    # OpenRouter AI integration and fallback
|   |   +-- utils/
|   |       +-- auth.py          # Password hashing and JWT helpers
|   +-- .env.example
|   +-- requirements.txt
+-- frontend/
    +-- src/
    |   +-- api/                 # API client
    |   +-- components/          # Editor, insights, route guards
    |   +-- context/             # Auth state
    |   +-- hooks/               # Shared hooks
    |   +-- pages/               # Login, signup, workspace, shared note
    +-- package.json
    +-- vite.config.js
```

## Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB running locally, or a MongoDB Atlas connection string
- Optional: OpenRouter API key for full AI summaries

## Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

On macOS/Linux, activate the virtual environment with:

```bash
source venv/bin/activate
```

Backend API docs:

```text
http://localhost:8000/docs
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend app:

```text
http://localhost:5173
```

The Vite dev server proxies `/api` requests to `http://localhost:8000`.

## Environment Variables

Create `backend/.env` from `backend/.env.example`.

| Variable | Purpose |
| --- | --- |
| `MONGODB_URL` | MongoDB connection string |
| `DATABASE_NAME` | MongoDB database name, defaults to `ai_notes` |
| `MONGODB_REQUIRED` | Whether the API should fail startup if MongoDB is unavailable |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | MongoDB connection timeout |
| `SECRET_KEY` | JWT signing secret |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT lifetime |
| `OPENROUTER_API_KEY` | Optional API key for AI note analysis |
| `OPENROUTER_BASE_URL` | OpenRouter-compatible API base URL |
| `OPENROUTER_MODEL` | Model used for summaries and action items |
| `OPENROUTER_REASONING_ENABLED` | Enables reasoning options for compatible models |
| `OPENROUTER_APP_NAME` | App name sent in OpenRouter headers |

Frontend configuration is optional:

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | API base URL. Defaults to `/api` for the Vite proxy |

Sensitive values should stay in `.env`. The repository ignores `backend/.env`.

## API Overview

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/auth/signup` | Register a user and return a JWT |
| `POST` | `/auth/login` | Log in and return a JWT |
| `GET` | `/auth/me` | Get the current authenticated user |
| `GET` | `/notes` | List notes with search/filter/sort options |
| `POST` | `/notes` | Create a note |
| `GET` | `/notes/{note_id}` | Get one note |
| `PATCH` | `/notes/{note_id}` | Update note fields |
| `DELETE` | `/notes/{note_id}` | Delete a note |
| `POST` | `/notes/{note_id}/generate-summary` | Generate AI summary/action items |
| `POST` | `/notes/{note_id}/share` | Enable public sharing |
| `POST` | `/notes/{note_id}/unshare` | Disable public sharing |
| `GET` | `/notes/insights` | Get productivity insights |
| `GET` | `/shared/{share_id}` | Read a public shared note |
| `GET` | `/health` | Check API and database health |

Authenticated endpoints require:

```text
Authorization: Bearer <token>
```

## AI Behavior

AI analysis uses OpenRouter through the OpenAI-compatible client. When `OPENROUTER_API_KEY` is set, the backend asks the configured model to return a JSON summary, action items, and suggested title.

When no API key is configured, the app still works. It falls back to a lightweight local summary based on the note text and extracts simple action items from bullet/todo-style lines.

## Development Notes

- Run the backend from `backend/` so imports and reload behavior stay simple.
- Keep real secrets in `backend/.env`; use `backend/.env.example` only as a template.
- MongoDB indexes are created on backend startup.
- The frontend API client defaults to `/api`, which Vite rewrites to the backend during development.
