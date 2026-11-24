"""Create a local .env with a generated secret; never overwrite an existing file."""

import secrets
from pathlib import Path

backend = Path(__file__).resolve().parents[1]
target = backend / ".env"
if target.exists():
    print(".env already exists; kept existing configuration.")
else:
    template = (backend / ".env.example").read_text(encoding="utf-8")
    with target.open("x", encoding="utf-8") as handle:
        handle.write(template.replace("SECRET_KEY=\n", f"SECRET_KEY={secrets.token_urlsafe(48)}\n"))
    print("Created backend/.env with a generated signing secret. Keep this file private.")
