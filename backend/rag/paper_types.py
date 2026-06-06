from dataclasses import dataclass, field
from typing import Literal

ParserName = Literal["mineru_precision", "mineru_agent", "pypdf"]


@dataclass(frozen=True)
class PaperPage:
    page_number: int
    text: str


@dataclass(frozen=True)
class PaperBlock:
    text: str
    page_start: int
    page_end: int
    block_type: str = "paragraph"
    section_type: str = "unknown"
    section_title: str = ""
    is_reference: bool = False


@dataclass(frozen=True)
class PaperDocument:
    title: str | None
    authors: list[str]
    abstract: str | None
    pages: list[PaperPage]
    blocks: list[PaperBlock]
    raw_markdown: str
    parser: ParserName


@dataclass(frozen=True)
class PaperChunk:
    chunk_id: str
    text: str
    chunk_index: int
    section_type: str
    section_title: str
    page_start: int
    page_end: int
    is_reference: bool = False
    prev_chunk_id: str | None = None
    next_chunk_id: str | None = None
    block_types: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class RetrievalCandidate:
    doc_id: str
    file_name: str
    content: str
    metadata: dict
    dense_score: float
    lexical_score: float = 0.0
    section_intent_score: float = 0.0
    metadata_score: float = 0.0
    neighbor_bonus: float = 0.0

    @property
    def final_score(self) -> float:
        return (
            0.55 * self.dense_score
            + 0.20 * self.lexical_score
            + 0.15 * self.section_intent_score
            + 0.05 * self.metadata_score
            + 0.05 * self.neighbor_bonus
        )


def chroma_safe_metadata(chunk: PaperChunk) -> dict:
    return {
        "chunk_id": chunk.chunk_id,
        "chunk_index": chunk.chunk_index,
        "section_type": chunk.section_type,
        "section_title": chunk.section_title,
        "page_start": chunk.page_start,
        "page_end": chunk.page_end,
        "is_reference": chunk.is_reference,
        "prev_chunk_id": chunk.prev_chunk_id or "",
        "next_chunk_id": chunk.next_chunk_id or "",
        "block_types": ",".join(chunk.block_types),
    }