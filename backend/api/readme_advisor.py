from fastapi import APIRouter
from typing import Optional

from backend.core.config import ConfigManager
from backend.core.providers.factory import create_chat_provider
from backend.agents.readme_advisor import ReadmeAdvisorAgent
from backend.models.schemas import ChatConfig

router = APIRouter(prefix="/api/readme-advisor", tags=["readme-advisor"])

config_manager = ConfigManager("data/config.json")


def _build_provider(chat_config: Optional[ChatConfig] = None):
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


@router.post("/generate")
async def generate_suggestions(body: dict):
    readme = body.get("readme", "")
    document_summary = body.get("document_summary", "")
    reading_card = body.get("reading_card", "")
    chat_config_data = body.get("chat_config")

    if not readme or not document_summary:
        return {"suggestions": []}

    chat_config = ChatConfig(**chat_config_data) if chat_config_data else None
    config = config_manager.load_normalized()
    chat = config.get("chat", {})
    model_name = chat.get("model", "claude-sonnet-4-20250514")
    provider = _build_provider(chat_config)

    agent = ReadmeAdvisorAgent(model_name, provider=provider)
    try:
        suggestions = agent.run(
            readme=readme,
            document_summary=document_summary,
            reading_card=reading_card,
        )
        return {"suggestions": suggestions}
    except Exception:
        return {"suggestions": []}
