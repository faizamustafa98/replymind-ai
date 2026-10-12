"""One-time re-embed of every document after switching to Gemini embeddings.

Clears all existing embedding rows first (the old OpenAI vectors can't be mixed
with Gemini's), then for every documents row that has a stored file, re-runs the
normal processing pipeline (download -> extract -> chunk -> embed with Gemini ->
store), moving the row to status="ready" or "failed". Dimension stays 1536, so no
schema change is needed. Safe to re-run.

Usage:
    python scripts/reembed_all.py
"""
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.client import get_supabase  # noqa: E402
from app.repositories import embedding_repo  # noqa: E402
from app.services import document_processing_service  # noqa: E402


_IMPOSSIBLE_ID = "00000000-0000-0000-0000-000000000000"


def main() -> None:
    sb = get_supabase()

    # Clear every old (OpenAI) embedding row up front — PostgREST refuses an
    # unfiltered delete, so match all rows via id != a placeholder uuid.
    sb.table("embeddings").delete().neq("id", _IMPOSSIBLE_ID).execute()
    print("Cleared all existing embedding rows.\n")

    docs = (
        sb.table("documents")
        .select("id, tenant_id, file_name, file_type, file_url, status")
        .execute()
        .data
    )
    print(f"Found {len(docs)} documents to re-embed.\n")

    ok, failed, skipped = 0, 0, 0
    for doc in docs:
        file_url = doc.get("file_url")
        if not file_url:
            print(f"  SKIP  {doc['file_name']} (no stored file)")
            skipped += 1
            continue

        # Clear any stale rows first so a re-run never duplicates chunks.
        try:
            embedding_repo.delete_by_document(doc["id"])
        except Exception as exc:  # noqa: BLE001
            print(f"  WARN  couldn't clear old embeddings for {doc['file_name']}: {exc}")

        document_processing_service.process_document(
            doc["tenant_id"], doc["id"], file_url, doc["file_type"]
        )

        # process_document swallows its own errors and writes status, so read it back.
        row = (
            sb.table("documents").select("status, chunk_count, error_message")
            .eq("id", doc["id"]).limit(1).execute().data
        )
        status = row[0]["status"] if row else "unknown"
        if status == "ready":
            print(f"  OK    {doc['file_name']} -> {row[0].get('chunk_count')} chunks")
            ok += 1
        else:
            print(f"  FAIL  {doc['file_name']} -> {status}: {row[0].get('error_message') if row else '?'}")
            failed += 1

    print(f"\nDone. ready={ok}  failed={failed}  skipped={skipped}")


if __name__ == "__main__":
    main()
