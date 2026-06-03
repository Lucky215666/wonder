import pytest
from backend.core.storage import StorageManager
from backend.core.embedding import EmbeddingClient
from backend.rag.indexer import DocumentIndexer
import os
import shutil


@pytest.fixture
def test_storage():
    """创建测试用存储"""
    storage = StorageManager("test_data/chroma")
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


def test_document_indexing(test_storage, mock_embedding):
    """测试文档入库"""
    indexer = DocumentIndexer(test_storage, mock_embedding)
    doc_id = indexer.index_document(
        doc_id="test-doc-1",
        knowledge_base_id="kb-1",
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
    assert doc_id == "test-doc-1"


def test_document_deletion(test_storage, mock_embedding):
    """测试文档删除"""
    indexer = DocumentIndexer(test_storage, mock_embedding)
    doc_id = indexer.index_document(
        doc_id="test-doc-2",
        knowledge_base_id="kb-1",
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

    indexer.delete_document(doc_id, knowledge_base_id="kb-1")
