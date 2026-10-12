"""Stores, deletes, and vector-searches document embeddings in Supabase (pgvector)."""

from app.db.client import get_supabase
from app.exceptions import UpstreamServiceError


def insert_many(rows: list[dict]) -> None:
    try:
        get_supabase().table("embeddings").insert(rows).execute()
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to store document embeddings: {exc}") from exc


def delete_by_document(document_id: str) -> None:
    try:
        get_supabase().table("embeddings").delete().eq("document_id", document_id).execute()
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to delete document embeddings: {exc}") from exc


def delete_by_tenant(tenant_id: str) -> None:
    try:
        get_supabase().table("embeddings").delete().eq("tenant_id", tenant_id).execute()
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to delete tenant embeddings: {exc}") from exc


def search_similar(query_embedding: list[float], tenant_id: str, match_count: int) -> list[dict]:
    try:
        result = get_supabase().rpc(
            "match_embeddings",
            {
                "query_embedding": query_embedding,
                "match_tenant_id": tenant_id,
                "match_count": match_count,
            },
        ).execute()
        return result.data or []
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to search document embeddings: {exc}") from exc