"""QA mode policy: determines answer mode and retrieval scope."""
from dataclasses import dataclass, replace
from typing import List, Literal, Optional

AnswerMode = Literal["general", "rag_enhanced", "mentioned_docs", "compare_docs"]
EvidenceStatus = Literal["none", "weak", "reliable"]


@dataclass(frozen=True)
class QALimits:
    top_k_docs: int
    top_k_chunks: int
    max_context_chars: int
    max_answer_tokens: int


@dataclass(frozen=True)
class RetrievalScope:
    knowledge_base_id: Optional[str]
    doc_ids: Optional[List[str]]
    strict_doc_scope: bool


@dataclass(frozen=True)
class QAPolicy:
    answer_mode: AnswerMode
    retrieval_scope: RetrievalScope
    limits: QALimits
    evidence_status: EvidenceStatus = "none"


DEFAULT_LIMITS = QALimits(
    top_k_docs=3,
    top_k_chunks=5,
    max_context_chars=10000,
    max_answer_tokens=1800,
)


def build_initial_policy(
    *,
    knowledge_base_id: Optional[str],
    doc_ids: Optional[List[str]],
    mentioned_doc_ids: Optional[List[str]],
    top_k_docs: int,
    top_k_chunks: int,
) -> QAPolicy:
    """Build the initial QA policy based on mention state."""
    mentions = [doc_id for doc_id in (mentioned_doc_ids or []) if doc_id]
    if len(mentions) == 1:
        return QAPolicy(
            answer_mode="mentioned_docs",
            retrieval_scope=RetrievalScope(knowledge_base_id, mentions, True),
            limits=QALimits(
                top_k_docs=1,
                top_k_chunks=max(top_k_chunks, 5),
                max_context_chars=9000,
                max_answer_tokens=1600,
            ),
        )
    if len(mentions) > 1:
        return QAPolicy(
            answer_mode="compare_docs",
            retrieval_scope=RetrievalScope(knowledge_base_id, mentions, True),
            limits=QALimits(
                top_k_docs=len(mentions),
                top_k_chunks=max(top_k_chunks, len(mentions) * 2),
                max_context_chars=12000,
                max_answer_tokens=2200,
            ),
        )
    return QAPolicy(
        answer_mode="rag_enhanced",
        retrieval_scope=RetrievalScope(knowledge_base_id, doc_ids, False),
        limits=QALimits(
            top_k_docs=top_k_docs,
            top_k_chunks=top_k_chunks,
            max_context_chars=10000,
            max_answer_tokens=1800,
        ),
    )


def finalize_policy_after_retrieval(
    policy: QAPolicy, *, evidence_status: EvidenceStatus
) -> QAPolicy:
    """Finalize policy after retrieval based on evidence quality.

    For strict_doc_scope (mentioned_docs / compare_docs), preserve answer_mode
    but still track evidence_status.
    For non-strict, downgrade answer_mode based on evidence:
    - reliable -> rag_enhanced
    - weak -> general
    - none -> general
    """
    if policy.retrieval_scope.strict_doc_scope:
        return replace(policy, evidence_status=evidence_status)
    if evidence_status == "reliable":
        return replace(policy, answer_mode="rag_enhanced", evidence_status="reliable")
    if evidence_status == "weak":
        return replace(policy, answer_mode="general", evidence_status="weak")
    return replace(policy, answer_mode="general", evidence_status="none")
