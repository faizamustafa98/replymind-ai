import asyncio

from app.services import rag_pipeline_service as pipeline


def _stub_message(content: str) -> dict:
    """An inbound row shaped like the real one — the pipeline needs
    conversation_id and created_at to look up the preceding turns."""
    return {
        "direction": "inbound",
        "content": content,
        "conversation_id": "conversation-1",
        "created_at": "2026-07-24T10:00:00+00:00",
    }


def _patch_message(monkeypatch, content: str, history: list[dict] | None = None):
    monkeypatch.setattr(pipeline.message_repo, "fetch_message_by_id", lambda *_: _stub_message(content))
    monkeypatch.setattr(
        pipeline.message_repo, "fetch_recent_messages_before", lambda *_: list(history or [])
    )


def test_acknowledgement_is_discarded_without_retrieval(monkeypatch):
    updates = []
    _patch_message(monkeypatch, "Thanks, appreciate it!")

    async def classify(*_):
        return {"reply_needed": False, "confidence": 0.98}

    monkeypatch.setattr(pipeline.classification_service, "classify_message", classify)
    monkeypatch.setattr(
        pipeline.message_repo,
        "update_message_status_in_db",
        lambda *args: updates.append(args),
    )

    result = asyncio.run(pipeline.generate_draft_for_message("tenant-1", "message-1"))

    assert result["reply_needed"] is False
    assert result["generated"] is False
    # is_question stays True: a discarded message still belongs in the Inbox.
    # Only a manual reject moves a conversation into the Rejected view.
    assert updates == [
        (
            "message-1",
            "tenant-1",
            {"is_question": True, "question_confidence": 0.98, "draft_status": "discarded"},
        )
    ]


def test_question_retrieves_generates_and_saves_draft(monkeypatch):
    updates = []
    _patch_message(monkeypatch, "Do you deliver on Sundays?")
    monkeypatch.setattr(
        pipeline.tenant_repo,
        "get_tenant",
        lambda *_: {"business_name": "Acme Foods", "rag_confidence_threshold": 0.8},
    )

    async def classify(*_, **__):
        return {"reply_needed": True, "confidence": 0.95}

    async def retrieve(*_):
        return ["Sunday delivery is available from 10 AM to 4 PM."], 0.93

    async def generate(*_):
        return "Yes, we deliver Sundays from 10 AM to 4 PM."

    monkeypatch.setattr(pipeline.classification_service, "classify_message", classify)
    monkeypatch.setattr(pipeline.embeddings_service, "get_relevant_chunks", retrieve)
    monkeypatch.setattr(pipeline.generation_service, "generate_draft", generate)
    monkeypatch.setattr(
        pipeline.message_repo,
        "update_message_status_in_db",
        lambda *args: updates.append(args),
    )

    result = asyncio.run(pipeline.generate_draft_for_message("tenant-1", "message-1"))

    assert result["generated"] is True
    assert result["draft"] == "Yes, we deliver Sundays from 10 AM to 4 PM."
    assert updates == [
        (
            "message-1",
            "tenant-1",
            {
                "is_question": True,
                "question_confidence": 0.95,
                "ai_draft": "Yes, we deliver Sundays from 10 AM to 4 PM.",
                "rag_confidence": 0.93,
                "retrieved_chunks": ["Sunday delivery is available from 10 AM to 4 PM."],
                "draft_status": "ready",
            },
        )
    ]


