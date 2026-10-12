"""Documents/knowledge-base API routes: upload, replace, list, edit, and delete."""

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile, status

from app.middleware.auth import get_current_tenant_id
from app.schemas.document import DocumentOut, DocumentUpdate, KnowledgeBaseOut
from app.schemas.tenant import BusinessInfoOut, BusinessInfoUpdate
from app.services import document_service, tenant_service

router = APIRouter(prefix="/api/documents", tags=["documents"])


# Registered before "/{document_id}" so this literal path wins the match instead of
# being swallowed as document_id="knowledge-base".
@router.get("/knowledge-base", response_model=KnowledgeBaseOut)
def get_knowledge_base(tenant_id: str = Depends(get_current_tenant_id)):
    return document_service.get_knowledge_base(tenant_id)


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    document_type: str | None = Form(default=None),
    tenant_id: str = Depends(get_current_tenant_id),
):
    return await document_service.upload_document(tenant_id, file, document_type, background_tasks)


@router.get("", response_model=list[DocumentOut])
def list_documents(tenant_id: str = Depends(get_current_tenant_id)):
    return document_service.list_documents(tenant_id)


# Registered before "/{document_id}" so this literal path wins the match instead of
# being swallowed as document_id="business-info".
@router.get("/business-info", response_model=BusinessInfoOut)
def get_business_info(tenant_id: str = Depends(get_current_tenant_id)):
    return tenant_service.get_business_info(tenant_id)


@router.patch("/business-info", response_model=BusinessInfoOut)
def update_business_info(payload: BusinessInfoUpdate, tenant_id: str = Depends(get_current_tenant_id)):
    patch = payload.model_dump(exclude_unset=True)
    return tenant_service.update_business_info(tenant_id, patch)


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(document_id: str, tenant_id: str = Depends(get_current_tenant_id)):
    return document_service.get_document(tenant_id, document_id)


@router.patch("/{document_id}", response_model=DocumentOut)
def update_document(
    document_id: str, payload: DocumentUpdate, tenant_id: str = Depends(get_current_tenant_id)
):
    patch = payload.model_dump(exclude_unset=True)
    return document_service.update_document(tenant_id, document_id, patch)


@router.put("/{document_id}/replace", response_model=DocumentOut)
async def replace_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    tenant_id: str = Depends(get_current_tenant_id),
):
    return await document_service.replace_document(tenant_id, document_id, file, background_tasks)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: str, tenant_id: str = Depends(get_current_tenant_id)):
    document_service.delete_document(tenant_id, document_id)
