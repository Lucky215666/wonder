import uuid

from backend.rag.paper_types import PaperChunk, PaperDocument


def _split_text(text: str, target_chars: int, overlap_chars: int) -> list[str]:
    if len(text) <= target_chars:
        return [text]
    pieces = []
    start = 0
    while start < len(text):
        end = min(start + target_chars, len(text))
        pieces.append(text[start:end].strip())
        if end >= len(text):
            break
        start = max(0, end - overlap_chars)
    return [piece for piece in pieces if piece]


def chunk_paper_document(
    doc: PaperDocument,
    *,
    target_chars: int = 1600,
    overlap_chars: int = 200,
) -> list[PaperChunk]:
    chunks: list[PaperChunk] = []
    for block in doc.blocks:
        if block.is_reference or block.section_type == "references":
            continue
        for piece in _split_text(block.text, target_chars, overlap_chars):
            chunks.append(PaperChunk(
                chunk_id=f"paper-{uuid.uuid4()}",
                text=piece,
                chunk_index=len(chunks),
                section_type=block.section_type,
                section_title=block.section_title,
                page_start=block.page_start,
                page_end=block.page_end,
                is_reference=False,
                block_types=[block.block_type],
            ))

    linked: list[PaperChunk] = []
    for i, chunk in enumerate(chunks):
        linked.append(PaperChunk(
            chunk_id=chunk.chunk_id,
            text=chunk.text,
            chunk_index=chunk.chunk_index,
            section_type=chunk.section_type,
            section_title=chunk.section_title,
            page_start=chunk.page_start,
            page_end=chunk.page_end,
            is_reference=chunk.is_reference,
            prev_chunk_id=chunks[i - 1].chunk_id if i > 0 else None,
            next_chunk_id=chunks[i + 1].chunk_id if i + 1 < len(chunks) else None,
            block_types=chunk.block_types,
        ))
    return linked


def build_embedding_text(paper_title: str | None, chunk: PaperChunk) -> str:
    title = paper_title or "Unknown"
    pages = f"{chunk.page_start}-{chunk.page_end}" if chunk.page_start != chunk.page_end else str(chunk.page_start)
    section = chunk.section_title or chunk.section_type or "unknown"
    return f"Title: {title}\nSection: {section}\nPages: {pages}\n\n{chunk.text}"