from backend.rag.paper_types import PaperBlock, PaperChunk, chroma_safe_metadata


def test_chroma_safe_metadata_keeps_only_scalar_values():
    chunk = PaperChunk(
        chunk_id="c1",
        text="method text",
        chunk_index=0,
        section_type="method",
        section_title="2 Method",
        page_start=2,
        page_end=3,
        is_reference=False,
        prev_chunk_id=None,
        next_chunk_id="c2",
        block_types=["paragraph", "formula"],
    )

    meta = chroma_safe_metadata(chunk)

    assert meta == {
        "chunk_id": "c1",
        "chunk_index": 0,
        "section_type": "method",
        "section_title": "2 Method",
        "page_start": 2,
        "page_end": 3,
        "is_reference": False,
        "prev_chunk_id": "",
        "next_chunk_id": "c2",
        "block_types": "paragraph,formula",
    }


def test_paper_block_defaults_to_paragraph_content():
    block = PaperBlock(text="A paragraph.", page_start=1, page_end=1)

    assert block.block_type == "paragraph"
    assert block.section_type == "unknown"
    assert block.section_title == ""