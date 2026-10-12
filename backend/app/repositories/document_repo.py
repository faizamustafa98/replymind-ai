"""Supabase Storage + documents-table access (upload, download, CRUD)."""

from app.db.client import get_supabase
from app.exceptions import NotFoundError, UpstreamServiceError

STORAGE_BUCKET = "documents"


def upload_file(tenant_id: str, file_name: str, content: bytes, content_type: str) -> str:
    path = f"tenants/{tenant_id}/{file_name}"
    try:
        get_supabase().storage.from_(STORAGE_BUCKET).upload(
            path, content, {"content-type": content_type, "upsert": "true"}
        )
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to upload file to storage: {exc}") from exc
    return path


def delete_file(path: str) -> None:
    try:
        get_supabase().storage.from_(STORAGE_BUCKET).remove([path])
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to delete file from storage: {exc}") from exc


def download_file(path: str) -> bytes:
    try:
        return get_supabase().storage.from_(STORAGE_BUCKET).download(path)
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to download file from storage: {exc}") from exc


def create_document(tenant_id: str, fields: dict) -> dict:
    row = {**fields, "tenant_id": tenant_id}
    try:
        response = get_supabase().table("documents").insert(row).execute()
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to create document record: {exc}") from exc
    if not response.data:
        raise UpstreamServiceError("Document insert returned no data")
    return response.data[0]


def list_documents(tenant_id: str) -> list[dict]:
    try:
        response = (
            get_supabase()
            .table("documents")
            .select("*")
            .eq("tenant_id", tenant_id)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to list documents: {exc}") from exc
    return response.data or []


def get_document(tenant_id: str, document_id: str) -> dict:
    try:
        response = (
            get_supabase()
            .table("documents")
            .select("*")
            .eq("tenant_id", tenant_id)
            .eq("id", document_id)  # scoped to tenant_id so tenants can't read each other's documents
            .limit(1)
            .execute()
        )
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to fetch document: {exc}") from exc
    if not response.data:
        raise NotFoundError(f"Document {document_id} not found")
    return response.data[0]


def update_document(tenant_id: str, document_id: str, fields: dict) -> dict:
    try:
        response = (
            get_supabase()
            .table("documents")
            .update(fields)
            .eq("tenant_id", tenant_id)
            .eq("id", document_id)
            .execute()
        )
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to update document: {exc}") from exc
    if not response.data:
        raise NotFoundError(f"Document {document_id} not found")
    return response.data[0]


def delete_document(tenant_id: str, document_id: str) -> None:
    try:
        response = (
            get_supabase()
            .table("documents")
            .delete()
            .eq("tenant_id", tenant_id)
            .eq("id", document_id)
            .execute()
        )
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to delete document: {exc}") from exc
    if not response.data:
        raise NotFoundError(f"Document {document_id} not found")
