from datetime import datetime
from typing import Any, Dict, List, Optional

from backend.core.embedding import EmbeddingClient
from backend.core.storage import StorageManager


def build_research_card_embedding_text(
    *,
    question: str,
    core_claims: List[str],
    knowledge_type: str,
    tags: List[str],
    sub_direction: str,
    use_cases: List[str],
    linked_doc_ids: List[str],
    validation_notes: str,
) -> str:
    return "\n".join([
        f"Question: {question}",
        "Core claims: " + "; ".join(core_claims),
        f"Knowledge type: {knowledge_type}",
        "Tags: " + ", ".join(tags),
        f"Sub-direction: {sub_direction}",
        "Use cases: " + "; ".join(use_cases),
        "Linked papers: " + ", ".join(linked_doc_ids),
        f"Validation notes: {validation_notes}",
    ])


class ResearchCardIndexer:
    def __init__(self, storage: StorageManager, embedding: EmbeddingClient):
        self.storage = storage
        self.embedding = embedding

    def index_card(
        self,
        *,
        card_id: str,
        knowledge_base_id: str,
        question: str,
        core_claims: List[str],
        knowledge_type: str,
        tags: List[str],
        sub_direction: str,
        use_cases: List[str],
        linked_doc_ids: List[str],
        validation_notes: str,
        collection_name: Optional[str],
    ) -> str:
        text = build_research_card_embedding_text(
            question=question,
            core_claims=core_claims,
            knowledge_type=knowledge_type,
            tags=tags,
            sub_direction=sub_direction,
            use_cases=use_cases,
            linked_doc_ids=linked_doc_ids,
            validation_notes=validation_notes,
        )
        embeddings = self.embedding.embed([text])
        self.storage.add_to_collection(
            ids=[f"research_card_{card_id}"],
            embeddings=embeddings,
            metadatas=[{
                "item_type": "research_card",
                "card_id": card_id,
                "knowledge_base_id": knowledge_base_id,
                "linked_doc_ids": ",".join(linked_doc_ids),
                "knowledge_type": knowledge_type,
                "tags": ",".join(tags),
                "sub_direction": sub_direction,
                "created_at": datetime.now().isoformat(),
            }],
            documents=[text],
            collection_name=collection_name,
        )
        return card_id
