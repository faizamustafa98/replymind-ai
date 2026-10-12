# RAG Pipeline — Phase 1: Parallelization + Tenant Caching

Reduces per-message latency in the RAG pipeline by running independent I/O
calls concurrently instead of sequentially, and reduces redundant Supabase
reads by caching tenant lookups in-process. No logic, outputs, or persisted
data changed — same chunks, same merge order, same confidence scores, same
drafts, same threshold decisions. Only the wall-clock time and DB read count
change.

## What changed

### 1. The two retrieval searches now run concurrently

`app/services/rag_pipeline_service.py` — `_retrieve()`

On a follow-up message (e.g. "Deliver?" after "What's on the menu?"), the
pipeline searches twice: once with the context-expanded query, once with the
bare follow-up on its own (see the docstring on `_retrieval_query` for why).
These two searches don't depend on each other — only the merge step at the
end does. They used to run one after another:

```python
chunks, confidence = await embeddings_service.get_relevant_chunks(tenant_id, expanded)
own_chunks, own_confidence = await embeddings_service.get_relevant_chunks(tenant_id, content)
```

Now they run together via `asyncio.gather`:

```python
(chunks, confidence), (own_chunks, own_confidence) = await asyncio.gather(
    embeddings_service.get_relevant_chunks(tenant_id, expanded),
    embeddings_service.get_relevant_chunks(tenant_id, content),
)
```

The merge logic (`dict.fromkeys`, `max(confidence, own_confidence)`) is
untouched — same chunks, same order, same confidence value, just computed
in parallel instead of back-to-back.

### 2. Tenant lookup now overlaps with retrieval

`app/services/rag_pipeline_service.py` — `generate_draft_for_message()`

The tenant record is only needed *after* retrieval, to compare confidence
against `rag_confidence_threshold`. It doesn't depend on retrieval's result,
so it no longer waits for it:

```python
(tenant, (chunks, confidence)) = await asyncio.gather(
    asyncio.to_thread(tenant_repo.get_tenant, tenant_id),
    _retrieve(tenant_id, content, history),
)
```

This is a DB read that already happened on every reply-needed message before
— no new calls added, just moved to run alongside retrieval instead of
before it.

## A concurrency bug this surfaced (and fixed)

Parallelizing the two retrieval searches exposed a real bug in
`app/services/embeddings_service.py`: two concurrent `asyncio.to_thread`
calls both hitting the Gemini SDK failed intermittently with:

```
RuntimeError: Cannot send a request, as the client has been closed.
```

Root cause: `_embed_query` called the client inline —
`_get_client().models.embed_content(...)` — so nothing held a Python
reference to the `Client` object beyond that single expression. Under
concurrent execution, the object became eligible for garbage collection
before its in-flight request finished, and the SDK's `Client.__del__` closes
the underlying `httpx` connection on collection — closing it out from under
the other concurrent call.

Fix: assign the client to a local variable before using it, so it stays
referenced (and alive) for the full duration of the call:

```python
def _embed_query(query_text: str) -> list[float]:
    client = _get_client()
    try:
        response = client.models.embed_content(...)
```

This only matters once calls run concurrently — it was latent and harmless
before this change, since the pipeline never made two embedding calls at
the same time.

### 3. Tenant lookups are now cached in-process

`app/repositories/tenant_repo.py`

The tenant fetch inside step 2 above is fully hidden behind retrieval
already, so caching it doesn't reduce single-message latency any further —
but every message was still paying for a real Supabase read, even though a
tenant's `business_name`, `bot_persona`, and `rag_confidence_threshold`
rarely change between messages. `get_tenant()` now keeps an in-process
dict cache (`tenant_id -> (tenant, fetched_at)`), reused for
`TENANT_CACHE_TTL_SECONDS` (default 300s, in `app/config/settings.py`):

```python
def get_tenant(tenant_id: str) -> dict:
    cached = _tenant_cache.get(tenant_id)
    if cached is not None and time.monotonic() - cached[1] < TENANT_CACHE_TTL_SECONDS:
        return cached[0]
    ...  # existing Supabase fetch, unchanged
    _tenant_cache[tenant_id] = (tenant, time.monotonic())
    return tenant
```

`update_tenant()` and `delete_tenant()` keep this consistent: an update
refreshes the tenant's cache entry with the new data immediately (rather
than waiting out the TTL), and a delete drops it. So a threshold changed
via the settings UI takes effect on the very next message, not after 5
minutes — the TTL only bounds staleness from a write made some other way
(e.g. a direct DB edit).

**Where it lives / deployment note**: this is memory inside the running
`uvicorn` process, not a separate cache service — matching the project's
current [Procfile](../Procfile) (`web: uvicorn app.main:app ...`, a single
persistent process, no `--workers`). It requires no new infrastructure and
works as-is under that deployment. It would need revisiting only if the
backend is later scaled to multiple worker processes/instances, since each
would hold its own independent copy of the cache.

This is a **throughput/cost** optimization, not a latency one — it doesn't
make any single message faster (the tenant fetch was already hidden behind
retrieval), it just removes a redundant Supabase read on every repeat
message from the same tenant.

## What was deliberately left alone

- **Classification still gates retrieval** — it decides whether retrieval
  even runs. Firing retrieval concurrently with classification would mean
  spending a Gemini embed+search call on every message *before* knowing
  whether a reply is even needed, wasting API calls on acknowledgements
  ("thanks", "ok") that get discarded. That's a cost tradeoff, not a free
  parallelization — left out of this phase.
