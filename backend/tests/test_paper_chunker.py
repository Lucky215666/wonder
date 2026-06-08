from backend.rag.paper_chunker import chunk_paper_document, build_embedding_text
from backend.rag.paper_cleaner import remove_repeated_headers
from backend.rag.paper_types import PaperBlock, PaperChunk, PaperDocument, PaperPage, chroma_safe_metadata


def test_remove_repeated_headers_drops_common_page_header():
    pages = [
        PaperPage(1, "WonderConf 2026\nAbstract text"),
        PaperPage(2, "WonderConf 2026\nMethod text"),
        PaperPage(3, "WonderConf 2026\nResult text"),
    ]

    cleaned = remove_repeated_headers(pages)

    assert [p.text for p in cleaned] == ["Abstract text", "Method text", "Result text"]


def test_chunk_paper_document_skips_references_and_links_neighbors():
    doc = PaperDocument(
        title="RAG Paper",
        authors=[],
        abstract="abstract",
        pages=[],
        parser="mineru_precision",
        raw_markdown="",
        blocks=[
            PaperBlock("method " * 400, 2, 2, section_type="method", section_title="2 Method"),
            PaperBlock("result " * 100, 3, 3, section_type="result", section_title="3 Result"),
            PaperBlock("[1] Reference", 4, 4, section_type="references", section_title="References", is_reference=True),
        ],
    )

    chunks = chunk_paper_document(doc, target_chars=800, overlap_chars=120)

    assert all(not chunk.is_reference for chunk in chunks)
    assert chunks[0].section_type == "method"
    assert chunks[-1].section_type == "result"
    assert chunks[0].next_chunk_id == chunks[1].chunk_id
    assert chunks[1].prev_chunk_id == chunks[0].chunk_id


def test_build_embedding_text_adds_compact_header():
    chunk = PaperChunk(
        chunk_id="c1",
        text="The method uses hybrid retrieval.",
        chunk_index=0,
        section_type="method",
        section_title="2 Method",
        page_start=2,
        page_end=3,
    )

    text = build_embedding_text("RAG Paper", chunk)

    assert text.startswith("Title: RAG Paper\nSection: 2 Method\nPages: 2-3\n\n")
    assert text.endswith("The method uses hybrid retrieval.")


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
        "chunk_type": "content",
        "section_type": "method",
        "section_title": "2 Method",
        "page_start": 2,
        "page_end": 3,
        "labels": "",
        "is_reference": False,
        "prev_chunk_id": "",
        "next_chunk_id": "c2",
        "block_types": "paragraph,formula",
        "parser": "pypdf",
        "parser_version": "",
        "source_language": "en",
        "zh_semantic_summary": "",
        "zh_key_points": "",
        "terms_en": "",
        "terms_zh": "",
        "term_aliases": "",
        "term_types": "",
        "evidence_roles": "",
        "confidence_flags": "",
    }


def test_paper_block_defaults_to_paragraph_content():
    block = PaperBlock(text="A paragraph.", page_start=1, page_end=1)

    assert block.block_type == "paragraph"
    assert block.section_type == "unknown"
    assert block.section_title == ""


from backend.rag.paper_types import PaperBlock, PaperDocument, PaperPage


def test_chunker_keeps_caption_and_formula_labels():
    doc = PaperDocument(
        document_id="doc-1",
        file_name="lime.pdf",
        title="LIME",
        authors=[],
        abstract=None,
        pages=[PaperPage(2, "text")],
        raw_markdown="",
        parser="mineru_precision",
        parser_version="vlm",
        blocks=[
            PaperBlock(
                block_type="paragraph",
                text="The optimization objective is defined below.",
                section_type="method",
                section_title="2.2 Illumination Map Refinement",
                page_start=2,
                page_end=2,
                order=0,
            ),
            PaperBlock(
                block_type="formula",
                text="min_T ||T_hat - T||_F^2",
                label="Eq. (8)",
                section_type="method",
                section_title="2.2 Illumination Map Refinement",
                page_start=2,
                page_end=2,
                order=1,
            ),
            PaperBlock(
                block_type="figure_caption",
                text="Figure 4: Illumination maps.",
                label="Figure 4",
                section_type="method",
                section_title="2.2 Illumination Map Refinement",
                page_start=3,
                page_end=3,
                order=2,
            ),
        ],
    )

    chunks = chunk_paper_document(doc, target_chars=300, overlap_chars=50)

    assert [chunk.chunk_type for chunk in chunks] == ["content", "formula", "figure_caption"]
    assert chunks[1].labels == ["Eq. (8)"]
    assert chunks[2].labels == ["Figure 4"]
    assert chunks[0].parser == "mineru_precision"
    assert chunks[0].parser_version == "vlm"
    assert chunks[0].next_chunk_id == chunks[1].chunk_id
    assert chunks[1].prev_chunk_id == chunks[0].chunk_id


def test_build_embedding_text_includes_labels_when_present():
    chunk = chunk_paper_document(PaperDocument(
        document_id="doc-1",
        file_name="lime.pdf",
        title="LIME",
        authors=[],
        abstract=None,
        pages=[],
        raw_markdown="",
        parser="mineru_precision",
        blocks=[
            PaperBlock(
                block_type="formula",
                text="formula body",
                label="Eq. (8)",
                section_type="method",
                section_title="2 Method",
                page_start=2,
                page_end=2,
                order=0,
            )
        ],
    ))[0]

    text = build_embedding_text("LIME", chunk)

    assert "Title: LIME" in text
    assert "Section: 2 Method" in text
    assert "Pages: 2" in text
    assert "Labels: Eq. (8)" in text