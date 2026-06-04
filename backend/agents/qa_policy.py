"""QA mode policy: determines answer mode and retrieval scope."""
from dataclasses import dataclass
from typing import List, Literal, Optional

AnswerMode = Literal["general", "rag_enhanced", "mentioned_docs", "compare_docs"]


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
    policy: QAPolicy, *, has_reliable_sources: bool
) -> QAPolicy:
    """Downgrade to general mode when RAG found nothing reliable (non-strict only)."""
    if policy.retrieval_scope.strict_doc_scope:
        return policy
    if has_reliable_sources:
        return policy
    return QAPolicy(
        answer_mode="general",
        retrieval_scope=policy.retrieval_scope,
        limits=policy.limits,
    )
