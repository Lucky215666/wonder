from backend.rag.paper_types import (
    BilingualTerm,
    PaperChunk,
    chroma_safe_metadata,
    enrichment_embedding_text,
)


def test_chroma_metadata_includes_compact_bilingual_fields():
    chunk = PaperChunk(
        chunk_id="c1",
        text="The method estimates an illumination map.",
        chunk_index=0,
        section_type="method",
        section_title="2 Method",
        page_start=2,
        page_end=3,
        zh_semantic_summary="该方法估计照明图。",
        zh_key_points=["估计照明图", "用于低光增强"],
        terms=[
            BilingualTerm(
                canonical_en="illumination map",
                zh="照明图",
                aliases=["illumination estimation"],
                term_type="concept",
            )
        ],
        evidence_roles=["method"],
        confidence_flags=["term_translation_uncertain"],
    )

    meta = chroma_safe_metadata(chunk)

    assert meta["source_language"] == "en"
    assert meta["zh_semantic_summary"] == "该方法估计照明图。"
    assert meta["zh_key_points"] == "估计照明图|用于低光增强"
    assert meta["terms_en"] == "illumination map"
    assert meta["terms_zh"] == "照明图"
    assert meta["term_aliases"] == "illumination estimation"
    assert meta["evidence_roles"] == "method"
    assert meta["confidence_flags"] == "term_translation_uncertain"


def test_enrichment_embedding_text_uses_only_helper_fields():
    chunk = PaperChunk(
        chunk_id="c1",
        text="The English source text should not be repeated here.",
        chunk_index=0,
        section_type="method",
        section_title="2 Method",
        page_start=2,
        page_end=2,
        zh_semantic_summary="该方法估计照明图。",
        zh_key_points=["低光增强", "结构感知约束"],
        terms=[
            BilingualTerm(
                canonical_en="structure-aware smoothing",
                zh="结构感知平滑",
                aliases=["structure-aware constraint"],
                term_type="method",
            )
        ],
        evidence_roles=["method"],
    )

    text = enrichment_embedding_text("LIME", chunk)

    assert "Title: LIME" in text
    assert "Chinese summary: 该方法估计照明图。" in text
    assert "Chinese key points: 低光增强; 结构感知约束" in text
    assert "Terms: structure-aware smoothing / 结构感知平滑" in text
    assert "The English source text should not be repeated here." not in text