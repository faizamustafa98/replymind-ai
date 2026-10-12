"""Route-level regression check for POST /api/rag/messages/{message_id}/draft —
confirms the full HTTP wiring (main.py -> routes/rag.py -> rag_pipeline_service)
still works after removing the rag_service.py re-export shim."""

from fastapi.testclient import TestClient

from app.main import app
from app.middleware.auth import get_current_tenant_id
from app.services import rag_pipeline_service as pipeline


def test_generate_draft_route_returns_generated_reply(monkeypatch):
    monkeypatch.setattr(
        pipeline.message_repo,
        "fetch_message_by_id",
        lambda *_: {
            "direction": "inbound",
            "content": "Do you deliver on Sundays?",
            "conversation_id": "conversation-1",
            "created_at": "2026-07-24T10:00:00+00:00",
        },
    )
    monkeypatch.setattr(pipeline.message_repo, "fetch_recent_messages_before", lambda *_: [])
    monkeypatch.setattr(
        pipeline.tenant_repo,
        "get_tenant",
        lambda *_: {"business_name": "Acme Foods", "rag_confidence_threshold": 0.3},
    )

    async def classify(*_):
        return {"reply_needed": True, "confidence": 0.95}

    async def retrieve(*_):
        return ["Sunday delivery is available from 10 AM to 4 PM."], 0.9

    async def generate(*_):
        return "Yes, we deliver Sundays from 10 AM to 4 PM."

    monkeypatch.setattr(pipeline.classification_service, "classify_message", classify)
    monkeypatch.setattr(pipeline.embeddings_service, "get_relevant_chunks", retrieve)
    monkeypatch.setattr(pipeline.generation_service, "generate_draft", generate)
    monkeypatch.setattr(pipeline.message_repo, "update_message_status_in_db", lambda *args: None)

    app.dependency_overrides[get_current_tenant_id] = lambda: "tenant-1"
    try:
        response = TestClient(app).post("/api/rag/messages/message-1/draft")
    finally:
        app.dependency_overrides.pop(get_current_tenant_id, None)

    assert response.status_code == 200
    body = response.json()
    assert body["message_id"] == "message-1"
    assert body["generated"] is True
    assert body["draft"] == "Yes, we deliver Sundays from 10 AM to 4 PM."
