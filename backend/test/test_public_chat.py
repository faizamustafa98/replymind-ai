"""Tests for the unauthenticated landing-page chatbot: the streaming generator
in generation_service, and the /api/public/chat route wired on top of it."""

import asyncio

from fastapi.testclient import TestClient

from app.main import app
from app.services import embeddings_service, generation_service


class _FakeEvent:
    def __init__(self, type_, delta=None):
        self.type = type_
        self.delta = delta


class _FakeAsyncStream:
    def __init__(self, events):
        self._events = events

    async def __aiter__(self):
        for event in self._events:
            yield event


class _FakeResponses:
    def __init__(self, events):
        self._events = events

    async def create(self, **_kwargs):
        return _FakeAsyncStream(self._events)


class _FakeAsyncClient:
    def __init__(self, events):
        self.responses = _FakeResponses(events)


def test_generate_reply_stream_yields_only_text_deltas(monkeypatch):
    events = [
        _FakeEvent("response.output_text.delta", "Yes, "),
        _FakeEvent("response.output_text.delta", "we deliver on Sundays."),
        _FakeEvent("response.completed"),
    ]
    monkeypatch.setattr(generation_service, "_get_async_client", lambda: _FakeAsyncClient(events))

    async def collect():
        return [
            chunk
            async for chunk in generation_service.generate_reply_stream(
                "Do you deliver on Sundays?", ["Sunday delivery is available."], "ReplyMind Product"
            )
        ]

    assert asyncio.run(collect()) == ["Yes, ", "we deliver on Sundays."]


def test_public_chat_route_streams_generated_reply(monkeypatch):
    async def fake_get_relevant_chunks(_tenant_id, _query, top_k=4):
        return (["ReplyMind offers Free, Pro, and Business plans."], 0.4)

    async def fake_generate_reply_stream(_question, _chunks, _persona):
        yield "We have "
        yield "three pricing plans."

    monkeypatch.setattr(embeddings_service, "get_relevant_chunks", fake_get_relevant_chunks)
    monkeypatch.setattr(generation_service, "generate_reply_stream", fake_generate_reply_stream)

    client = TestClient(app)
    response = client.post("/api/public/chat", json={"message": "What are your pricing plans?"})

    assert response.status_code == 200
    assert response.text == "We have three pricing plans."


def test_public_chat_rejects_empty_message():
    client = TestClient(app)
    response = client.post("/api/public/chat", json={"message": ""})
    assert response.status_code == 422