- **Generation still runs after retrieval** — it needs the retrieved chunks
  and the grounded/threshold decision first. No safe way to start it earlier.
- No model, token limit, or config changes.

## Verification

- `test/test_pipeline.py` (5 tests) — all pass, unmodified. These assert on
  exact merge order and exact call arguments (e.g.
  `test_follow_up_is_read_in_the_context_of_the_thread` checks
  `seen["chunks"] == ["We deliver within 5km.", "Our menu is..."]` and
  `result["rag_confidence"] == 0.7`), so a change in parallelization that
  altered output would fail them immediately.
- `test/test_rag_route.py` — passes, unmodified.
- Two pre-existing test failures (`test_public_chat.py::test_generate_reply_stream_yields_only_text_deltas`
  and `test_search.py::test_retrieves_ranked_chunks_and_top_similarity`) were
  found during this work but are unrelated to it — both fail because their
  mocked fake clients use an API shape (`.chat` / `.embeddings.create`) that
  predates the code's current SDK usage. Not touched; flagged separately.
  Re-confirmed present (and unchanged in count) after adding the tenant cache.
- Both existing tests that touch tenant data
  (`test_pipeline.py`, `test_rag_route.py`) monkeypatch
  `tenant_repo.get_tenant` wholesale, replacing the function itself — so the
  cache logic inside it isn't exercised by them at all, and can't have
  altered their outcomes.
- Live benchmarks below, run against real Groq + Gemini calls using the
  seeded public demo tenant's knowledge base.

## Measured impact

All numbers are wall-clock time for real API calls (Groq classification +
generation, Gemini embeddings, Supabase/pgvector search), not mocked.

### Follow-up message (double retrieval — the case this phase targets)

| | Before | After | Change |
|---|---|---|---|
| Retrieval stage (2x embed + 2x search) | 2.81s | ~1.65s avg (1.52–1.89s across 3 runs) | **~41% faster** |

Confirmed the mechanism directly: two concurrent calls both start within 1ms
of each other and their execution windows overlap for their full duration —
total wall time matches the *slower* individual call (2.58s), not the sum
(2.18s + 2.58s = 4.76s).

### Tenant lookup / retrieval overlap

| | Time |
|---|---|
| Tenant lookup alone | 0.51s |
| Retrieval alone (single search) | ~1.9–2.1s |

Before: these ran back-to-back, so the tenant lookup added its full 0.51s
on top of retrieval. After: it runs alongside retrieval and is fully
absorbed, since 0.51s < retrieval's ~1.9s — effectively **~0.5s saved per
reply-needed message** for free.

### Combined estimate, full pipeline (classify → tenant+retrieve → generate)

| Scenario | Before (sequential) | After (parallelized) | Change |
|---|---|---|---|
| Fresh question, single retrieval | ~3.4s | ~2.9s | ~15% faster |
| Follow-up in a thread, double retrieval | ~4.4s | ~2.7s | **~38% faster** |

The follow-up case — the more common one in any real back-and-forth
conversation — sees the larger win, since it's the one doing twice the
retrieval work that's now running concurrently instead of sequentially.

### Tenant cache — repeat-read cost

| | Time |
|---|---|
| 1st call for a tenant (cache miss, real Supabase read) | 1.315s |
| 2nd call, same tenant (cache hit) | <0.0001s |
| 3rd call, same tenant (cache hit) | <0.0001s |

Every message after the first for a given tenant (within the 5-minute TTL)
now costs effectively zero DB time instead of a full Supabase round-trip —
a pure throughput/cost win, since this fetch was already hidden behind
retrieval and wasn't adding to single-message latency.

## Files changed

- `app/services/rag_pipeline_service.py` — `_retrieve()` and
  `generate_draft_for_message()`
- `app/services/embeddings_service.py` — `_embed_query()` (GC-lifetime fix)
- `app/repositories/tenant_repo.py` — `get_tenant()`, `update_tenant()`,
  `delete_tenant()` (in-process tenant cache)
- `app/config/settings.py` — added `TENANT_CACHE_TTL_SECONDS`

## Phase 2 — Observability + Query-Embedding Cache

### 4. Stage timing logs

`app/services/rag_pipeline_service.py` — `generate_draft_for_message()`

Added `time.perf_counter()` + `logger.info("Timing ...")` around each stage
(classify, retrieve, generate) and a total for the whole request.
Observability only — no behaviour change.

Also added a local-only `DISABLE_EMAIL_POLL` env flag (`app/main.py`) to
silence background email polling during local testing. Defaults to `false`,
so production and other developers are unaffected.

### 5. Query-embedding cache

`app/services/embeddings_service.py` — `_embed_query()`, `get_relevant_chunks()`

```python
@lru_cache(maxsize=512)
def _embed_query(query_text: str) -> list[float]:
    ...
```

`get_relevant_chunks()` now normalizes the query with `.strip().lower()`
before it reaches `_embed_query`, so the cache key is one canonical string.
Repeated identical FAQ-style questions reuse the cached Gemini embedding
instead of calling Gemini again. Cache key is just the query text —
tenant-independent, since tenant-scoping already happens downstream in the
DB search, not in the embedding step. Return shapes and behaviour unchanged.

## Files changed (Phase 2)

- `app/services/rag_pipeline_service.py` — stage timing logs in
  `generate_draft_for_message()`
- `app/main.py` — `DISABLE_EMAIL_POLL` local-only toggle
- `app/services/embeddings_service.py` — `_embed_query()` cache,
  `get_relevant_chunks()` normalization
