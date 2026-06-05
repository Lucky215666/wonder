"""Tests for QA policy mode selection logic."""
import pytest
from backend.agents.qa_policy import (
    build_initial_policy,
    finalize_policy_after_retrieval,
)


class TestBuildInitialPolicy:
    """Test policy mode selection based on mentions."""

    def test_single_mention_returns_mentioned_docs_mode(self):
        policy = build_initial_policy(
            knowledge_base_id="kb-1",
            doc_ids=None,
            mentioned_doc_ids=["doc-1"],
            top_k_docs=3,
            top_k_chunks=5,
        )
        assert policy.answer_mode == "mentioned_docs"

    def test_multiple_mentions_returns_compare_docs_mode(self):
        policy = build_initial_policy(
            knowledge_base_id="kb-1",
            doc_ids=None,
            mentioned_doc_ids=["doc-1", "doc-2"],
            top_k_docs=3,
            top_k_chunks=5,
        )
        assert policy.answer_mode == "compare_docs"

    def test_three_mentions_returns_compare_docs_mode(self):
        policy = build_initial_policy(
            knowledge_base_id="kb-1",
            doc_ids=None,
            mentioned_doc_ids=["doc-1", "doc-2", "doc-3"],
            top_k_docs=3,
            top_k_chunks=5,
        )
        assert policy.answer_mode == "compare_docs"

    def test_no_mentions_returns_rag_enhanced(self):
        policy = build_initial_policy(
            knowledge_base_id="kb-1",
            doc_ids=None,
            mentioned_doc_ids=None,
            top_k_docs=3,
            top_k_chunks=5,
        )
        assert policy.answer_mode == "rag_enhanced"

    def test_strict_doc_scope_true_when_single_mention(self):
        policy = build_initial_policy(
            knowledge_base_id="kb-1",
            doc_ids=None,
            mentioned_doc_ids=["doc-1"],
            top_k_docs=3,
            top_k_chunks=5,
        )
        assert policy.retrieval_scope.strict_doc_scope is True

    def test_strict_doc_scope_true_when_multiple_mentions(self):
        policy = build_initial_policy(
            knowledge_base_id="kb-1",
            doc_ids=None,
            mentioned_doc_ids=["doc-1", "doc-2"],
            top_k_docs=3,
            top_k_chunks=5,
        )
        assert policy.retrieval_scope.strict_doc_scope is True

    def test_strict_doc_scope_false_when_no_mentions(self):
        policy = build_initial_policy(
            knowledge_base_id="kb-1",
            doc_ids=None,
            mentioned_doc_ids=None,
            top_k_docs=3,
            top_k_chunks=5,
        )
        assert policy.retrieval_scope.strict_doc_scope is False

    def test_mentioned_doc_ids_override_session_doc_ids(self):
        """When mentions are present, session doc_ids are ignored."""
        policy = build_initial_policy(
            knowledge_base_id="kb-1",
            doc_ids=["session-doc-1", "session-doc-2"],
            mentioned_doc_ids=["mentioned-1"],
            top_k_docs=3,
            top_k_chunks=5,
        )
        assert policy.retrieval_scope.doc_ids == ["mentioned-1"]

    def test_mentioned_docs_override_preserved_for_multiple(self):
        policy = build_initial_policy(
            knowledge_base_id="kb-1",
            doc_ids=["session-1"],
            mentioned_doc_ids=["m-1", "m-2"],
            top_k_docs=3,
            top_k_chunks=5,
        )
        assert policy.retrieval_scope.doc_ids == ["m-1", "m-2"]

    def test_session_doc_ids_used_when_no_mentions(self):
        """Without mentions, session doc_ids are preserved."""
        policy = build_initial_policy(
            knowledge_base_id="kb-1",
            doc_ids=["session-doc-1"],
            mentioned_doc_ids=None,
            top_k_docs=3,
            top_k_chunks=5,
        )
        assert policy.retrieval_scope.doc_ids == ["session-doc-1"]
        assert policy.retrieval_scope.strict_doc_scope is False

    def test_knowledge_base_id_preserved(self):
        policy = build_initial_policy(
            knowledge_base_id="kb-test",
            doc_ids=None,
            mentioned_doc_ids=None,
            top_k_docs=3,
            top_k_chunks=5,
        )
        assert policy.retrieval_scope.knowledge_base_id == "kb-test"

    def test_knowledge_base_id_preserved_with_mentions(self):
        policy = build_initial_policy(
            knowledge_base_id="kb-test",
            doc_ids=None,
            mentioned_doc_ids=["doc-1"],
            top_k_docs=3,
            top_k_chunks=5,
        )
        assert policy.retrieval_scope.knowledge_base_id == "kb-test"

    def test_empty_mentioned_doc_ids_treated_as_no_mentions(self):
        """Empty list should behave like None (no mentions)."""
        policy = build_initial_policy(
            knowledge_base_id="kb-1",
            doc_ids=None,
            mentioned_doc_ids=[],
            top_k_docs=3,
            top_k_chunks=5,
        )
        assert policy.answer_mode == "rag_enhanced"
        assert policy.retrieval_scope.strict_doc_scope is False

    def test_mentions_with_empty_strings_filtered(self):
        policy = build_initial_policy(
            knowledge_base_id="kb-1",
            doc_ids=None,
            mentioned_doc_ids=["", "doc-a", ""],
            top_k_docs=3,
            top_k_chunks=5,
        )
        assert policy.answer_mode == "mentioned_docs"
        assert policy.retrieval_scope.doc_ids == ["doc-a"]


