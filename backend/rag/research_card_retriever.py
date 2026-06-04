from typing import Any, Dict, List, Optional

from backend.core.embedding import EmbeddingClient
from backend.core.storage import StorageManager


class ResearchCardRetriever:
    def __init__(self, storage: StorageManager, embedding: EmbeddingClient):
        self.storage = storage
        self.embedding = embedding

    def retrieve(
        self,
        *,
        query: str,
        knowledge_base_id: Optional[str],
        doc_ids: Optional[List[str]],
        top_k: int = 5,
        collection_names: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        query_embedding = self.embedding.embed_single(query)
        collections = collection_names or [None]
        refs: List[Dict[str, Any]] = []
        for collection_name in collections:
            filters: List[Dict[str, Any]] = [{"item_type": "research_card"}]
            if knowledge_base_id:
                filters.append({"knowledge_base_id": knowledge_base_id})
            where = {"$and": filters} if len(filters) > 1 else filters[0]
            result = self.storage.query_collection(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=where,
                collection_name=collection_name,
            )
            docs = result.get("documents", [[]])[0] if result.get("documents") else []
            metas = result.get("metadatas", [[]])[0] if result.get("metadatas") else []
            distances = result.get("distances", [[]])[0] if result.get("distances") else []
            for i, doc in enumerate(docs):
                meta = metas[i] if i < len(metas) else {}
                linked = [x for x in str(meta.get("linked_doc_ids", "")).split(",") if x]
                if doc_ids and not any(doc_id in linked for doc_id in doc_ids):
                    continue
                distance = distances[i] if i < len(distances) else None
                refs.append({
                    "item_type": "research_card",
                    "card_id": meta.get("card_id", ""),
                    "doc_id": linked[0] if linked else "",
                    "file_name": "Research card",
                    "chunk_id": None,
                    "chunk_index": None,
                    "chunk_type": "card",
                    "content": doc,
                    "score": 1 - distance / 2 if distance is not None else None,
                    "linked_doc_ids": linked,
                    "knowledge_type": meta.get("knowledge_type", ""),
                    "tags": meta.get("tags", ""),
                })
        return sorted(refs, key=lambda ref: ref.get("score") or 0, reverse=True)[:top_k]
