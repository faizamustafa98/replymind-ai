-- Switch embeddings from OpenAI text-embedding-3-small to Gemini
-- gemini-embedding-001, both at 1536 dimensions.
--
-- The embedding vector space differs between models, so the old OpenAI vectors
-- cannot be mixed with new Gemini ones and must be cleared and regenerated
-- (see scripts/reembed_all.py). Because we kept the dimension at 1536, the
-- embeddings.embedding column and the match_embeddings RPC already have the
-- right shape — no ALTER or function change is needed, only a truncate.
--
-- The documents/files themselves are untouched; only the derived embedding rows
-- are dropped and rebuilt.

TRUNCATE TABLE embeddings;
