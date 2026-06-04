import re
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from backend.core.embedding import EmbeddingClient
from backend.core.storage import StorageManager


def build_collection_name(provider: str, model: str, dimensions: int) -> str:
    """构建 Chroma collection 名称，格式: documents__{provider}__{model}__{dimensions}"""
    def normalize(value: str) -> str:
        return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")
    return f"documents__{normalize(provider)}__{normalize(model)}__{dimensions}"


class DocumentIndexer:
    def __init__(self, storage: StorageManager, embedding: EmbeddingClient):
        self.storage = storage
        self.embedding = embedding

    def index_document(
        self,
        doc_id: str,
        knowledge_base_id: str,
        file_name: str,
        file_path: str,
        chunks: List[str],
        summary: str,
        analysis_result: Dict[str, Any],
        tags: List[str] | None = None,
        index_id: Optional[str] = None,
        collection_name: Optional[str] = None,
        embedding_provider: Optional[str] = None,
        embedding_model: Optional[str] = None,
        embedding_dimensions: Optional[int] = None,
        analysis_version: Optional[str] = None,
        chunk_ids: Optional[List[str]] = None,
    ) -> str:
        tags = tags or []
        created_at = datetime.now().isoformat()

        texts_to_embed = [summary] + chunks
        embeddings = self.embedding.embed(texts_to_embed)

        # Generate chunk IDs if not provided
        if chunk_ids is None:
            chunk_ids = [f"chunk-{uuid.uuid4()}" for _ in range(len(chunks) + 1)]

        ids = [f"{doc_id}_{knowledge_base_id}_summary"]
        metadatas = [{
            "doc_id": doc_id,
            "knowledge_base_id": knowledge_base_id,
            "file_name": file_name,
            "chunk_type": "summary",
            "chunk_index": 0,
            "tags": ",".join(tags),
            "created_at": created_at,
            "index_id": index_id or "",
            "chunk_id": chunk_ids[0],
            "embedding_model": embedding_model or "",
            "embedding_dimensions": embedding_dimensions or 0,
        }]
        documents = [summary]

        for i, chunk in enumerate(chunks):
            ids.append(f"{doc_id}_{knowledge_base_id}_chunk_{i}")
            metadatas.append({
                "doc_id": doc_id,
                "knowledge_base_id": knowledge_base_id,
                "file_name": file_name,
                "chunk_type": "content",
                "chunk_index": i,
                "tags": ",".join(tags),
                "created_at": created_at,
                "index_id": index_id or "",
                "chunk_id": chunk_ids[i + 1],
                "embedding_model": embedding_model or "",
                "embedding_dimensions": embedding_dimensions or 0,
            })
            documents.append(chunk)

        try:
            self.storage.add_to_collection(
                ids=ids,
                embeddings=embeddings,
                metadatas=metadatas,
                documents=documents,
                collection_name=collection_name,
            )
        except Exception as exc:
            raise RuntimeError(
                f"Failed to persist vector index for doc_id={doc_id} "
                f"knowledge_base_id={knowledge_base_id}: {exc}"
            ) from exc

        return doc_id

    def delete_document(self, doc_id: str, knowledge_base_id: str,
                        collection_name: Optional[str] = None):
        if not knowledge_base_id:
            raise ValueError("knowledge_base_id is required when deleting a document from the vector store")
        self.storage.delete_from_collection(doc_id, knowledge_base_id, collection_name=collection_name)