def test_low_similarity_offers_the_ungrounded_fallback_draft(monkeypatch):
    updates = []
    _patch_message(monkeypatch, "Can you book an international flight?")
    monkeypatch.setattr(
        pipeline.tenant_repo,
        "get_tenant",
        lambda *_: {"rag_confidence_threshold": 0.8, "business_name": "Usher Fries"},
    )

    async def classify(*_, **__):
        return {"reply_needed": True, "confidence": 0.99}

    async def retrieve(*_):
        return ["We are a local restaurant."], 0.12

    async def generate(*_):
        raise AssertionError("generation must not run below the threshold")

    monkeypatch.setattr(pipeline.classification_service, "classify_message", classify)
    monkeypatch.setattr(pipeline.embeddings_service, "get_relevant_chunks", retrieve)
    monkeypatch.setattr(pipeline.generation_service, "generate_draft", generate)
    monkeypatch.setattr(
        pipeline.message_repo,
        "update_message_status_in_db",
        lambda *args: updates.append(args),
    )

    result = asyncio.run(pipeline.generate_draft_for_message("tenant-1", "message-1"))

    assert result["reply_needed"] is True
    # A draft is offered so the owner never sees a question with an empty draft,
    # but it's the local fallback — the model is never asked to improvise an
    # answer it has no context for.
    assert result["generated"] is True
    assert "Usher Fries" in result["draft"]
    # The real (low) confidence is preserved, which is what keeps this draft
    # below every auto-reply threshold so it can only go out after approval.
    assert result["rag_confidence"] == 0.12
    assert updates == [
        (
            "message-1",
            "tenant-1",
            {
                "is_question": True,
                "question_confidence": 0.99,
                "ai_draft": result["draft"],
                "rag_confidence": 0.12,
                "retrieved_chunks": ["We are a local restaurant."],
                "draft_status": "ready",
            },
        )
    ]


def test_follow_up_is_read_in_the_context_of_the_thread(monkeypatch):
    """A bare follow-up must reach both AI stages with its preceding turns.

    "Deliver?" on its own was classified as noise and embedded to a useless
    vector; the referent lives in the message before it.
    """
    seen = {}
    history = [
        {"direction": "inbound", "content": "What menu do you people have"},
        {"direction": "outbound", "content": "We serve burgers, wraps and fries."},
    ]
    _patch_message(monkeypatch, "Deliver?", history)
    monkeypatch.setattr(
        pipeline.tenant_repo,
        "get_tenant",
        lambda *_: {"business_name": "Usher Fries", "rag_confidence_threshold": 0.3},
    )

    async def classify(content, hist):
        seen["classify"] = (content, hist)
        return {"reply_needed": True, "confidence": 0.8}

    async def retrieve(_tenant_id, query):
        seen.setdefault("queries", []).append(query)
        # The bare follow-up finds the delivery chunk; the context-expanded
        # query finds the earlier topic's chunk.
        return (["We deliver within 5km."], 0.7) if query == "Deliver?" else (["Our menu is..."], 0.6)

    async def generate(_tenant, question, chunks, hist):
        seen["generate"] = (question, hist)
        seen["chunks"] = chunks
        return "Yes, we deliver within 5km."

    monkeypatch.setattr(pipeline.classification_service, "classify_message", classify)
    monkeypatch.setattr(pipeline.embeddings_service, "get_relevant_chunks", retrieve)
    monkeypatch.setattr(pipeline.generation_service, "generate_draft", generate)
    monkeypatch.setattr(pipeline.message_repo, "update_message_status_in_db", lambda *_: None)

    result = asyncio.run(pipeline.generate_draft_for_message("tenant-1", "message-1"))

    assert result["generated"] is True
    # The classifier judges the last message but can see what came before it.
    assert seen["classify"] == ("Deliver?", history)
    # Both searches run: the context-expanded query (which is what makes a bare
    # follow-up retrievable at all) and the follow-up on its own.
    assert seen["queries"] == ["What menu do you people have\nDeliver?", "Deliver?"]
    # Only the customer's own turn expands the query, never the business's reply.
    assert "We serve burgers" not in seen["queries"][0]
    # The follow-up's own matches lead, so the chunk that answers what was just
    # asked is in front of the model rather than the previous topic's.
    assert seen["chunks"] == ["We deliver within 5km.", "Our menu is..."]
    # Confidence is the better of the two searches.
    assert result["rag_confidence"] == 0.7
    # The generator still answers the actual question, with history as context.
    assert seen["generate"] == ("Deliver?", history)


def test_history_is_trimmed_to_the_newest_turns_within_budget(monkeypatch):
    monkeypatch.setattr(pipeline.settings, "HISTORY_MAX_CHARS", 20)

    trimmed = pipeline._trim_history(
        [
            {"direction": "inbound", "content": "x" * 50},   # too long, drops out
            {"direction": "outbound", "content": "older"},   # 5
            {"direction": "inbound", "content": "newest"},   # 6
            {"direction": "inbound", "content": "   "},      # empty once stripped
        ]
    )

    assert trimmed == [
        {"direction": "outbound", "content": "older"},
        {"direction": "inbound", "content": "newest"},
    ]


