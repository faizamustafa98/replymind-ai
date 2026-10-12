"""Connect / status / disconnect for the WhatsApp channel — the settings-screen
counterpart to email_channel.py. Registered ahead of the generic
/channels/{channel_type} routes in tenants.py so these static "whatsapp" paths
win for this channel.
"""

from fastapi import APIRouter, Depends

from app.middleware.auth import get_current_tenant_id
from app.schemas.whatsapp import WhatsAppChannelStatus, WhatsAppConnectRequest
from app.services import tenant_service

router = APIRouter(prefix="/api/tenant/channels/whatsapp", tags=["whatsapp-channel"])


@router.post("/connect", response_model=WhatsAppChannelStatus)
def connect_whatsapp(payload: WhatsAppConnectRequest, tenant_id: str = Depends(get_current_tenant_id)):
    return WhatsAppChannelStatus(
        **tenant_service.connect_whatsapp(tenant_id, payload.phone_number, payload.phone_number_id)
    )


@router.get("/status", response_model=WhatsAppChannelStatus)
def whatsapp_status(tenant_id: str = Depends(get_current_tenant_id)):
    return WhatsAppChannelStatus(**tenant_service.get_whatsapp_status(tenant_id))


@router.post("/disconnect", response_model=WhatsAppChannelStatus)
def disconnect_whatsapp(tenant_id: str = Depends(get_current_tenant_id)):
    return WhatsAppChannelStatus(**tenant_service.disconnect_whatsapp(tenant_id))
