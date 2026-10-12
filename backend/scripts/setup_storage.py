import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.client import get_supabase  # noqa: E402 — path must be extended first
from app.repositories.document_repo import STORAGE_BUCKET  # noqa: E402


def setup_storage():
    sb = get_supabase()
    existing = {bucket.name for bucket in sb.storage.list_buckets()}
    if STORAGE_BUCKET in existing:
        print(f"Bucket '{STORAGE_BUCKET}' already exists.")
        return

    sb.storage.create_bucket(
        STORAGE_BUCKET,
        options={
            "public": False,
            "file_size_limit": 10 * 1024 * 1024,
            "allowed_mime_types": [
                "application/pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "text/plain",
            ],
        },
    )
    print(f"Created private bucket '{STORAGE_BUCKET}'.")


if __name__ == "__main__":
    setup_storage()
