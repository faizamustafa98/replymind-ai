"""Document upload/replace/delete, enqueuing background chunking + embedding."""

import hashlib
import os
import uuid

from fastapi import BackgroundTasks, UploadFile

from app.exceptions import PayloadTooLargeError, UnsupportedMediaTypeError, ValidationError
from app.repositories import document_repo, embedding_repo
from app.services import document_processing_service, tenant_service

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

CONTENT_TYPES = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "txt": "text/plain",
}


async def _validate_and_read(file: UploadFile) -> tuple[str, str, bytes]:
    """Shared validation for upload and replace. Returns (file_name, extension, content)."""
    # basename strips any directory components a malicious/odd filename could carry,
    # since it ends up directly in the storage path below
    file_name = os.path.basename(file.filename) if file.filename else file.filename
    extension = _extract_extension(file_name)
    if extension not in ALLOWED_EXTENSIONS:
        raise UnsupportedMediaTypeError(
            f"Unsupported file type '.{extension}' — use PDF, DOCX or TXT"
        )

    content = await file.read()
    if not content:
        raise ValidationError("Uploaded file is empty")
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise PayloadTooLargeError("File is larger than 10 MB")

    return file_name, extension, content


async def upload_document(
    tenant_id: str,
    file: UploadFile,
    document_type: str | None,
    background_tasks: BackgroundTasks,
) -> dict:
    file_name, extension, content = await _validate_and_read(file)

    document_id = str(uuid.uuid4())
    checksum = hashlib.sha256(content).hexdigest()
    storage_path = document_repo.upload_file(
        tenant_id, f"{document_id}-{file_name}", content, CONTENT_TYPES[extension]
    )

    # Row is created at status="processing"; chunking/embedding runs in the
    # background so the upload response doesn't wait on the embedding API.
    document = document_repo.create_document(
        tenant_id,
        {
            "id": document_id,
            "file_name": file_name,
            "file_type": extension,
            "file_size_bytes": len(content),
            "file_url": storage_path,
            "status": "processing",
            "document_type": document_type,
            "version": 1,
            "checksum": checksum,
            "metadata": {},
        },
    )

    background_tasks.add_task(
        document_processing_service.process_document, tenant_id, document_id, storage_path, extension
    )

    return document


def list_documents(tenant_id: str) -> list[dict]:
    return document_repo.list_documents(tenant_id)


def get_knowledge_base(tenant_id: str) -> dict:
    return {
        "business_info": tenant_service.get_business_info(tenant_id),
        "documents": document_repo.list_documents(tenant_id),
    }


def get_document(tenant_id: str, document_id: str) -> dict:
    return document_repo.get_document(tenant_id, document_id)


def update_document(tenant_id: str, document_id: str, patch: dict) -> dict:
    if not patch:
        return document_repo.get_document(tenant_id, document_id)
    return document_repo.update_document(tenant_id, document_id, patch)


async def replace_document(
    tenant_id: str, document_id: str, file: UploadFile, background_tasks: BackgroundTasks
) -> dict:
    """Overwrites an existing document's file, bumps its version, and resets it to
    status="processing" / chunk_count=None so the RAG pipeline re-chunks it.
    """
    existing = document_repo.get_document(tenant_id, document_id)
    file_name, extension, content = await _validate_and_read(file)

    checksum = hashlib.sha256(content).hexdigest()
    storage_path = document_repo.upload_file(
        tenant_id, f"{document_id}-{file_name}", content, CONTENT_TYPES[extension]
    )
    if storage_path != existing["file_url"]:
        # new file landed at a different key (filename/extension changed) — drop the old blob
        document_repo.delete_file(existing["file_url"])

    # old chunks belong to the previous file version — drop them before re-embedding
    embedding_repo.delete_by_document(document_id)

    document = document_repo.update_document(
        tenant_id,
        document_id,
        {
            "file_name": file_name,
            "file_type": extension,
            "file_size_bytes": len(content),
            "file_url": storage_path,
            "status": "processing",
            "chunk_count": None,
            "error_message": None,
            "version": existing["version"] + 1,
            "checksum": checksum,
        },
    )

    background_tasks.add_task(
        document_processing_service.process_document, tenant_id, document_id, storage_path, extension
    )

    return document


def delete_document(tenant_id: str, document_id: str) -> None:
    # look up first so we get a 404 (not a silent no-op) when the id doesn't belong to this tenant
    document = document_repo.get_document(tenant_id, document_id)
    document_repo.delete_file(document["file_url"])
    embedding_repo.delete_by_document(document_id)
    document_repo.delete_document(tenant_id, document_id)


def _extract_extension(filename: str | None) -> str:
    if not filename or "." not in filename:
        raise ValidationError("File name must include an extension")
    return filename.rsplit(".", 1)[-1].lower()
