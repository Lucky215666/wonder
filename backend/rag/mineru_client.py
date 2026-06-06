from dataclasses import dataclass
from typing import Any, Protocol

from backend.rag.paper_types import PaperDocument
from backend.rag.paper_parser import parse_mineru_markdown


class HttpTransport(Protocol):
    def post(self, url: str, **kwargs: Any) -> Any:
        ...

    def get(self, url: str, **kwargs: Any) -> Any:
        ...


@dataclass(frozen=True)
class MinerUConfig:
    enabled: bool = False
    api_token: str = ""
    preferred_mode: str = "precision"
    model_version: str = "vlm"
    timeout_seconds: int = 120
    poll_interval_seconds: int = 2
    base_url: str = "https://mineru.net"


class MinerUClient:
    def __init__(self, config: MinerUConfig, transport: HttpTransport | None = None):
        self.config = config
        self.transport = transport

    def parse_markdown_result(self, markdown: str, *, precision: bool) -> PaperDocument:
        parser = "mineru_precision" if precision else "mineru_agent"
        return parse_mineru_markdown(markdown, parser=parser)
