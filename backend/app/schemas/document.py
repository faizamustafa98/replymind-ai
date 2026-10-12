"""Request/response models for knowledge-base documents and the KB page payload."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.schemas.tenant import BusinessInfoOut


class DocumentOut(BaseModel):
    id: str
    tenant_id: str
    file_name: str
    file_type: str
    file_size_bytes: int | None = None
    file_url: str
    status: str
    document_type: str | None = None
    chunk_count: int | None = None
    version: int
    checksum: str | None = None
    error_message: str | None = None
    metadata: dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime


class DocumentUpdate(BaseModel):
    """All fields optional — PATCH only touches fields the client sends."""

    document_type: str | None = None
    metadata: dict[str, Any] | None = None


class KnowledgeBaseOut(BaseModel):
    """Combined payload for the Knowledge Base page's single page-load GET."""

    business_info: BusinessInfoOut
    documents: list[DocumentOut]
