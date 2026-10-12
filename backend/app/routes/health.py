"""Health-check route used by the platform to confirm the service is up."""

from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def health_check():
    return {"status": "ok"}
