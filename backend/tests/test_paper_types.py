from backend.rag.paper_types import PaperChunk, chroma_safe_metadata


def test_chroma_safe_metadata_includes_structured_evidence_fields():
    chunk = PaperChunk(
        chunk_id="chunk-method-1",
        text="The optimization objective is defined in Eq. (8).",
        chunk_index=2,
        chunk_type="content",
        section_type="method",
        section_title="2.2 Illumination Map Refinement",
        page_start=2,
        page_end=3,
        labels=["Eq. (8)", "Figure 4"],
        parser="mineru_precision",
        parser_version="vlm",
        is_reference=False,
        prev_chunk_id="chunk-method-0",
        next_chunk_id="chunk-method-2",
        block_types=["paragraph", "formula"],
    )

    meta = chroma_safe_metadata(chunk)

    assert meta["chunk_id"] == "chunk-method-1"
    assert meta["chunk_type"] == "content"
    assert meta["section_type"] == "method"
    assert meta["section_title"] == "2.2 Illumination Map Refinement"
    assert meta["page_start"] == 2
    assert meta["page_end"] == 3
    assert meta["labels"] == "Eq. (8),Figure 4"
    assert meta["parser"] == "mineru_precision"
    assert meta["parser_version"] == "vlm"
    assert meta["is_reference"] is False
    assert meta["prev_chunk_id"] == "chunk-method-0"
    assert meta["next_chunk_id"] == "chunk-method-2"