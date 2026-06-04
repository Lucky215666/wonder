"""Research card API: draft endpoint for generating structured cards from QA exchanges."""
import os
from typing import Optional

from fastapi import APIRouter, HTTPException

from backend.core.config import ConfigManager
from backend.core.providers.factory import create_chat_provider
from backend.agents.research_card import ResearchCardDraftAgent
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

    try:
        config = config_manager.load_normalized()
        chat = config.get("chat", {})
        model_name = chat.get("model", "claude-sonnet-4-20250514")

        provider = _build_provider()
        agent = ResearchCardDraftAgent(model_name, provider=provider)

        # Convert source refs to dicts for the agent
        source_ref_dicts = [ref.model_dump() for ref in request.source_refs]

        result = agent.run(
            question=request.question,
            answer=request.answer,
            answer_mode=request.answer_mode,
            source_refs=source_ref_dicts,
        )

        # Build evidence refs as ResearchCardSourceRef objects
        evidence_refs = []
        for ref in result.get("evidence_refs", []):
            if isinstance(ref, dict):
                evidence_refs.append(ResearchCardSourceRef(**{
                    k: v for k, v in ref.items()
                    if k in ResearchCardSourceRef.model_fields
                }))

        return ResearchCardDraftResponse(
            question=result["question"],
            core_claims=result["core_claims"],
            knowledge_type=result["knowledge_type"],
            tags=result.get("tags", []),
            sub_direction=result.get("sub_direction", ""),
            validation_notes=result.get("validation_notes", ""),
            use_cases=result.get("use_cases", []),
            linked_doc_ids=result.get("linked_doc_ids", []),
            no_paper_evidence=result.get("no_paper_evidence", False),
            evidence_refs=evidence_refs,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
