"""Central app configuration: env-var loading, model settings, and RAG thresholds."""

import os

from dotenv import load_dotenv

load_dotenv(override=True)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

# AI providers (free stack): Groq for classification + generation, Gemini for embeddings.
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Fernet key used to encrypt per-tenant Gmail refresh tokens at rest
# (see app/services/email_credentials_service.py). Generate with:
#   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

# Gmail OAuth (email channel) — see app/services/gmail_oauth_service.py.
# Console: https://console.cloud.google.com -> APIs & Services -> Credentials
GOOGLE_OAUTH_CLIENT_ID = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
GOOGLE_OAUTH_CLIENT_SECRET = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")
GOOGLE_OAUTH_REDIRECT_URI = os.getenv("GOOGLE_OAUTH_REDIRECT_URI")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# WhatsApp channel (Meta Cloud API) — see app/services/whatsapp_service.py.
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")
# The GET-handshake token you also enter in Meta's webhook config (env: WEBHOOK_VERIFY_TOKEN).
WHATSAPP_WEBHOOK_VERIFY_TOKEN = os.getenv("WEBHOOK_VERIFY_TOKEN")
# Meta App Secret — optional. When set, inbound webhooks are HMAC-verified;
# when unset, verification is skipped (fine for a demo, add it for production).
WHATSAPP_APP_SECRET = os.getenv("WHATSAPP_APP_SECRET")

# Auto-reply level → cosine threshold mapping.
# Calibrated against gemini-embedding-001 (1536-d) on FAQ-style text: unrelated
# questions score ~0.47, genuinely relevant ones ~0.65-0.80. Gemini's cosine
# floor sits much higher than OpenAI's (~0.19), so these values are higher too.
# Auto-reply is unattended, so each level stays inside the "relevant" band to
# avoid auto-sending on a weak match.
AUTO_REPLY_THRESHOLDS = {
    "always":  0.55,
    "most":    0.60,
    "average": 0.64,
    "less":    0.70,
    "never":   None
}

# Groq models (classification + generation)
GROQ_CLASSIFICATION_MODEL = os.getenv("GROQ_CLASSIFICATION_MODEL", "llama-3.1-8b-instant")
GROQ_GENERATION_MODEL = os.getenv("GROQ_GENERATION_MODEL", "llama-3.3-70b-versatile")

# Gemini embeddings (RAG knowledge base). gemini-embedding-001 defaults to 3072-d;
# we force it via output_dimensionality on every call. Kept at 1536 to match the
# existing vector(1536) column and match_embeddings RPC (Matryoshka model, so 1536
# is a fully supported truncation). EMBEDDING_DIMENSIONS must match that column.
GEMINI_EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
EMBEDDING_DIMENSIONS = int(os.getenv("EMBEDDING_DIMENSIONS", "1536"))
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "800"))  # tokens per chunk
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "100"))  # tokens shared between adjacent chunks
RAG_MAX_CONTEXT_CHARS = int(os.getenv("RAG_MAX_CONTEXT_CHARS", "12000"))

# Conversation history fed to the classifier and the generator so follow-ups
# ("Deliver?", "how much?", "yes please") are read in context instead of in
# isolation. Kept small on purpose: the newest turns carry almost all the
# referent, while older ones mostly add tokens and drift.
HISTORY_MAX_MESSAGES = int(os.getenv("HISTORY_MAX_MESSAGES", "8"))
HISTORY_MAX_CHARS = int(os.getenv("HISTORY_MAX_CHARS", "3000"))
# Only the customer's own recent turns expand the retrieval query — folding our
# own replies in would embed our wording back into the search and drown out the
# short question the customer actually asked.
RETRIEVAL_HISTORY_TURNS = int(os.getenv("RETRIEVAL_HISTORY_TURNS", "2"))

# Reserved system tenant whose "documents" are the hardcoded product-info files in
# docs/public_kb/ (see scripts/seed_public_kb.py), not real uploads. Used by the
# public, unauthenticated landing-page chatbot so it can reuse the same
# embeddings table and retrieval/generation services as every real tenant.
PUBLIC_DEMO_TENANT_ID = "00000000-0000-0000-0000-000000000000"

# How long an in-memory get_tenant() result is reused before re-fetching from
# Supabase (see app/repositories/tenant_repo.py). Every settings-changing write
# (update_tenant/delete_tenant) refreshes/clears its own entry immediately, so
# this TTL only bounds staleness from a write made through some other path.
TENANT_CACHE_TTL_SECONDS = int(os.getenv("TENANT_CACHE_TTL_SECONDS", "300"))
