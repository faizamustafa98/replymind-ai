"""One-time (re-runnable) script to seed the public demo knowledge base used by
the unauthenticated landing-page chatbot (see app/routes/public_chat.py).

Reuses the existing chunking/embedding pipeline, targeting the reserved public
system tenant (PUBLIC_DEMO_TENANT_ID) instead of a real business. Bootstraps
that tenant row if it doesn't exist yet, then re-embeds docs/public_kb/*.txt
from scratch — safe to re-run any time the KB content changes.

Each file becomes one `documents` row (status="ready") plus its embedded
chunks — embeddings.document_id is a real foreign key, so a documents row
must exist first, same as the live upload pipeline in document_service.py.

Usage:
    python scripts/seed_public_kb.py
"""
import hashlib
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config.settings import (  # noqa: E402
    CHUNK_OVERLAP,
    CHUNK_SIZE,
    GEMINI_API_KEY,
    GEMINI_EMBEDDING_MODEL,
    PUBLIC_DEMO_TENANT_ID,
)
from app.db.client import get_supabase  # noqa: E402
from app.repositories import embedding_repo  # noqa: E402
from app.services.document_processing_service import _embed_chunks  # noqa: E402
from app.utils.chunking import chunk_text, count_tokens  # noqa: E402

KB_DIR = Path(__file__).resolve().parent.parent / "docs" / "public_kb"
SOURCE_FILES = {
    "overview.txt": "Product Overview",
    "features.txt": "Feature Catalogue",
    "pricing.txt": "Pricing and Plans",
    "faq.txt": "FAQ",
}


def ensure_public_tenant() -> None:
    sb = get_supabase()
    existing = sb.table("tenants").select("id").eq("id", PUBLIC_DEMO_TENANT_ID).maybe_single().execute()
    if existing and existing.data:
        return

    print(f"No tenant row for {PUBLIC_DEMO_TENANT_ID} yet — creating the public demo tenant.")
    sb.table("tenants").insert({
        "id": PUBLIC_DEMO_TENANT_ID,
        "business_name": "ReplyMind (Public Demo)",
        "bot_persona": "professional",
        "bot_language": "en",
        "plan_tier": "pro",
        "onboarding_completed": True,
        "profile_completed": True,
        "documents_uploaded": True,
    }).execute()


def reset_previous_seed(sb) -> None:
    """Re-embedding from scratch each run (rather than diffing old vs new content)
    keeps this idempotent. Embeddings first, since documents.id is their foreign key.
    """
    embedding_repo.delete_by_tenant(PUBLIC_DEMO_TENANT_ID)
    sb.table("documents").delete().eq("tenant_id", PUBLIC_DEMO_TENANT_ID).execute()


def seed_from_file(sb, file_name: str, document_name: str) -> int:
    text = (KB_DIR / file_name).read_text(encoding="utf-8")
    chunks = chunk_text(text, CHUNK_SIZE, CHUNK_OVERLAP)
    if not chunks:
        raise ValueError(f"No extractable text in {file_name}")

    vectors = _embed_chunks(chunks)
    now = datetime.now(timezone.utc).isoformat()

    document = sb.table("documents").insert({
        "id": str(uuid.uuid4()),
        "tenant_id": PUBLIC_DEMO_TENANT_ID,
        "file_name": file_name,
        "file_type": "txt",
        "file_size_bytes": len(text.encode("utf-8")),
        "file_url": f"public-kb/{file_name}",
        "status": "ready",
        "document_type": "public_kb",
        "version": 1,
        "checksum": hashlib.sha256(text.encode("utf-8")).hexdigest(),
        "chunk_count": len(chunks),
        "metadata": {"source": document_name},
    }).execute().data[0]

    rows = [
        {
            "id": str(uuid.uuid4()),
            "tenant_id": PUBLIC_DEMO_TENANT_ID,
            "document_id": document["id"],
            "chunk_index": index,
            "content": chunk,
            "embedding": vector,
            "embedding_model": GEMINI_EMBEDDING_MODEL,
            "token_count": count_tokens(chunk),
            "metadata": {"source": document_name},
            "created_at": now,
        }
        for index, (chunk, vector) in enumerate(zip(chunks, vectors))
    ]
    embedding_repo.insert_many(rows)
    return len(rows)


def main() -> None:
    if not GEMINI_API_KEY:
        sys.exit("GEMINI_API_KEY must be set in .env before seeding the public knowledge base.")

    sb = get_supabase()
    ensure_public_tenant()
    reset_previous_seed(sb)

    total = 0
    for file_name, document_name in SOURCE_FILES.items():
        count = seed_from_file(sb, file_name, document_name)
        print(f"Seeded {count} chunks from {document_name} ({file_name})")
        total += count

    print(f"Done — {total} chunks embedded for public tenant {PUBLIC_DEMO_TENANT_ID}")


if __name__ == "__main__":
    main()