class TestFinalizePolicy:
    """Test post-retrieval policy finalization."""

    def test_strict_scope_never_downgraded(self):
        policy = build_initial_policy(
            knowledge_base_id="kb-1",
            doc_ids=None,
            mentioned_doc_ids=["doc-1"],
            top_k_docs=3,
            top_k_chunks=5,
        )
        finalized = finalize_policy_after_retrieval(policy, evidence_status="none")
        assert finalized.answer_mode == "mentioned_docs"
        assert finalized.evidence_status == "none"

    def test_compare_docs_never_downgraded(self):
        policy = build_initial_policy(
            knowledge_base_id="kb-1",
            doc_ids=None,
            mentioned_doc_ids=["doc-1", "doc-2"],
            top_k_docs=3,
            top_k_chunks=5,
        )
        finalized = finalize_policy_after_retrieval(policy, evidence_status="none")
        assert finalized.answer_mode == "compare_docs"
        assert finalized.evidence_status == "none"

    def test_rag_enhanced_with_reliable_sources_stays(self):
        policy = build_initial_policy(
            knowledge_base_id="kb-1",
            doc_ids=None,
            mentioned_doc_ids=None,
            top_k_docs=3,
            top_k_chunks=5,
        )
        finalized = finalize_policy_after_retrieval(policy, evidence_status="reliable")
        assert finalized.answer_mode == "rag_enhanced"
        assert finalized.evidence_status == "reliable"

    def test_rag_enhanced_without_reliable_becomes_general(self):
        policy = build_initial_policy(
            knowledge_base_id="kb-1",
            doc_ids=None,
            mentioned_doc_ids=None,
            top_k_docs=3,
            top_k_chunks=5,
        )
        finalized = finalize_policy_after_retrieval(policy, evidence_status="none")
        assert finalized.answer_mode == "general"
        assert finalized.evidence_status == "none"

    def test_no_mentions_weak_sources_finalizes_to_general(self):
        policy = build_initial_policy(
            knowledge_base_id="kb1",
            doc_ids=None,
            mentioned_doc_ids=None,
            top_k_docs=3,
            top_k_chunks=5,
        )
        finalized = finalize_policy_after_retrieval(policy, evidence_status="weak")
        assert finalized.answer_mode == "general"
        assert finalized.evidence_status == "weak"
        assert finalized.retrieval_scope.strict_doc_scope is False

    def test_single_mention_stays_strict_even_with_weak_sources(self):
        policy = build_initial_policy(
            knowledge_base_id="kb1",
            doc_ids=None,
            mentioned_doc_ids=["doc-1"],
            top_k_docs=3,
            top_k_chunks=5,
        )
        finalized = finalize_policy_after_retrieval(policy, evidence_status="weak")
        assert finalized.answer_mode == "mentioned_docs"
        assert finalized.evidence_status == "weak"
        assert finalized.retrieval_scope.doc_ids == ["doc-1"]
        assert finalized.retrieval_scope.strict_doc_scope is True

    def test_no_mentions_none_evidence_becomes_general_none(self):
        policy = build_initial_policy(
            knowledge_base_id="kb1",
            doc_ids=None,
            mentioned_doc_ids=None,
            top_k_docs=3,
            top_k_chunks=5,
        )
        finalized = finalize_policy_after_retrieval(policy, evidence_status="none")
        assert finalized.answer_mode == "general"
        assert finalized.evidence_status == "none"

    def test_no_mentions_weak_evidence_becomes_general_weak(self):
        policy = build_initial_policy(
            knowledge_base_id="kb1",
            doc_ids=None,
            mentioned_doc_ids=None,
            top_k_docs=3,
            top_k_chunks=5,
        )
        finalized = finalize_policy_after_retrieval(policy, evidence_status="weak")
        assert finalized.answer_mode == "general"
        assert finalized.evidence_status == "weak"

    def test_no_mentions_reliable_evidence_becomes_rag_enhanced(self):
        policy = build_initial_policy(
            knowledge_base_id="kb1",
            doc_ids=None,
            mentioned_doc_ids=None,
            top_k_docs=3,
            top_k_chunks=5,
        )
        finalized = finalize_policy_after_retrieval(policy, evidence_status="reliable")
        assert finalized.answer_mode == "rag_enhanced"
        assert finalized.evidence_status == "reliable"
