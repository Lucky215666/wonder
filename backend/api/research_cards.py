"""Research card API: draft endpoint for generating structured cards from QA exchanges."""
import os
from typing import Optional

from fastapi import APIRouter, HTTPException

from backend.core.config import ConfigManager
from backend.core.providers.factory import create_chat_provider
from backend.agents.research_card import ResearchCardDraftAgent, normalize_source_refs
from backend.models.schemas import (
    ChatConfig,
    ResearchCardDraftRequest,
    ResearchCardDraftResponse,
    ResearchCardSourceRef,
)

router = APIRouter(prefix="/api/research-cards", tags=["research-cards"])

_config_path = os.environ.get("NOTE_FORGE_CONFIG_PATH", "data/config.json")
config_manager = ConfigManager(_config_path)


def _build_provider(chat_config: Optional[ChatConfig] = None):
    """Build a ChatProvider from normalized config or explicit chat_config."""
    if chat_config is not None:
        return create_chat_provider({
            "provider": chat_config.provider,
            "api_key": chat_config.api_key,
            "base_url": chat_config.base_url,
            "model": chat_config.model,
        })
    config = config_manager.load_normalized()
    chat = config.get("chat", {})
    return create_chat_provider({
        "provider": chat.get("provider", "openai_compatible"),
        "api_key": chat.get("apiKey", ""),
        "base_url": chat.get("baseUrl", "https://api.anthropic.com"),
        "model": chat.get("model", "claude-sonnet-4-20250514"),
    })


@router.post("/draft", response_model=ResearchCardDraftResponse)
async def draft_research_card(request: ResearchCardDraftRequest):
    """Generate a structured research card draft from a QA question+answer.

    The Node backend calls this after the user asks to save a QA answer as a card.
    """
    if not request.question.strip() and not request.answer.strip():
        raise HTTPException(
            status_code=400,
            detail="At least one of question or answer must be non-empty.",
        )

    config = config_manager.load_normalized()
    chat = config.get("chat", {})
    provider = _build_provider()
    agent = ResearchCardDraftAgent(
        chat.get("model", "claude-sonnet-4-20250514"),
        provider=provider,
    )

    try:
        data = agent.run(
            question=request.question,
            answer=request.answer,
            answer_mode=request.answer_mode,
            source_refs=request.source_refs,
        )
    except Exception:
        data = agent.build_fallback(
            request.question,
            request.answer,
            request.answer_mode,
            normalize_source_refs(request.source_refs),
        )
    return ResearchCardDraftResponse(**data)
