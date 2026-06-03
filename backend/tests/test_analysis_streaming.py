import json
import pytest

from fastapi.testclient import TestClient
from backend.main import app
import backend.api.analysis as analysis_module


class HangingOrchestrator:
    """Orchestrator that yields progress events but never terminates."""

    def run_streaming(self, **kwargs):
        yield {"current": 1, "total": 1}
        # Simulate a hung worker — block until test kills us
        import time
        while True:
            time.sleep(0.1)


def test_stream_emits_error_on_worker_timeout(monkeypatch):
    """When the worker thread never finishes, stream must emit event: error."""
    monkeypatch.setattr(analysis_module, "WORKER_TIMEOUT", 1)
    monkeypatch.setattr(
        analysis_module, "Orchestrator", lambda agents: HangingOrchestrator()
    )

    client = TestClient(app)
    with client.stream(
        "POST",
        "/api/analysis/gateway",
        json={
            "doc_id": "doc-timeout",
            "file_name": "test.txt",
            "file_type": "txt",
            "text": "some text to analyze",
            "knowledge_base_id": "kb-1",
        },
    ) as response:
        assert response.status_code == 200
        body = ""
        found_error = False
        for line in response.iter_lines():
            body += line + "\n"
            if "event: error" in line:
                found_error = True
            if found_error and line.startswith("data:"):
                break

        assert "event: error" in body
        assert "timed out" in body


def test_loop_uses_get_running_loop():
    """analyze_gateway must use asyncio.get_running_loop(), not get_event_loop()."""
    import inspect
    source = inspect.getsource(analysis_module.analyze_gateway)
    assert "get_running_loop" in source
    assert "get_event_loop" not in source
