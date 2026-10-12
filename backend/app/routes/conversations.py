"""Conversations API routes: list conversations and fetch one with its messages."""

from fastapi import APIRouter, Depends
from app.schemas.conversation import ConversationSummary, ConversationDetail
from app.services import conversation_service
from app.middleware.auth import get_current_tenant_id

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.get("/", response_model=list[ConversationSummary])
def list_conversations(tenant_id: str = Depends(get_current_tenant_id)):
    return conversation_service.get_all_conversations(tenant_id)


@router.get("/rejected", response_model=list[ConversationSummary])
def list_rejected_conversations(tenant_id: str = Depends(get_current_tenant_id)):
    return conversation_service.get_rejected_conversations(tenant_id)


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation_detail(conversation_id: str, tenant_id: str = Depends(get_current_tenant_id)):
    return conversation_service.get_conversation_with_messages(conversation_id, tenant_id)


@router.post("/{conversation_id}/reject")
def reject_conversation(conversation_id: str, tenant_id: str = Depends(get_current_tenant_id)):
    return conversation_service.reject_conversation(conversation_id, tenant_id)


@router.post("/{conversation_id}/unreject")
def unreject_conversation(conversation_id: str, tenant_id: str = Depends(get_current_tenant_id)):
    return conversation_service.unreject_conversation(conversation_id, tenant_id)
