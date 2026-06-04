import os
from typing import List, Optional, Dict, Any
import chromadb


class StorageManager:
    def __init__(self, chroma_path: str):
        self.chroma_path = chroma_path

        os.makedirs(chroma_path, exist_ok=True)

        self.chroma_client = chromadb.PersistentClient(path=chroma_path)

    def get_collection(self, collection_name: str = "documents"):
        """获取或创建指定名称的 ChromaDB collection"""
        return self.chroma_client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    def add_to_collection(self, ids: List[str], embeddings: List[List[float]],
                          metadatas: List[Dict[str, Any]], documents: List[str],
                          collection_name: Optional[str] = None):
        """添加向量到 ChromaDB"""
        collection = self.get_collection(collection_name or "documents")
        collection.add(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=documents
        )

    def query_collection(self, query_embeddings: List[List[float]],
                         n_results: int = 10,
                         where: Optional[Dict] = None,
                         collection_name: Optional[str] = None) -> Dict[str, Any]:
        """查询 ChromaDB"""
        collection = self.get_collection(collection_name or "documents")
        kwargs = {
            "query_embeddings": query_embeddings,
            "n_results": n_results
        }
        if where:
            kwargs["where"] = where
        return collection.query(**kwargs)

    def delete_from_collection(self, doc_id: str, knowledge_base_id: str,
                               collection_name: Optional[str] = None):
        if not knowledge_base_id:
            raise ValueError("knowledge_base_id is required when deleting vectors")
        collection = self.get_collection(collection_name or "documents")
        where = {
            "$and": [
                {"doc_id": doc_id},
                {"knowledge_base_id": knowledge_base_id},
            ]
        }
        collection.delete(where=where)

    def close(self):
        """关闭连接"""
        pass
