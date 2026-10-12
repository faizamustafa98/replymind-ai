"""Messages API route: update a message's draft status (approve/send/discard)."""

from fastapi import APIRouter, Depends
from app.schemas.message import MessageStatusUpdate
from app.services import message_service
from app.middleware.auth import get_current_tenant_id

router = APIRouter(prefix="/api/messages", tags=["messages"])


@router.patch("/{message_id}/status")
def update_status(message_id: str, payload: MessageStatusUpdate, tenant_id: str = Depends(get_current_tenant_id)):
    result = message_service.update_message_status(
        message_id, tenant_id, payload.draft_status, payload.final_reply
    )
    return {"success": True, "updated": result}
