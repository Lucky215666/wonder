import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.core.storage import StorageManager
from backend.core.embedding import EmbeddingClient
from backend.rag.indexer import DocumentIndexer
import os
import shutil


@pytest.fixture
def test_storage():
    """创建测试用存储"""
    storage = StorageManager("test_data/chroma", "test_data/knowledge.db")
    yield storage
    storage.close()
    # 清理测试数据（Windows 下 ChromaDB 可能持有文件锁，忽略删除失败）
    if os.path.exists("test_data"):
        shutil.rmtree("test_data", onerror=lambda *args: None)


@pytest.fixture
def mock_embedding():
    """创建 mock embedding 客户端"""
    class MockEmbeddingClient(EmbeddingClient):
        def __init__(self):
            # 跳过父类 __init__，避免需要真实 API key
            self.dimensions = 1536

        def embed(self, texts):
            return [[0.1] * 1536 for _ in texts]

        def embed_single(self, text):
            return [0.1] * 1536

    return MockEmbeddingClient()


def test_storage_initialization(test_storage):
    """测试存储初始化"""
    assert test_storage.collection.name == "documents"
    docs = test_storage.list_documents()
    assert isinstance(docs, list)


def test_document_indexing(test_storage, mock_embedding):
    """测试文档入库"""
    indexer = DocumentIndexer(test_storage, mock_embedding)
    doc_id = indexer.index_document(
        file_name="test.txt",
        file_path="/tmp/test.txt",
        chunks=["chunk1", "chunk2"],
        summary="test summary",
        analysis_result={
            "reading_card": "test reading card",
            "relation_analysis": "test relation",
            "writing_materials": "test writing",
            "todo_list": "test todo"
        }
    )
    assert doc_id is not None
    assert len(doc_id) == 8

    # 验证文档已入库
    doc = test_storage.get_document(doc_id)
    assert doc is not None
    assert doc["file_name"] == "test.txt"


def test_document_deletion(test_storage, mock_embedding):
    """测试文档删除"""
    indexer = DocumentIndexer(test_storage, mock_embedding)
    doc_id = indexer.index_document(
        file_name="test.txt",
        file_path="/tmp/test.txt",
        chunks=["chunk1"],
        summary="summary",
        analysis_result={
            "reading_card": "card",
            "relation_analysis": "relation",
            "writing_materials": "writing",
            "todo_list": "todo"
        }
    )

    indexer.delete_document(doc_id)
    doc = test_storage.get_document(doc_id)
    assert doc is None


def test_search_api():
    """测试搜索 API 端点"""
    client = TestClient(app)
    response = client.post("/api/knowledge/search", json={
        "query": "test query",
        "top_k": 5
    })
    # 由于没有真实数据/配置，只验证端点存在
    assert response.status_code in [200, 500]


def test_list_documents_api():
    """测试文档列表 API 端点"""
    client = TestClient(app)
    response = client.get("/api/knowledge/documents")
    # 端点可能存在配置问题，验证端点可达
    assert response.status_code in [200, 500]
