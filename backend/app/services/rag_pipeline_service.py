"""The complete inbound-message pipeline: classify, retrieve, generate, persist."""

import asyncio
import logging
import time

from app.config import settings
from app.exceptions import NotFoundError, ValidationError
from app.repositories import message_repo, tenant_repo
from app.services import classification_service, embeddings_service, generation_service

logger = logging.getLogger("replymind")


async def generate_draft_for_message(tenant_id: str, message_id: str) -> dict:
    """Process one inbound message and return its draft-generation outcome."""
    start_total = time.perf_counter()
    message = await asyncio.to_thread(message_repo.fetch_message_by_id, message_id, tenant_id)
    if not message:
        raise NotFoundError(f"No message found with id '{message_id}' for this tenant")
    if message.get("direction") != "inbound":
        raise ValidationError("RAG drafts can only be generated for inbound messages")

    content = (message.get("content") or "").strip()
    if not content:
        raise ValidationError("Cannot process an empty message")

    # Everything below reads the message in the context of its thread. Without
    # this a follow-up like "Deliver?" or "how much?" was classified and
    # embedded as a standalone string, with its referent left behind in the
    # previous turn — the single biggest source of dropped drafts.
    history = await asyncio.to_thread(
        message_repo.fetch_recent_messages_before,
        message["conversation_id"],
        tenant_id,
        message["created_at"],
        settings.HISTORY_MAX_MESSAGES,
    )
    history = _trim_history(history)

    start = time.perf_counter()
    classification = await classification_service.classify_message(content, history)
    logger.info("Timing message=%s stage=classify duration=%.3fs", message_id, time.perf_counter() - start)
    if not classification["reply_needed"]:
        # No draft is generated, but the message stays in the inbox
        # (is_question=True). "Rejected" is a manual action only — is_question is
        # flipped to False solely by conversation_service.reject_conversation, so
        # classification never auto-routes anything into the Rejected view.
        await _update_message(message_id, tenant_id, {
            "is_question": True,
            "question_confidence": classification["confidence"],
            "draft_status": "discarded",
        })
        logger.info("Timing message=%s stage=total duration=%.3fs path=no_reply_needed", message_id, time.perf_counter() - start_total)
        return _result(message_id, classification, generated=False, draft=None, confidence=0.0, threshold=0.0, chunks=[])

    # Tenant lookup and retrieval don't depend on each other — the tenant record
    # is only needed afterward, to compare confidence against its threshold.
    # Running them concurrently overlaps the DB read with the retrieval calls
    # instead of paying for both in sequence. Retrieve is timed from inside the
    # gather so the logged duration is retrieval's own time, not skewed by
    # however long the concurrent tenant lookup happens to take.
    async def _timed_retrieve():
        start = time.perf_counter()
        result = await _retrieve(tenant_id, content, history)
        logger.info("Timing message=%s stage=retrieve duration=%.3fs", message_id, time.perf_counter() - start)
        return result

    (tenant, (chunks, confidence)) = await asyncio.gather(
        asyncio.to_thread(tenant_repo.get_tenant, tenant_id),
        _timed_retrieve(),
    )
    threshold = float(tenant.get("rag_confidence_threshold") or 0.0)
    grounded = bool(chunks) and confidence >= threshold
    if not grounded:
        # Previously this returned with no draft at all, which made behaviour on
        # off-topic questions look random: when retrieval happened to clear the
        # threshold the owner got a "I can't confirm that" draft, and when it
        # didn't they got an empty inbox row. Every question now gets a
        # reviewable draft. Confidence stays the real (low) value, so this can
        # never clear the auto-reply threshold — it waits for approval.
        logger.info(
            "RAG draft ungrounded for message=%s: confidence=%.3f threshold=%.3f",
            message_id, confidence, threshold,
        )
        draft = _fallback_draft(tenant)
        await _update_message(message_id, tenant_id, {
            "is_question": True,
            "question_confidence": classification["confidence"],
            "ai_draft": draft,
            "rag_confidence": confidence,
            "retrieved_chunks": chunks,
            "draft_status": "ready",
        })
        logger.info("Timing message=%s stage=total duration=%.3fs path=ungrounded", message_id, time.perf_counter() - start_total)
        return _result(message_id, classification, generated=True, draft=draft, confidence=confidence, threshold=threshold, chunks=chunks)

    start = time.perf_counter()
    draft = await generation_service.generate_draft(tenant, content, chunks, history)
    logger.info("Timing message=%s stage=generate duration=%.3fs", message_id, time.perf_counter() - start)
    await _update_message(message_id, tenant_id, {
        "is_question": True,
        "question_confidence": classification["confidence"],
        "ai_draft": draft,
        "rag_confidence": confidence,
        # Persisted so a draft can be audited after the fact — which sources
        # produced this answer. The column existed but was never written.
        "retrieved_chunks": chunks,
        "draft_status": "ready",
    })
    logger.info("Timing message=%s stage=total duration=%.3fs path=generated", message_id, time.perf_counter() - start_total)
    return _result(message_id, classification, generated=True, draft=draft, confidence=confidence, threshold=threshold, chunks=chunks)


