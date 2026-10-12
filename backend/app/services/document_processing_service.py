"""Background document pipeline: download → extract → chunk → embed → store."""

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from functools import lru_cache

from google import genai
from google.genai import types

from app.config.settings import (
    CHUNK_OVERLAP,
    CHUNK_SIZE,
    EMBEDDING_DIMENSIONS,
    GEMINI_API_KEY,
    GEMINI_EMBEDDING_MODEL,
)
from app.repositories import document_repo, embedding_repo, message_repo
from app.services import rag_pipeline_service
from app.utils.chunking import chunk_text, count_tokens
from app.utils.text_extraction import extract_text

logger = logging.getLogger("replymind")

# Gemini's embedContent accepts many chunks per call; cap the batch so a large
# document is embedded in a few requests rather than one oversized one.
EMBED_BATCH_SIZE = 100


@lru_cache
def _get_client() -> genai.Client:
    """Build the Gemini client only when a document is actually processed.

    This keeps health checks and all non-RAG endpoints available when the
    optional embedding credential has not yet been configured.
    """
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY must be set before processing documents")
    return genai.Client(api_key=GEMINI_API_KEY)


def _embed_chunks(chunks: list[str]) -> list[list[float]]:
    """Embed document chunks with Gemini, in batches, forced to 768 dimensions."""
    client = _get_client()
    vectors: list[list[float]] = []
    for start in range(0, len(chunks), EMBED_BATCH_SIZE):
        batch = chunks[start:start + EMBED_BATCH_SIZE]
        response = client.models.embed_content(
            model=GEMINI_EMBEDDING_MODEL,
            contents=batch,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
                output_dimensionality=EMBEDDING_DIMENSIONS,  # 768 — required, else defaults to 3072
            ),
        )
        vectors.extend(embedding.values for embedding in response.embeddings)
    return vectors


def process_document(tenant_id: str, document_id: str, storage_path: str, file_type: str) -> None:
    """Background pipeline: extract text -> chunk -> embed -> store.

    Runs after upload_document/replace_document already persisted the file and
    row (status="processing"), so its only job here is to move documents.status
    to "ready" or "failed" once chunking/embedding finishes.
    """
    try:
        content = document_repo.download_file(storage_path)
        text = extract_text(content, file_type)
        chunks = chunk_text(text, CHUNK_SIZE, CHUNK_OVERLAP)

        if not chunks:
            raise ValueError("No extractable text found in document")

        vectors = _embed_chunks(chunks)

        now = datetime.now(timezone.utc).isoformat()
        rows = [
            {
                "id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                "document_id": document_id,
                "chunk_index": index,
                "content": chunk,
                "embedding": vector,
                "embedding_model": GEMINI_EMBEDDING_MODEL,
                "token_count": count_tokens(chunk),
                "metadata": {},
                "created_at": now,
            }
            for index, (chunk, vector) in enumerate(zip(chunks, vectors))
        ]

        embedding_repo.insert_many(rows)
        document_repo.update_document(
            tenant_id, document_id, {"status": "ready", "chunk_count": len(chunks)}
        )
        _redraft_pending_messages(tenant_id)

    except Exception as exc:
        logger.exception("Document processing failed for document_id=%s", document_id)
        document_repo.update_document(
            tenant_id, document_id, {"status": "failed", "error_message": str(exc)}
        )


def _redraft_pending_messages(tenant_id: str) -> None:
    """Retries AI drafting for inbound messages that never got a draft —
    typically because this tenant's knowledge base was still empty when they
    first arrived. Runs synchronously in this background thread, so it's safe
    to call asyncio.run() here without clashing with the main event loop.
    """
    try:
        pending = message_repo.fetch_undrafted_inbound_messages(tenant_id)
    except Exception:
        logger.exception("Failed to look up undrafted messages for tenant=%s", tenant_id)
        return
    if not pending:
        return

    async def _regenerate_all():
        await asyncio.gather(
            *(_regenerate_one(tenant_id, message["id"]) for message in pending),
            return_exceptions=True,
        )

    asyncio.run(_regenerate_all())


async def _regenerate_one(tenant_id: str, message_id: str) -> None:
    try:
        await rag_pipeline_service.generate_draft_for_message(tenant_id, message_id)
    except Exception:
        logger.exception("Redraft failed for message_id=%s", message_id)
