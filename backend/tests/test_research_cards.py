"""Tests for the research card draft agent and API endpoint."""
import json
import pytest
from unittest.mock import MagicMock, patch

from backend.agents.research_card import ResearchCardDraftAgent, normalize_source_refs, linked_doc_ids_from_refs


# ── ResearchCardDraftAgent unit tests ────────────────────────────────────────


class TestResearchCardDraftAgent:
    """Unit tests for the agent's run() and _parse_response() methods."""

    def _make_agent(self, llm_return: str) -> ResearchCardDraftAgent:
        mock_provider = MagicMock()
        mock_provider.chat.return_value = llm_return
        return ResearchCardDraftAgent(model="test-model", provider=mock_provider)

    def test_valid_json_output(self):
        llm_output = json.dumps({
            "question": "What is X?",
            "core_claims": ["X is Y", "X relates to Z"],
            "knowledge_type": "theory",
            "tags": ["x", "y"],
            "sub_direction": "sub-area",
            "validation_notes": "Well supported.",
            "use_cases": ["Use in A"],
            "linked_doc_ids": ["doc-1"],
            "no_paper_evidence": False,
            "evidence_refs": [
                {
                    "doc_id": "doc-1",
                    "file_name": "paper.pdf",
                    "chunk_id": "c1",
                    "chunk_index": 0,
                    "chunk_type": "content",
                    "content": "Some content",
                    "score": 0.9,
                }
            ],
        })
        agent = self._make_agent(llm_output)
        result = agent.run(
            question="What is X?",
            answer="X is Y and relates to Z.",
            source_refs=[{
                "doc_id": "doc-1",
                "file_name": "paper.pdf",
                "chunk_id": "c1",
                "chunk_index": 0,
                "chunk_type": "content",
                "content": "Some content",
                "score": 0.9,
            }],
        )

        assert result["question"] == "What is X?"
        assert result["core_claims"] == ["X is Y", "X relates to Z"]
        assert result["knowledge_type"] == "theory"
        assert result["tags"] == ["x", "y"]
        assert result["sub_direction"] == "sub-area"
        assert result["no_paper_evidence"] is False
        assert len(result["evidence_refs"]) == 1

    def test_json_with_markdown_fences(self):
        llm_output = '```json\n{"question":"Q","core_claims":["C"],"knowledge_type":"finding","tags":[],"sub_direction":"","validation_notes":"","use_cases":[],"linked_doc_ids":[],"no_paper_evidence":true,"evidence_refs":[]}\n```'
        agent = self._make_agent(llm_output)
        result = agent.run(question="Q", answer="A")

        assert result["knowledge_type"] == "finding"
        assert result["no_paper_evidence"] is True

    def test_invalid_json_fallback(self):
        agent = self._make_agent("this is not json at all")
        result = agent.run(question="Q?", answer="A.")

        assert result["question"] == "Q?"
        assert result["knowledge_type"] == "other"
        assert result["no_paper_evidence"] is True
        assert len(result["validation_notes"]) > 0

    def test_empty_llm_output_fallback(self):
        agent = self._make_agent("")
        result = agent.run(question="Q", answer="A")

        assert result["knowledge_type"] == "other"
        assert len(result["core_claims"]) >= 1

    def test_invalid_knowledge_type_clamped_to_other(self):
        llm_output = json.dumps({
            "question": "Q",
            "core_claims": ["C"],
            "knowledge_type": "invalid_type",
            "tags": [],
            "sub_direction": "",
            "validation_notes": "",
            "use_cases": [],
            "linked_doc_ids": [],
            "no_paper_evidence": False,
            "evidence_refs": [],
        })
        agent = self._make_agent(llm_output)
        result = agent.run(question="Q", answer="A")

        assert result["knowledge_type"] == "other"

    def test_tags_normalized_to_lowercase(self):
        llm_output = json.dumps({
            "question": "Q",
            "core_claims": ["C"],
            "knowledge_type": "method",
            "tags": ["  NLP  ", "AI", ""],
            "sub_direction": "",
            "validation_notes": "",
            "use_cases": [],
            "linked_doc_ids": [],
            "no_paper_evidence": False,
            "evidence_refs": [],
        })
        agent = self._make_agent(llm_output)
        result = agent.run(question="Q", answer="A")

        assert "nlp" in result["tags"]
        assert "ai" in result["tags"]
        assert "" not in result["tags"]

    def test_tags_capped_at_five(self):
        llm_output = json.dumps({
            "question": "Q",
            "core_claims": ["C"],
            "knowledge_type": "method",
            "tags": ["a", "b", "c", "d", "e", "f", "g"],
            "sub_direction": "",
            "validation_notes": "",
            "use_cases": [],
            "linked_doc_ids": [],
            "no_paper_evidence": False,
            "evidence_refs": [],
        })
        agent = self._make_agent(llm_output)
        result = agent.run(question="Q", answer="A")

        assert len(result["tags"]) <= 5

    def test_use_cases_capped_at_three(self):
        llm_output = json.dumps({
            "question": "Q",
            "core_claims": ["C"],
            "knowledge_type": "method",
            "tags": [],
            "sub_direction": "",
            "validation_notes": "",
            "use_cases": ["u1", "u2", "u3", "u4"],
            "linked_doc_ids": [],
            "no_paper_evidence": False,
            "evidence_refs": [],
        })
        agent = self._make_agent(llm_output)
        result = agent.run(question="Q", answer="A")

        assert len(result["use_cases"]) <= 3

    def test_no_source_refs_sets_no_paper_evidence(self):
        llm_output = json.dumps({
            "question": "Q",
            "core_claims": ["C"],
            "knowledge_type": "other",
            "tags": [],
            "sub_direction": "",
            "validation_notes": "",
            "use_cases": [],
            "linked_doc_ids": [],
            "no_paper_evidence": True,
            "evidence_refs": [],
        })
        agent = self._make_agent(llm_output)
        result = agent.run(question="Q", answer="A", source_refs=[])

        assert result["no_paper_evidence"] is True

    def test_empty_core_claims_gets_fallback(self):
        llm_output = json.dumps({
            "question": "Q",
            "core_claims": [],
            "knowledge_type": "other",
            "tags": [],
            "sub_direction": "",
            "validation_notes": "",
            "use_cases": [],
            "linked_doc_ids": [],
            "no_paper_evidence": True,
            "evidence_refs": [],
        })
        agent = self._make_agent(llm_output)
        result = agent.run(question="Q", answer="A")

        assert len(result["core_claims"]) >= 1

    def test_answer_mode_passed_to_prompt(self):
        """Verify answer_mode is included in the prompt sent to the LLM."""
        llm_output = json.dumps({
            "question": "Q",
            "core_claims": ["C"],
            "knowledge_type": "other",
            "tags": [],
            "sub_direction": "",
            "validation_notes": "",
            "use_cases": [],
            "linked_doc_ids": [],
            "no_paper_evidence": False,
            "evidence_refs": [],
        })
        mock_provider = MagicMock()
        mock_provider.chat.return_value = llm_output
        agent = ResearchCardDraftAgent(model="test", provider=mock_provider)

        agent.run(
            question="Q",
            answer="A",
            answer_mode="rag_enhanced",
            source_refs=[],
        )

        # Verify the user prompt contains the answer mode
        call_args = mock_provider.chat.call_args
        user_prompt = call_args[1]["messages"][0]["content"] if "messages" in call_args[1] else call_args[0][0]["content"]
        assert "rag_enhanced" in user_prompt

    def test_linked_doc_ids_preserved(self):
        llm_output = json.dumps({
            "question": "Q",
            "core_claims": ["C"],
            "knowledge_type": "finding",
            "tags": [],
            "sub_direction": "",
            "validation_notes": "",
            "use_cases": [],
            "linked_doc_ids": ["doc-1", "doc-3"],
            "no_paper_evidence": False,
            "evidence_refs": [],
        })
        agent = self._make_agent(llm_output)
        result = agent.run(question="Q", answer="A")

        assert result["linked_doc_ids"] == ["doc-1", "doc-3"]

    def test_non_list_fields_handled_gracefully(self):
        """If LLM returns non-list for list fields, agent handles it."""
        llm_output = json.dumps({
            "question": "Q",
            "core_claims": "single claim",
            "knowledge_type": "other",
            "tags": "not-a-list",
            "sub_direction": "",
            "validation_notes": "",
            "use_cases": "also not a list",
            "linked_doc_ids": "nope",
            "no_paper_evidence": False,
            "evidence_refs": "nope",
        })
        agent = self._make_agent(llm_output)
        result = agent.run(question="Q", answer="A")

        assert isinstance(result["linked_doc_ids"], list)
        assert isinstance(result["evidence_refs"], list)


