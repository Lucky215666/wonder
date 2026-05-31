from abc import ABC, abstractmethod
from backend.core.llm_client import call_anthropic_llm


class BaseAgent(ABC):
    def __init__(self, model: str, api_key: str, base_url: str):
        self.model = model
        self.api_key = api_key
        self.base_url = base_url

    def call_llm(self, system_prompt: str, user_prompt: str, temperature: float = 0.2, max_tokens: int = 3000) -> str:
        return call_anthropic_llm(
            api_key=self.api_key,
            base_url=self.base_url,
            model=self.model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    @abstractmethod
    def run(self, **kwargs) -> str:
        pass
