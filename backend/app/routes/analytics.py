"""Analytics API route: the dashboard summary endpoint."""

from fastapi import APIRouter, Depends, HTTPException

from app.middleware.auth import get_current_tenant_id
from app.schemas.analytics import AnalyticsSummary
from app.services import analytics_service

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
async def get_summary(tenant_id: str = Depends(get_current_tenant_id)):
    try:
        return await analytics_service.get_dashboard_summary(tenant_id)
    except RuntimeError as exc:
        # Supabase/network failure while building the summary - not the client's fault.
        raise HTTPException(status_code=503, detail=str(exc)) from exc