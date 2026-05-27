from abc import ABC, abstractmethod
from typing import Any

from backend.core.llm_client import call_llm


class BaseAgent(ABC):
    def __init__(self, client: Any, model: str, api_type: str = "openai", api_key: str = "", base_url: str = ""):
        self.client = client
        self.model = model
        self.api_type = api_type
        self.api_key = api_key
        self.base_url = base_url

    def call_llm(self, system_prompt: str, user_prompt: str, temperature: float = 0.2, max_tokens: int = 3000) -> str:
        return call_llm(
            client=self.client,
            model=self.model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
            api_type=self.api_type,
            api_key=self.api_key,
            base_url=self.base_url,
        )

    @abstractmethod
    def run(self, **kwargs) -> str:
        pass
