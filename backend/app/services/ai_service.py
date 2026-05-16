import json
import logging
import re

from openai import AsyncOpenAI

from app.config import settings
from app.models.schemas import AIResult

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            base_url=settings.openrouter_base_url,
            api_key=settings.openrouter_api_key_value,
            default_headers={
                "HTTP-Referer": settings.cors_origins.split(",")[0].strip(),
                "X-Title": settings.openrouter_app_name,
            },
        )
    return _client


def _fallback_result(content: str, title: str = "") -> AIResult:
    lines = [l.strip() for l in content.split("\n") if l.strip()]
    preview = " ".join(lines[:3])[:300] if lines else "Empty note."
    actions = []
    for line in lines:
        if re.match(r"^[-*•]\s|^\[\s?[xX ]?\]", line) or line.lower().startswith("todo"):
            actions.append(line.lstrip("-*• ").strip()[:120])
    actions = actions[:5]
    suggested = title or (lines[0][:60] if lines else "Untitled Note")
    return AIResult(summary=preview, action_items=actions, suggested_title=suggested)


def _parse_json_response(raw: str) -> dict:
    raw = (raw or "").strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)
    return json.loads(raw)


async def generate_ai_insights(content: str, title: str = "") -> AIResult:
    if not settings.llm_configured:
        logger.warning("No OpenRouter API key configured; using local fallback")
        return _fallback_result(content, title)

    prompt = f"""Analyze this note and respond with JSON only:
{{"summary": "2-3 sentence summary", "action_items": ["item1", "item2"], "suggested_title": "concise title"}}

Note title: {title or "(none)"}
Note content:
{content[:4000]}"""

    request_kwargs: dict = {
        "model": settings.openrouter_model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You extract summaries, action items, and titles from notes. "
                    "Respond with valid JSON only, no markdown fences."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 500,
    }

    if settings.openrouter_reasoning_enabled:
        request_kwargs["extra_body"] = {"reasoning": {"enabled": True}}

    try:
        client = _get_client()
        response = await client.chat.completions.create(**request_kwargs)
        message = response.choices[0].message
        raw = message.content or ""
        data = _parse_json_response(raw)
        return AIResult(
            summary=data.get("summary", ""),
            action_items=data.get("action_items", [])[:10],
            suggested_title=data.get("suggested_title", title or "Untitled"),
        )
    except Exception as exc:
        logger.exception("OpenRouter request failed: %s", exc)
        return _fallback_result(content, title)