def _trim_history(history: list[dict]) -> list[dict]:
    """Drop empty turns and keep the newest ones inside the character budget.

    Trimming from the end backwards means an unusually long earlier message
    gets dropped rather than truncating the recent turns that actually carry
    the follow-up's referent.
    """
    kept: list[dict] = []
    remaining = settings.HISTORY_MAX_CHARS
    for entry in reversed(history):
        text = (entry.get("content") or "").strip()
        if not text:
            continue
        if len(text) > remaining:
            break
        kept.append({"direction": entry["direction"], "content": text})
        remaining -= len(text)
    return list(reversed(kept))


async def _retrieve(tenant_id: str, content: str, history: list[dict]) -> tuple[list[str], float]:
    """Retrieve chunks for a message, using its thread to resolve follow-ups.

    Two searches, not one. The context-expanded query is what makes a bare
    "Deliver?" retrievable at all, but it is mostly made of the *earlier*,
    longer turn — so on its own it reliably returns the previous topic's chunks
    and the reply answers the wrong question. Searching for the bare follow-up
    as well, and listing its matches first, keeps the chunks that answer what
    was actually just asked in front of the model.
    """
    expanded = _retrieval_query(content, history)
    if expanded == content:
        return await embeddings_service.get_relevant_chunks(tenant_id, expanded)

    # Neither search depends on the other's result, only the merge below does —
    # running them concurrently instead of back-to-back roughly halves retrieval
    # time on any follow-up message.
    (chunks, confidence), (own_chunks, own_confidence) = await asyncio.gather(
        embeddings_service.get_relevant_chunks(tenant_id, expanded),
        embeddings_service.get_relevant_chunks(tenant_id, content),
    )
    merged = list(dict.fromkeys([*own_chunks, *chunks]))
    return merged, max(confidence, own_confidence)


def _retrieval_query(content: str, history: list[dict]) -> str:
    """Expand a short follow-up with the customer's own recent turns.

    "Deliver?" embeds to a near-useless vector on its own; prefixed with the
    question before it, it retrieves the right chunks. Only inbound turns are
    used — including our own replies would embed our phrasing back into the
    search and outweigh the customer's actual words.
    """
    previous = [
        entry["content"] for entry in history if entry.get("direction") == "inbound"
    ][-settings.RETRIEVAL_HISTORY_TURNS:]
    if not previous:
        return content
    return "\n".join([*previous, content])


def _fallback_draft(tenant: dict) -> str:
    """The draft offered when the knowledge base can't answer the question.

    Written locally rather than by the model: with no retrieved context there is
    nothing to ground a generated answer in, and asking the model to improvise
    one is exactly how a confident wrong answer reaches a customer.
    """
    business = tenant.get("business_name") or "us"
    return (
        f"Thanks for reaching out to {business}! I don't have that detail to hand, "
        "but let me check with the team and get back to you shortly."
    )


async def _update_message(message_id: str, tenant_id: str, fields: dict) -> None:
    await asyncio.to_thread(message_repo.update_message_status_in_db, message_id, tenant_id, fields)


def _result(message_id: str, classification: dict, *, generated: bool, draft: str | None, confidence: float, threshold: float, chunks: list[str]) -> dict:
    return {
        "message_id": message_id,
        "reply_needed": classification["reply_needed"],
        "classification_confidence": classification["confidence"],
        "generated": generated,
        "draft": draft,
        "rag_confidence": confidence,
        "confidence_threshold": threshold,
        "source_chunks": chunks,
    }
