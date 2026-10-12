"""Unit tests for tenant-scoped vector retrieval (no live API calls)."""

import asyncio
import os
from types import SimpleNamespace

import pytest

from app.exceptions import ValidationError
from app.repositories import embedding_repo
from app.services import embeddings_service


def test_retrieves_ranked_chunks_and_top_similarity(monkeypatch):
    captured = {}
    fake_client = SimpleNamespace(
        embeddings=SimpleNamespace(
            create=lambda **kwargs: SimpleNamespace(
                data=[SimpleNamespace(embedding=[0.1, 0.2, 0.3])]
            )
        )
    )
    monkeypatch.setattr(embeddings_service, "_get_client", lambda: fake_client)

    def fake_search(embedding, tenant_id, top_k):
        captured.update(embedding=embedding, tenant_id=tenant_id, top_k=top_k)
        return [
            {"content": "Sunday delivery is available.", "similarity": 0.93},
            {"content": "Weekday delivery is available.", "similarity": 0.81},
        ]

    monkeypatch.setattr(embeddings_service.embedding_repo, "search_similar", fake_search)

    chunks, score = asyncio.run(
        embeddings_service.get_relevant_chunks(
            "tenant-123", " Do you deliver on Sundays? ", top_k=2
        )
    )

    assert chunks == ["Sunday delivery is available.", "Weekday delivery is available."]
    assert score == pytest.approx(0.93)
    assert captured == {"embedding": [0.1, 0.2, 0.3], "tenant_id": "tenant-123", "top_k": 2}


def test_returns_no_context_when_search_has_no_matches(monkeypatch):
    monkeypatch.setattr(embeddings_service, "_embed_query", lambda _: [0.1, 0.2])
    monkeypatch.setattr(embeddings_service.embedding_repo, "search_similar", lambda *_: [])

    assert asyncio.run(
        embeddings_service.get_relevant_chunks("tenant-123", "opening hours")
    ) == ([], 0.0)


@pytest.mark.parametrize("query,top_k", [("   ", 4), ("hours", 0), ("hours", 21)])
def test_rejects_invalid_search_input(query, top_k):
    with pytest.raises(ValidationError):
        asyncio.run(embeddings_service.get_relevant_chunks("tenant-123", query, top_k))


def test_repository_calls_tenant_scoped_match_embeddings_rpc(monkeypatch):
    captured = {}

    class FakeRpcCall:
        def execute(self):
            return SimpleNamespace(data=[{"content": "matched", "similarity": 0.9}])

    class FakeSupabase:
        def rpc(self, function_name, params):
            captured.update(function_name=function_name, params=params)
            return FakeRpcCall()

    monkeypatch.setattr(embedding_repo, "get_supabase", lambda: FakeSupabase())

    assert embedding_repo.search_similar([0.1, 0.2], "tenant-123", 4) == [
        {"content": "matched", "similarity": 0.9}
    ]
    assert captured == {
        "function_name": "match_embeddings",
        "params": {
            "query_embedding": [0.1, 0.2],
            "match_tenant_id": "tenant-123",
            "match_count": 4,
        },
    }


@pytest.mark.skipif(
    not os.getenv("TEST_TENANT_ID"),
    reason="Set TEST_TENANT_ID to run the live Supabase/OpenAI retrieval check",
)
def test_live_vector_search():
    """Optional integration check; requires indexed documents for this tenant."""
    chunks, score = asyncio.run(
        embeddings_service.get_relevant_chunks(
            os.environ["TEST_TENANT_ID"],
            os.getenv("TEST_RAG_QUERY", "What are your opening hours?"),
        )
    )
    assert -1.0 <= score <= 1.0
    # A tenant without ready documents is valid, but a configured test tenant
    # should normally have at least one result to verify the full retrieval path.
    assert chunks, "No chunks found: upload and wait for a document to reach status=ready"
