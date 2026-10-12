"""Vector retrieval for a tenant's indexed knowledge-base documents."""

import asyncio
import logging
from functools import lru_cache

from google import genai
from google.genai import types

from app.config.settings import EMBEDDING_DIMENSIONS, GEMINI_API_KEY, GEMINI_EMBEDDING_MODEL
from app.exceptions import UpstreamServiceError, ValidationError
from app.repositories import embedding_repo

logger = logging.getLogger("replymind")
DEFAULT_TOP_K = 4
MAX_TOP_K = 20


@lru_cache
def _get_client() -> genai.Client:
    """Create the Gemini client only when retrieval is requested."""
    if not GEMINI_API_KEY:
        raise UpstreamServiceError("GEMINI_API_KEY must be set before searching documents")
    return genai.Client(api_key=GEMINI_API_KEY)


async def get_relevant_chunks(
    tenant_id: str, query_text: str, top_k: int = DEFAULT_TOP_K
) -> tuple[list[str], float]:
    """Return the most similar chunks and the highest cosine-similarity score.

    Both SDK calls are synchronous, so they are moved off FastAPI's event loop.
    Results are tenant-scoped by the database RPC function.
    """
    normalized_query = query_text.strip().lower()
    if not normalized_query:
        raise ValidationError("Search query must not be empty")
    if not 1 <= top_k <= MAX_TOP_K:
        raise ValidationError(f"top_k must be between 1 and {MAX_TOP_K}")

    query_embedding = await asyncio.to_thread(_embed_query, normalized_query)
    rows = await asyncio.to_thread(
        embedding_repo.search_similar, query_embedding, tenant_id, top_k
    )
    if not rows:
        return [], 0.0

    chunks = [row["content"] for row in rows if row.get("content")]
    top_score = float(rows[0].get("similarity") or 0.0)
    logger.info(
        "Retrieved %d document chunks for tenant=%s (top similarity=%.3f)",
        len(chunks),
        tenant_id,
        top_score,
    )
    return chunks, top_score


@lru_cache(maxsize=512)
def _embed_query(query_text: str) -> list[float]:
    # Held in a local rather than chained inline: two concurrent to_thread
    # calls sharing the cached client raced when the SDK's Client.__del__
    # closed the underlying httpx connection out from under the other
    # in-flight request ("Cannot send a request, as the client has been
    # closed."). A named local keeps this call a GC root for the SDK object
    # for the full duration of the request, immune to that race.
    client = _get_client()
    try:
        response = client.models.embed_content(
            model=GEMINI_EMBEDDING_MODEL,
            contents=query_text,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_QUERY",
                output_dimensionality=EMBEDDING_DIMENSIONS,  # 768 — required, else defaults to 3072
            ),
        )
        values = response.embeddings[0].values if response.embeddings else None
        if not values:
            raise ValueError("Gemini returned no query embedding")
        return values
    except UpstreamServiceError:
        raise
    except Exception as exc:
        raise UpstreamServiceError("Failed to embed search query") from exc