# ── API endpoint integration tests ──────────────────────────────────────────


class TestResearchCardDraftAPI:
    """Integration tests for POST /api/research-cards/draft."""

    def _valid_llm_output(self) -> str:
        return json.dumps({
            "question": "What is transformer architecture?",
            "core_claims": ["Transformers use self-attention", "They process sequences in parallel"],
            "knowledge_type": "theory",
            "tags": ["transformer", "attention"],
            "sub_direction": "NLP architectures",
            "validation_notes": "Well-established finding.",
            "use_cases": ["Text classification", "Machine translation"],
            "linked_doc_ids": ["doc-1"],
            "no_paper_evidence": False,
            "evidence_refs": [
                {
                    "doc_id": "doc-1",
                    "file_name": "attention.pdf",
                    "chunk_id": "c1",
                    "chunk_index": 0,
                    "chunk_type": "content",
                    "content": "Self-attention mechanism...",
                    "score": 0.95,
                }
            ],
        })

    @patch("backend.api.research_cards._build_provider")
    def test_draft_endpoint_returns_200(self, mock_build):
        from backend.main import app

        mock_provider = MagicMock()
        mock_provider.chat.return_value = self._valid_llm_output()
        mock_build.return_value = mock_provider

        from fastapi.testclient import TestClient
        client = TestClient(app)

        response = client.post("/api/research-cards/draft", json={
            "question": "What is transformer architecture?",
            "answer": "Transformers use self-attention mechanism...",
            "source_refs": [
                {
                    "doc_id": "doc-1",
                    "file_name": "attention.pdf",
                    "chunk_id": "c1",
                    "chunk_index": 0,
                    "chunk_type": "content",
                    "content": "Self-attention mechanism...",
                    "score": 0.95,
                }
            ],
        })

        assert response.status_code == 200
        body = response.json()
        assert body["knowledge_type"] == "theory"
        assert "transformer" in body["tags"]
        assert len(body["core_claims"]) == 2

    @patch("backend.api.research_cards._build_provider")
    def test_draft_endpoint_returns_source_refs(self, mock_build):
        from backend.main import app

        mock_provider = MagicMock()
        mock_provider.chat.return_value = self._valid_llm_output()
        mock_build.return_value = mock_provider

        from fastapi.testclient import TestClient
        client = TestClient(app)

        response = client.post("/api/research-cards/draft", json={
            "question": "What is transformer architecture?",
            "answer": "Transformers use self-attention.",
            "source_refs": [
                {
                    "doc_id": "doc-1",
                    "file_name": "attention.pdf",
                    "chunk_id": "c1",
                    "chunk_index": 0,
                    "chunk_type": "content",
                    "content": "Self-attention mechanism...",
                    "score": 0.95,
                }
            ],
        })

        body = response.json()
        assert len(body["evidence_refs"]) == 1
        assert body["evidence_refs"][0]["doc_id"] == "doc-1"
        assert body["evidence_refs"][0]["file_name"] == "attention.pdf"

    @patch("backend.api.research_cards._build_provider")
    def test_draft_endpoint_with_empty_source_refs(self, mock_build):
        from backend.main import app

        llm_output = json.dumps({
            "question": "Q",
            "core_claims": ["General claim"],
            "knowledge_type": "other",
            "tags": [],
            "sub_direction": "",
            "validation_notes": "No evidence.",
            "use_cases": [],
            "linked_doc_ids": [],
            "no_paper_evidence": True,
            "evidence_refs": [],
        })
        mock_provider = MagicMock()
        mock_provider.chat.return_value = llm_output
        mock_build.return_value = mock_provider

        from fastapi.testclient import TestClient
        client = TestClient(app)

        response = client.post("/api/research-cards/draft", json={
            "question": "General question",
            "answer": "General answer",
        })

        assert response.status_code == 200
        body = response.json()
        assert body["no_paper_evidence"] is True
        assert body["evidence_refs"] == []

    @patch("backend.api.research_cards._build_provider")
    def test_draft_endpoint_with_answer_mode(self, mock_build):
        from backend.main import app

        mock_provider = MagicMock()
        mock_provider.chat.return_value = self._valid_llm_output()
        mock_build.return_value = mock_provider

        from fastapi.testclient import TestClient
        client = TestClient(app)

        response = client.post("/api/research-cards/draft", json={
            "question": "Compare A and B",
            "answer": "A and B differ in...",
            "answer_mode": "compare_docs",
            "source_refs": [],
        })

        assert response.status_code == 200

    def test_draft_endpoint_rejects_empty_input(self):
        from backend.main import app

        from fastapi.testclient import TestClient
        client = TestClient(app)

        response = client.post("/api/research-cards/draft", json={
            "question": "   ",
            "answer": "   ",
        })

        assert response.status_code == 400

    @patch("backend.api.research_cards._build_provider")
    def test_draft_endpoint_handles_llm_failure(self, mock_build):
        from backend.main import app

        mock_provider = MagicMock()
        mock_provider.chat.side_effect = RuntimeError("Provider down")
        mock_build.return_value = mock_provider

        from fastapi.testclient import TestClient
        client = TestClient(app)

        response = client.post("/api/research-cards/draft", json={
            "question": "Q",
            "answer": "A",
        })

        assert response.status_code == 200
        body = response.json()
        assert body["knowledge_type"] == "other"
        assert len(body["core_claims"]) >= 1
        assert body["no_paper_evidence"] is True

    @patch("backend.api.research_cards._build_provider")
    def test_draft_endpoint_knowledge_type_defaults_to_other(self, mock_build):
        from backend.main import app

        llm_output = json.dumps({
            "question": "Q",
            "core_claims": ["C"],
            "knowledge_type": "nonexistent",
            "tags": [],
            "sub_direction": "",
            "validation_notes": "",
            "use_cases": [],
            "linked_doc_ids": [],
            "no_paper_evidence": True,
            "evidence_refs": [],
        })
        mock_provider = MagicMock()
        mock_provider.chat.return_value = llm_output
        mock_build.return_value = mock_provider

        from fastapi.testclient import TestClient
        client = TestClient(app)

        response = client.post("/api/research-cards/draft", json={
            "question": "Q",
            "answer": "A",
        })

        assert response.status_code == 200
        assert response.json()["knowledge_type"] == "other"

    @patch("backend.api.research_cards._build_provider")
    def test_draft_endpoint_returns_all_expected_fields(self, mock_build):
        from backend.main import app

        mock_provider = MagicMock()
        mock_provider.chat.return_value = self._valid_llm_output()
        mock_build.return_value = mock_provider

        from fastapi.testclient import TestClient
        client = TestClient(app)

        response = client.post("/api/research-cards/draft", json={
            "question": "Q",
            "answer": "A",
            "source_refs": [],
        })

        body = response.json()
        expected_keys = {
            "question", "core_claims", "knowledge_type", "tags",
            "sub_direction", "validation_notes", "use_cases",
            "linked_doc_ids", "no_paper_evidence", "evidence_refs",
        }
        assert expected_keys == set(body.keys())


# ── Schema tests ─────────────────────────────────────────────────────────────


def test_research_card_draft_request_accepts_legacy_source_ref_doc_id():
    from backend.models.schemas import ResearchCardDraftRequest
    req = ResearchCardDraftRequest(
        question="q",
        answer="a",
        source_refs=[{"doc_id": "doc-1", "content": "evidence", "chunk_type": "content"}],
    )
    assert req.source_refs[0].doc_id == "doc-1"


# ── Helper unit tests ────────────────────────────────────────────────────────


def test_normalize_source_refs_maps_doc_id_to_document_id():
    refs = normalize_source_refs([{"doc_id": "doc-1", "content": "snippet"}])
    assert refs[0]["document_id"] == "doc-1"
    assert refs[0]["snippet"] == "snippet"


def test_fallback_marks_general_answer_as_no_paper_evidence():
    agent = ResearchCardDraftAgent("test", provider=None)
    draft = agent.build_fallback("q", "answer text", "general", [])
    assert draft["no_paper_evidence"] is True
    assert draft["core_claims"] == ["answer text"]
