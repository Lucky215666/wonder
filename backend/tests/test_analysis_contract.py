from fastapi.testclient import TestClient
from backend.main import app
from backend.models.schemas import (
    GatewayAnalysisRequest,
    GatewayAnalysisResponse,
    KnowledgeIndexRequest,
    KnowledgeQARequest,
)


def test_gateway_analysis_request_accepts_ts_ids_and_context():
    req = GatewayAnalysisRequest(
        doc_id="doc-1",
        file_name="paper.pdf",
        file_type="pdf",
        text="retrieval augmented generation paper",
        knowledge_base_id="kb-1",
        knowledge_base_readme="# RAG",
        global_profile="Graduate student studying RAG.",
    )

    assert req.doc_id == "doc-1"
    assert req.knowledge_base_id == "kb-1"
    assert req.max_chars == 7000
    assert req.overlap == 500


def test_gateway_analysis_response_supports_partial_agent_results():
    res = GatewayAnalysisResponse(
        doc_id="doc-1",
        file_name="paper.pdf",
        status="partial",
        failed_agents=["writing"],
        reading_card="card",
        relation_analysis="relation",
        writing_materials="",
        todo_list="todo",
        summary="summary",
        tags=["rag"],
        source_chunks=[],
    )

    assert res.status == "partial"
    assert res.failed_agents == ["writing"]


def test_knowledge_requests_are_kb_scoped():
    index_req = KnowledgeIndexRequest(
        doc_id="doc-1",
        knowledge_base_id="kb-1",
        file_name="paper.pdf",
        file_path="data/uploads/paper.pdf",
        chunks=["chunk"],
        summary="summary",
        analysis_result={"reading_card": "card"},
        tags=["rag"],
    )
    qa_req = KnowledgeQARequest(question="What is RAG?", knowledge_base_id="kb-1")

    assert index_req.knowledge_base_id == "kb-1"
    assert qa_req.knowledge_base_id == "kb-1"


def test_health_alias_available():
    client = TestClient(app)
    res = client.get("/health")

    assert res.status_code == 200
    assert res.json()["status"] == "ok"
