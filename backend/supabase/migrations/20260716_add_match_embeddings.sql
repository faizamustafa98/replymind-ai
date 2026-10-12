-- Tenant-scoped cosine-similarity retrieval for the RAG knowledge base.
-- The query vector and stored vectors must use the same embedding model/dimension.
CREATE OR REPLACE FUNCTION match_embeddings(
    query_embedding vector(1536),
    match_tenant_id uuid,
    match_count integer DEFAULT 4
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    content text,
    similarity double precision
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        embeddings.id,
        embeddings.document_id,
        embeddings.content,
        1 - (embeddings.embedding <=> query_embedding) AS similarity
    FROM embeddings
    WHERE embeddings.tenant_id = match_tenant_id
    ORDER BY embeddings.embedding <=> query_embedding
    LIMIT LEAST(GREATEST(match_count, 1), 20);
$$;
