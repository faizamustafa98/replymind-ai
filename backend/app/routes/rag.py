"""RAG API route: generate an AI draft reply for one inbound message."""

from fastapi import APIRouter, Depends

from app.middleware.auth import get_current_tenant_id
from app.schemas.rag import DraftGenerationOut
from app.services import rag_pipeline_service

router = APIRouter(prefix="/api/rag", tags=["rag"])


@router.post("/messages/{message_id}/draft", response_model=DraftGenerationOut)
async def generate_draft(message_id: str, tenant_id: str = Depends(get_current_tenant_id)):
    return await rag_pipeline_service.generate_draft_for_message(tenant_id, message_id)
