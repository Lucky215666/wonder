from backend.rag.indexer import DocumentIndexer


class FakeEmbedding:
    def embed(self, texts):
        return [[1.0, 0.0, 0.0] for _ in texts]


class FakeStorage:
    def __init__(self):
        self.added = None
        self.inserted = None
        self.deleted = None

    def add_to_collection(self, ids, embeddings, metadatas, documents):
        self.added = {
            "ids": ids,
            "embeddings": embeddings,
            "metadatas": metadatas,
            "documents": documents,
        }

    def insert_document(self, **kwargs):
        self.inserted = kwargs

    def delete_from_collection(self, doc_id, knowledge_base_id=None):
        self.deleted = (doc_id, knowledge_base_id)

    def delete_document(self, doc_id):
        pass


def test_indexer_uses_ts_doc_id_and_kb_metadata():
    storage = FakeStorage()
    indexer = DocumentIndexer(storage, FakeEmbedding())

    doc_id = indexer.index_document(
        doc_id="doc-1",
        knowledge_base_id="kb-1",
        file_name="paper.pdf",
        file_path="data/uploads/paper.pdf",
        chunks=["chunk a", "chunk b"],
        summary="summary",
        analysis_result={"reading_card": "card"},
        tags=["rag", "agents"],
    )

    assert doc_id == "doc-1"
    assert storage.added["ids"] == [
        "doc-1_kb-1_summary",
        "doc-1_kb-1_chunk_0",
        "doc-1_kb-1_chunk_1",
    ]
    assert storage.added["metadatas"][0]["knowledge_base_id"] == "kb-1"
    assert storage.added["metadatas"][0]["chunk_type"] == "summary"
    assert storage.added["metadatas"][1]["chunk_type"] == "content"
    assert storage.added["metadatas"][1]["tags"] == "rag,agents"


def test_delete_document_can_scope_to_knowledge_base():
    storage = FakeStorage()
    indexer = DocumentIndexer(storage, FakeEmbedding())

    indexer.delete_document("doc-1", knowledge_base_id="kb-1")

    assert storage.deleted == ("doc-1", "kb-1")


from backend.rag.retriever import RAGRetriever


class FakeQueryEmbedding:
    def embed_single(self, text):
        return [1.0, 0.0, 0.0]


class FakeQueryStorage:
    def __init__(self):
        self.where_filters = []

    def query_collection(self, query_embeddings, n_results, where=None):
        self.where_filters.append(where)
        if where and where.get("chunk_type") == "summary":
            return {
                "documents": [["summary"]],
                "metadatas": [[{"doc_id": "doc-1", "file_name": "paper.pdf"}]],
                "distances": [[0.1]],
            }
        return {
            "documents": [["chunk"]],
            "metadatas": [[{"doc_id": "doc-1", "file_name": "paper.pdf"}]],
            "distances": [[0.1]],
        }


def test_retriever_filters_summary_and_content_by_kb():
    storage = FakeQueryStorage()
    retriever = RAGRetriever(storage, FakeQueryEmbedding())

    result = retriever.retrieve("question", knowledge_base_id="kb-1")

    assert result.source_doc_ids == ["doc-1"]
    assert storage.where_filters[0] == {
        "$and": [
            {"chunk_type": "summary"},
            {"knowledge_base_id": "kb-1"},
        ]
    }
    assert storage.where_filters[1] == {
        "$and": [
            {"chunk_type": "content"},
            {"knowledge_base_id": "kb-1"},
            {"doc_id": {"$in": ["doc-1"]}},
        ]
    }
