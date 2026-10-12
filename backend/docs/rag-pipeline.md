# Document Chunking + Embedding Pipeline

Adds the indexing half of the RAG knowledge base: when a tenant uploads or
replaces a document, it's automatically split into chunks and embedded so
future retrieval (question answering) has something to search against.

This does **not** include retrieval/answering yet — see "Not included" below.

## What happens on upload

`POST /api/documents` and `PUT /api/documents/{id}/replace` already stored
the file and created/updated the row before this change. That part is
unchanged. What's new: after the response is returned to the client, a
background task runs the actual indexing:

```
upload/replace request
        │
        ▼
  store file in Supabase Storage, insert/update `documents` row
  (status = "processing") ─── response returned to client ───▶
        │
        ▼  (background task, via FastAPI BackgroundTasks)
  download file from Storage
        │
        ▼
  extract text (pdf / docx / txt)
        │
        ▼
  split into token-based chunks (tiktoken, cl100k_base)
        │
        ▼
  embed all chunks in one batched OpenAI call (text-embedding-3-small)
        │
        ▼
  bulk insert into `embeddings` (tenant_id, document_id, chunk_index,
  content, embedding, embedding_model, token_count)
        │
        ▼
  documents.status = "ready", chunk_count = N
  (or "failed" + error_message on any exception along the way)
```

The client never waits on OpenAI — the upload response comes back as soon
as the file/row exist. The frontend should poll or subscribe to
`documents.status` to show Processing → Ready/Failed.

## Files

| File | Purpose |
|---|---|
| `app/utils/text_extraction.py` | Extracts plain text from pdf/docx/txt bytes |
| `app/utils/chunking.py` | Token-based chunking (tiktoken `cl100k_base`) + token counting |
| `app/services/document_processing_service.py` | The pipeline itself: download → extract → chunk → embed → store → update status |
| `app/repositories/embedding_repo.py` | `insert_many()` / `delete_by_document()` against the `embeddings` table |
| `app/repositories/document_repo.py` | Added `download_file()` (the rest already existed) |
| `app/services/document_service.py` | `upload_document`/`replace_document` now take a `BackgroundTasks` param and enqueue `process_document`; `replace_document`/`delete_document` now purge old embeddings before re-processing or on delete |
| `app/routes/documents.py` | Routes pass `BackgroundTasks` through to the service |

## Config

Added to `app/config/settings.py`, read from `.env`:

```
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
CHUNK_SIZE=800        # tokens per chunk
CHUNK_OVERLAP=100     # tokens shared between adjacent chunks
```

Also changed `load_dotenv()` → `load_dotenv(override=True)` — without this, a
stray `OPENAI_API_KEY` already present in the shell/OS environment silently
wins over the one in `.env` (this bit us during development: a leftover
Groq key with the same env var name was being used instead).

## Database migration required

The `embeddings.embedding` column needs to be resized to match
`text-embedding-3-small` (1536 dimensions) — it was previously sized for a
different model (Nomic, ~768 dims). Run against Supabase:

```sql
ALTER TABLE embeddings
  ALTER COLUMN embedding TYPE vector(1536);

DROP INDEX IF EXISTS embeddings_embedding_idx;

CREATE INDEX embeddings_embedding_idx
  ON embeddings
  USING hnsw (embedding vector_cosine_ops);
```

(If your pgvector version doesn't support `hnsw`, use
`USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)` instead.)

## New dependencies

`openai`, `pypdf`, `python-docx`, `tiktoken` — added to `requirements.txt`,
already verified installed and working in the project's `venv`.

## Not included (still open)

- **Retrieval** — nothing queries `embeddings` yet. Next step: embed an
  incoming question, `WHERE tenant_id = X ORDER BY embedding <=> query_vector
  LIMIT 5`, apply a cosine-similarity threshold.
- **Query rewriting / draft generation / tone** — the actual "answer this
  customer" logic (GPT-4o-mini) doesn't exist yet, only the indexing side.
- **Question classification** — nothing yet determines whether an inbound
  message is even a question.
- **Retry on failed processing** — a doc that fails embedding (e.g. hit an
  OpenAI quota error) just sits at `status="failed"`; there's no retry
  endpoint, only re-upload.
- **Usage metering** — no `usage_log` table yet to count OpenAI calls
  against a tenant's plan cap.
- **End-to-end verification** — this has been checked for correct wiring
  and clean app boot, but not yet exercised against a live OpenAI call
  (blocked on the account's billing/quota being set up).
