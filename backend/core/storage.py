import os
from typing import List, Optional, Dict, Any
import chromadb


class StorageManager:
    def __init__(self, chroma_path: str):
        self.chroma_path = chroma_path

        os.makedirs(chroma_path, exist_ok=True)

        self.chroma_client = chromadb.PersistentClient(path=chroma_path)
        self.collection = self.chroma_client.get_or_create_collection(
            name="documents",
            metadata={"hnsw:space": "cosine"}
        )

    def add_to_collection(self, ids: List[str], embeddings: List[List[float]],
                          metadatas: List[Dict[str, Any]], documents: List[str]):
        """添加向量到 ChromaDB"""
        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=documents
        )

    def query_collection(self, query_embeddings: List[List[float]],
                         n_results: int = 10,
                         where: Optional[Dict] = None) -> Dict[str, Any]:
        """查询 ChromaDB"""
        kwargs = {
            "query_embeddings": query_embeddings,
            "n_results": n_results
        }
        if where:
            kwargs["where"] = where
        return self.collection.query(**kwargs)

    def delete_from_collection(self, doc_id: str, knowledge_base_id: str):
        if not knowledge_base_id:
            raise ValueError("knowledge_base_id is required when deleting vectors")
        where = {
            "$and": [
                {"doc_id": doc_id},
                {"knowledge_base_id": knowledge_base_id},
            ]
        }
        self.collection.delete(where=where)

    def close(self):
        """关闭连接"""
        pass
