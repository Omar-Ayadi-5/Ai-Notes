from pathlib import Path

from pydantic import AliasChoices, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "ai_notes"
    secret_key: SecretStr = Field(default="dev-secret-change-in-production")
    cors_origins: str = "http://localhost:5173"
    access_token_expire_minutes: int = 60 * 24 
    mongodb_server_selection_timeout_ms: int = 15000
    # If true, API won't start when MongoDB is unreachable (set false only for local dev)
    mongodb_required: bool = True

    # OpenRouter (also accepts legacy OPENAI_API_KEY in .env)
    openrouter_api_key: SecretStr = Field(
        default="",
        validation_alias=AliasChoices("OPENROUTER_API_KEY", "OPENAI_API_KEY"),
    )
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "openai/gpt-oss-120b:free"
    openrouter_reasoning_enabled: bool = False
    openrouter_app_name: str = "AI Notes"

    @field_validator("mongodb_url", mode="before")
    @classmethod
    def normalize_mongodb_url(cls, v: str) -> str:
        if not isinstance(v, str):
            return v
        url = v.strip().rstrip("/")
        if url.startswith("mongodb+srv://") and "retryWrites" not in url:
            sep = "&" if "?" in url else "?"
            url = f"{url}{sep}retryWrites=true&w=majority"
        return url

    @property
    def llm_configured(self) -> bool:
        return bool(self.openrouter_api_key_value.strip())

    @property
    def openrouter_api_key_value(self) -> str:
        return self.openrouter_api_key.get_secret_value()

    @property
    def secret_key_value(self) -> str:
        return self.secret_key.get_secret_value()

    @property
    def uses_atlas(self) -> bool:
        return "mongodb+srv://" in self.mongodb_url or "mongodb.net" in self.mongodb_url


settings = Settings()
