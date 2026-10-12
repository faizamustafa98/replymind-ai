"""Public, unauthenticated chatbot endpoint for the landing page.

No tenant-auth dependency here — intentionally open to anonymous visitors,
same pattern as the Stripe webhook being exempt from auth (see billing.py).
Retrieval and generation are scoped to the reserved public demo tenant, whose
knowledge base is the hardcoded product-info docs under docs/public_kb/
(see scripts/seed_public_kb.py), not a real business's uploads.
"""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.config.settings import PUBLIC_DEMO_TENANT_ID
from app.schemas.public_chat import PublicChatRequest
from app.services import embeddings_service, generation_service

router = APIRouter(prefix="/api/public", tags=["public-chat"])

PERSONA_NAME = "ReplyMind Product"


@router.post("/chat")
async def public_chat(payload: PublicChatRequest) -> StreamingResponse:
    chunks, _ = await embeddings_service.get_relevant_chunks(PUBLIC_DEMO_TENANT_ID, payload.message)
    return StreamingResponse(
        generation_service.generate_reply_stream(payload.message, chunks, PERSONA_NAME),
        media_type="text/plain",
    )
