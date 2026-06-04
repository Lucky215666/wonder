"""QA policy module: resolves answer mode and retrieval parameters."""
from dataclasses import dataclass
from typing import List, Optional

# Confidence threshold: if best summary distance is above this, treat as weak retrieval
RETRIEVAL_WEAK_DISTANCE = 0.8


@dataclass
class QAPolicy:
    answer_mode: str  # general | rag_enhanced | mentioned_docs | compare_docs
    doc_ids: Optional[List[str]]
    strict_doc_scope: bool
    top_k_docs: int
    top_k_chunks: int
    max_context_chars: int
    max_answer_tokens: int


def resolve_qa_policy(
    mentioned_doc_ids: Optional[List[str]] = None,
    knowledge_base_id: Optional[str] = None,
    retrieval_confidence: Optional[float] = None,
) -> QAPolicy:
    """Resolve the QA policy based on inputs.

    Args:
        mentioned_doc_ids: Document IDs explicitly mentioned by the user.
        knowledge_base_id: Current knowledge base (not used for mode, kept for future).
        retrieval_confidence: Best retrieval score (0-1). Higher = more confident.
            None means no retrieval was performed.

    Returns:
        QAPolicy with resolved mode and parameters.
    """
    # --- Mentioned docs take priority ---
    if mentioned_doc_ids and len(mentioned_doc_ids) >= 2:
        return QAPolicy(
            answer_mode="compare_docs",
            doc_ids=list(mentioned_doc_ids),
            strict_doc_scope=True,
            top_k_docs=5,
            top_k_chunks=10,
            max_context_chars=16000,
            max_answer_tokens=3000,
        )

    if mentioned_doc_ids and len(mentioned_doc_ids) == 1:
        return QAPolicy(
            answer_mode="mentioned_docs",
            doc_ids=list(mentioned_doc_ids),
            strict_doc_scope=True,
            top_k_docs=3,
            top_k_chunks=8,
            max_context_chars=12000,
            max_answer_tokens=2500,
        )

    # --- No mentions: decide between rag_enhanced and general ---
    if retrieval_confidence is not None and retrieval_confidence >= 0.3:
        return QAPolicy(
            answer_mode="rag_enhanced",
            doc_ids=None,
            strict_doc_scope=False,
            top_k_docs=3,
            top_k_chunks=5,
            max_context_chars=10000,
            max_answer_tokens=2500,
        )

    return QAPolicy(
        answer_mode="general",
        doc_ids=None,
        strict_doc_scope=False,
        top_k_docs=3,
        top_k_chunks=5,
        max_context_chars=10000,
        max_answer_tokens=2500,
    )
