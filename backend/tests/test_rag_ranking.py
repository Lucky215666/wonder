from backend.rag.ranking import (
    build_evidence_pack,
    lexical_score,
    merge_bilingual_candidates,
    rerank_candidates,
    section_intent_score,
)
from backend.rag.paper_types import RetrievalCandidate


def test_lexical_score_matches_query_terms_case_insensitively():
    assert lexical_score("hybrid retrieval method", "The Method uses HYBRID retrieval.") == 1.0
    assert lexical_score("hybrid retrieval method", "Only retrieval is mentioned.") == 1 / 3


def test_section_intent_boosts_method_questions():
    assert section_intent_score("这个方法怎么设计？", {"section_type": "method"}) == 1.0
    assert section_intent_score("实验结果如何？", {"section_type": "method"}) == 0.0


def test_rerank_prefers_section_intent_when_dense_scores_are_close():
    method = RetrievalCandidate(
        doc_id="d1",
        file_name="paper.pdf",
        content="method content",
        metadata={"chunk_id": "c1", "chunk_type": "content", "section_type": "method"},
        dense_score=0.70,
        section_intent_score=1.0,
    )
    intro = RetrievalCandidate(
        doc_id="d1",
        file_name="paper.pdf",
        content="intro content",
        metadata={"chunk_id": "c2", "chunk_type": "content", "section_type": "introduction"},
        dense_score=0.72,
        section_intent_score=0.0,
    )

    ranked = rerank_candidates([intro, method])

    assert ranked[0].metadata["chunk_id"] == "c1"


def test_build_evidence_pack_uses_stable_source_ids_and_metadata():
    candidate = RetrievalCandidate(
        doc_id="d1",
        file_name="paper.pdf",
        content="The method uses hybrid retrieval.",
        metadata={
            "chunk_id": "c1",
            "chunk_index": 0,
            "chunk_type": "content",
            "paper_title": "RAG Paper",
            "section_title": "2 Method",
            "section_type": "method",
            "page_start": 2,
            "page_end": 3,
        },
        dense_score=0.9,
    )

    context, refs = build_evidence_pack([candidate], max_chars=2000)

    assert "[Evidence]" in context
    assert "[S1] file=paper.pdf title=RAG Paper section=2 Method pages=2-3" in context
    assert refs[0]["source_id"] == "S1"
    assert refs[0]["section_type"] == "method"


def test_merge_bilingual_candidates_combines_scores_by_chunk_id():
    source = RetrievalCandidate(
        doc_id="d1",
        file_name="paper.pdf",
        content="English source text",
        metadata={"chunk_id": "c1", "entry_kind": "source", "section_type": "method"},
        dense_score=0.7,
        lexical_score=0.1,
    )
    zh = RetrievalCandidate(
        doc_id="d1",
        file_name="paper.pdf",
        content="中文辅助摘要",
        metadata={
            "chunk_id": "c1",
            "entry_kind": "zh_enrichment",
            "section_type": "method",
            "zh_semantic_summary": "中文辅助摘要",
        },
        dense_score=0.9,
        lexical_score=0.0,
    )

    merged = merge_bilingual_candidates([zh, source])

    assert len(merged) == 1
    assert merged[0].content == "English source text"
    assert merged[0].metadata["zh_semantic_summary"] == "中文辅助摘要"
    assert merged[0].source_dense_score == 0.7
    assert merged[0].zh_enrichment_score == 0.9
    assert merged[0].final_score > source.final_score


def test_merge_bilingual_candidates_keeps_legacy_candidate_without_entry_kind():
    legacy = RetrievalCandidate(
        doc_id="d1",
        file_name="paper.pdf",
        content="legacy chunk",
        metadata={"chunk_id": "legacy-c1", "chunk_type": "content"},
        dense_score=0.6,
    )

    merged = merge_bilingual_candidates([legacy])

    assert len(merged) == 1
    assert merged[0].content == "legacy chunk"
    assert merged[0].source_dense_score == 0.6


def test_build_evidence_pack_marks_zh_helper_as_non_citable():
    candidate = RetrievalCandidate(
        doc_id="d1",
        file_name="paper.pdf",
        content="The method estimates an illumination map.",
        metadata={
            "chunk_id": "c1",
            "chunk_type": "content",
            "paper_title": "LIME",
            "section_title": "2 Method",
            "section_type": "method",
            "page_start": 2,
            "page_end": 2,
            "zh_semantic_summary": "该方法估计照明图。",
        },
        dense_score=0.9,
    )

    context, refs = build_evidence_pack([candidate], max_chars=2000)

    assert "source_text_en:" in context
    assert "The method estimates an illumination map." in context
    assert "zh_helper:" in context
    assert "not independently citable" in context
    assert refs[0]["zh_semantic_summary"] == "该方法估计照明图。"