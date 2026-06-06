import uuid

from backend.rag.paper_types import PaperChunk, PaperDocument

SPECIAL_CHUNK_TYPES = {
    "abstract": "abstract",
    "figure_caption": "figure_caption",
    "table_caption": "table_caption",
    "formula": "formula",
    "reference": "reference",
}


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


def _chunk_type_for_block(block_type: str) -> str:
    return SPECIAL_CHUNK_TYPES.get(block_type, "content")


def chunk_paper_document(
    doc: PaperDocument,
    *,
    target_chars: int = 1600,
    overlap_chars: int = 200,
) -> list[PaperChunk]:
    chunks: list[PaperChunk] = []
    for block in sorted(doc.blocks, key=lambda b: b.order):
        chunk_type = _chunk_type_for_block(block.block_type)
        if block.is_reference or block.section_type == "reference" or chunk_type == "reference":
            continue

        pieces = [block.text] if chunk_type != "content" else _split_text(block.text, target_chars, overlap_chars)
        for piece in pieces:
            chunks.append(PaperChunk(
                chunk_id=f"paper-{uuid.uuid4()}",
                text=piece,
                chunk_index=len(chunks),
                chunk_type=chunk_type,
                section_type=block.section_type or "unknown",
                section_title=block.section_title or "",
                page_start=block.page_start,
                page_end=block.page_end,
                labels=[block.label] if block.label else [],
                parser=doc.parser,
                parser_version=doc.parser_version,
                is_reference=False,
                block_types=[block.block_type],
            ))

    linked: list[PaperChunk] = []
    for i, chunk in enumerate(chunks):
        linked.append(PaperChunk(
            chunk_id=chunk.chunk_id,
            text=chunk.text,
            chunk_index=chunk.chunk_index,
            chunk_type=chunk.chunk_type,
            section_type=chunk.section_type,
            section_title=chunk.section_title,
            page_start=chunk.page_start,
            page_end=chunk.page_end,
            labels=chunk.labels,
            parser=chunk.parser,
            parser_version=chunk.parser_version,
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
    parts = [
        f"Title: {title}",
        f"Section: {section}",
        f"Pages: {pages}",
    ]
    if chunk.labels:
        parts.append("Labels: " + ", ".join(chunk.labels))
    return "\n".join(parts) + f"\n\n{chunk.text}"