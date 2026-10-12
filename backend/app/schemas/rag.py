"""Response model returned by the RAG draft-generation endpoint."""

from pydantic import BaseModel, Field


class DraftGenerationOut(BaseModel):
    """Result of grounding and (when confident) generating an AI draft."""

    message_id: str
    reply_needed: bool
    classification_confidence: float = Field(ge=0, le=1)
    generated: bool
    draft: str | None = None
    rag_confidence: float = Field(ge=-1, le=1)
    confidence_threshold: float = Field(ge=-1, le=1)
    source_chunks: list[str] = []
