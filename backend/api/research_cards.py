"""Research card API: draft endpoint for generating structured cards from QA exchanges."""
import os
from typing import Optional

from fastapi import APIRouter, HTTPException

from backend.core.config import ConfigManager
from backend.core.embedding import EmbeddingClient
from backend.core.providers.factory import create_chat_provider
from backend.agents.research_card import ResearchCardDraftAgent, normalize_source_refs
from backend.api.knowledge import get_storage_and_embedding, _build_embedding_provider
from backend.rag.indexer import build_collection_name
from backend.rag.research_card_indexer import ResearchCardIndexer
from backend.models.schemas import (
    ChatConfig,
    NormalizedEmbeddingConfig,
    ResearchCardDraftRequest,
    ResearchCardDraftResponse,
    ResearchCardIndexRequest,
    ResearchCardIndexResponse,
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


@router.post("/index", response_model=ResearchCardIndexResponse)
async def index_research_card(request: ResearchCardIndexRequest):
    storage, default_embedding = get_storage_and_embedding()
    if request.embedding_config is not None:
        provider = _build_embedding_provider(request.embedding_config)
        embedding = EmbeddingClient(
            provider=provider,
            model_name=request.embedding_config.model,
            dimensions=request.embedding_config.dimensions,
        )
        provider_name = request.embedding_config.provider
        model = request.embedding_config.model
        dimensions = request.embedding_config.dimensions
    else:
        embedding = default_embedding
        norm = config_manager.load_normalized()
        emb = norm.get("embedding", {})
        provider_name = emb.get("provider", "openai_compatible")
        model = emb.get("model", "text-embedding-3-small")
        dimensions = emb.get("dimensions", 1536)
    collection_name = build_collection_name(provider_name, model, dimensions)
    indexer = ResearchCardIndexer(storage, embedding)
    indexer.index_card(
        card_id=request.card_id,
        knowledge_base_id=request.knowledge_base_id,
        question=request.question,
        core_claims=request.core_claims,
        knowledge_type=request.knowledge_type,
        tags=request.tags,
        sub_direction=request.sub_direction,
        use_cases=request.use_cases,
        linked_doc_ids=request.linked_doc_ids,
        validation_notes=request.validation_notes,
        collection_name=collection_name,
    )
    return ResearchCardIndexResponse(card_id=request.card_id, message="Research card indexed successfully")
