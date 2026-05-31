import copy
import json
import os
from typing import Any, Dict


DEFAULT_CONFIG = {
    "model": {
        "provider": "Anthropic",
        "api_key": "",
        "base_url": "https://api.anthropic.com",
        "model_name": "claude-sonnet-4-20250514",
    },
    "embedding": {
        "provider": "OpenAI",
        "api_key": "",
        "base_url": "https://api.openai.com/v1",
        "model_name": "text-embedding-3-small",
        "dimensions": 1536,
    },
    "research": {
        "background": "I am a student interested in AI and research.",
        "writing_style": "本科毕业论文风格，表达清晰，避免过度复杂",
    },
    "watch": {
        "enabled": False,
        "folder": "data/watch",
        "auto_delete_after_process": False,
    },
    "analysis": {
        "max_chars": 7000,
        "overlap": 500,
    },
    "knowledge": {
        "enabled": True,
        "chroma_path": "data/chroma",
        "sqlite_path": "data/knowledge.db",
        "auto_index": True,
        "max_context_tokens": 8000,
    },
}


class ConfigManager:
    def __init__(self, config_path: str):
        self.config_path = config_path

    def load(self) -> Dict[str, Any]:
        if not os.path.exists(self.config_path):
            self.save(DEFAULT_CONFIG)
            return copy.deepcopy(DEFAULT_CONFIG)
        with open(self.config_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def save(self, config: Dict[str, Any]) -> None:
        os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
        with open(self.config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, ensure_ascii=False, indent=2)

    def update(self, partial: Dict[str, Any]) -> Dict[str, Any]:
        config = self.load()
        self._deep_merge(config, partial)
        self.save(config)
        return config

    def _deep_merge(self, base: dict, override: dict) -> None:
        for key, value in override.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                self._deep_merge(base[key], value)
            else:
                base[key] = value
