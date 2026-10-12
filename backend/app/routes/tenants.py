"""Tenant API routes: profile read/update and per-channel connect/disconnect."""

from fastapi import APIRouter, Depends

from app.middleware.auth import get_current_tenant_id
from app.schemas.tenant import (
    ChannelConnectRequest,
    ChannelStatus,
    ChannelType,
    TenantOut,
    TenantUpdate,
)
from app.services import tenant_service

router = APIRouter(prefix="/api/tenant", tags=["tenant"])


@router.get("", response_model=TenantOut)
def get_tenant(tenant_id: str = Depends(get_current_tenant_id)):
    return tenant_service.get_tenant(tenant_id)


@router.patch("", response_model=TenantOut)
def update_tenant(payload: TenantUpdate, tenant_id: str = Depends(get_current_tenant_id)):
    # exclude_unset so omitted fields don't overwrite existing values with None
    patch = payload.model_dump(exclude_unset=True)
    return tenant_service.update_tenant(tenant_id, patch)


@router.post("/channels/{channel_type}/connect", response_model=ChannelStatus)
def connect_channel(
    channel_type: ChannelType,
    payload: ChannelConnectRequest | None = None,
    tenant_id: str = Depends(get_current_tenant_id),
):
    config = payload.config if payload else {}
    return tenant_service.connect_channel(tenant_id, channel_type, config)


@router.post("/channels/{channel_type}/disconnect", response_model=ChannelStatus)
def disconnect_channel(channel_type: ChannelType, tenant_id: str = Depends(get_current_tenant_id)):
    return tenant_service.disconnect_channel(tenant_id, channel_type)
