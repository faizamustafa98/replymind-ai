import os
import sys
import uuid

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.client import get_supabase  # noqa: E402 — path must be extended first

SEED_BUSINESS_NAMES = ["The Green Table", "Urban Threads"]

def cleanup_previous_seed(sb):
    existing = sb.table("tenants").select("id").in_("business_name", SEED_BUSINESS_NAMES).execute()
    tenant_ids = [row["id"] for row in existing.data] if existing.data else []
    if not tenant_ids:
        return
    sb.table("messages").delete().in_("tenant_id", tenant_ids).execute()
    sb.table("conversations").delete().in_("tenant_id", tenant_ids).execute()
    sb.table("documents").delete().in_("tenant_id", tenant_ids).execute()
    sb.table("tenants").delete().in_("id", tenant_ids).execute()

def seed():
    sb = get_supabase()

    cleanup_previous_seed(sb)

    # ── Tenant 1: Restaurant ──────────────────────────────────
    t1_id = str(uuid.uuid4())
    sb.table("tenants").insert({
        "id": t1_id,
        "business_name": "The Green Table",
        "bot_persona": "casual",
        "bot_language": "en",
        "business_type": "restaurant",
        "business_profile": {
            "phone_number": "+924235761234",
            "address": "23-B Main Boulevard, Gulberg III, Lahore",
            "website_url": "https://www.greentable.pk",
            "opening_hours": {
                "mon": {"open": "12:00", "close": "23:00"},
                "tue": {"open": "12:00", "close": "23:00"},
                "wed": {"open": "12:00", "close": "23:00"},
                "thu": {"open": "12:00", "close": "23:00"},
                "fri": {"open": "12:00", "close": "00:00"},
                "sat": {"open": "12:00", "close": "00:00"},
                "sun": {"open": "13:00", "close": "22:00"}
            }
        },
        "rag_confidence_threshold": 0.30,
        "auto_reply_level": "never",
        "rag_context_window": 6,
        "plan_tier": "growth",
        "onboarding_completed": True,
        "profile_completed": True,
        "documents_uploaded": True
    }).execute()

    # ── Tenant 2: Clothing ────────────────────────────────────
    t2_id = str(uuid.uuid4())
    sb.table("tenants").insert({
        "id": t2_id,
        "business_name": "Urban Threads",
        "bot_persona": "professional",
        "bot_language": "en",
        "business_type": "clothing",
        "business_profile": {
            "phone_number": "+924235887654",
            "address": "Main Boulevard Gulberg, Lahore",
            "website_url": "https://www.urbanthreads.pk",
            "opening_hours": {
                "mon": {"open": "11:00", "close": "21:00"},
                "tue": {"open": "11:00", "close": "21:00"},
                "wed": {"open": "11:00", "close": "21:00"},
                "thu": {"open": "11:00", "close": "21:00"},
                "fri": {"open": "11:00", "close": "21:00"},
                "sat": {"open": "11:00", "close": "21:00"},
                "sun": {"open": "11:00", "close": "21:00"}
            }
        },
        "rag_confidence_threshold": 0.30,
        "auto_reply_level": "average",
        "rag_context_window": 6,
        "plan_tier": "starter",
        "onboarding_completed": True,
        "profile_completed": True,
        "documents_uploaded": True
    }).execute()

    # ── Document records (status=processing, will be updated by ingest script) ──
    doc1_id = str(uuid.uuid4())
    sb.table("documents").insert({
        "id": doc1_id,
        "tenant_id": t1_id,
        "file_name": "green_table_faq.txt",
        "file_url": f"tenants/{t1_id}/green_table_faq.txt",
        "file_type": "txt",
        "file_size_bytes": 2048,
        "status": "processing",
        "document_type": "faq",
        "version": 1
    }).execute()

    doc2_id = str(uuid.uuid4())
    sb.table("documents").insert({
        "id": doc2_id,
        "tenant_id": t2_id,
        "file_name": "urban_threads_faq.txt",
        "file_url": f"tenants/{t2_id}/urban_threads_faq.txt",
        "file_type": "txt",
        "file_size_bytes": 2048,
        "status": "processing",
        "document_type": "faq",
        "version": 1
    }).execute()

    # ── Fake inbound messages (to test pipeline with) ─────────
    # First create conversations
    conv1_id = str(uuid.uuid4())
    sb.table("conversations").insert({
        "id": conv1_id,
        "tenant_id": t1_id,
        "channel": "whatsapp",
        "customer_identifier": "+923001111111",
        "customer_name": "Customer Bilal",
        "status": "open"
    }).execute()

    conv2_id = str(uuid.uuid4())
    sb.table("conversations").insert({
        "id": conv2_id,
        "tenant_id": t2_id,
        "channel": "whatsapp",
        "customer_identifier": "+923002222222",
        "customer_name": "Customer Zara",
        "status": "open"
    }).execute()

    # Then create messages in those conversations
    sb.table("messages").insert({
        "id": str(uuid.uuid4()),
        "conversation_id": conv1_id,
        "tenant_id": t1_id,
        "direction": "inbound",
        "content": "What time do you open on Sunday?",
        "channel_message_id": "wamid.test001",
        "draft_status": "pending"
    }).execute()

    sb.table("messages").insert({
        "id": str(uuid.uuid4()),
        "conversation_id": conv1_id,
        "tenant_id": t1_id,
        "direction": "inbound",
        "content": "Do you have vegetarian options on your menu?",
        "channel_message_id": "wamid.test002",
        "draft_status": "pending"
    }).execute()

    sb.table("messages").insert({
        "id": str(uuid.uuid4()),
        "conversation_id": conv2_id,
        "tenant_id": t2_id,
        "direction": "inbound",
        "content": "What is your return policy if I bought online?",
        "channel_message_id": "wamid.test003",
        "draft_status": "pending"
    }).execute()

    sb.table("messages").insert({
        "id": str(uuid.uuid4()),
        "conversation_id": conv2_id,
        "tenant_id": t2_id,
        "direction": "inbound",
        "content": "Do you deliver to Karachi and how long does it take?",
        "channel_message_id": "wamid.test004",
        "draft_status": "pending"
    }).execute()

    print("=" * 50)
    print("SEED COMPLETE — SAVE THESE IDs")
    print("=" * 50)
    print(f"Tenant 1 (Restaurant): {t1_id}")
    print(f"Tenant 2 (Clothing):   {t2_id}")
    print(f"Document 1:            {doc1_id}")
    print(f"Document 2:            {doc2_id}")
    print(f"Conversation 1:        {conv1_id}")
    print(f"Conversation 2:        {conv2_id}")
    print("=" * 50)

    # Save to a file so other scripts can read them
    with open("scripts/seed_ids.txt", "w") as f:
        f.write(f"TENANT_1={t1_id}\n")
        f.write(f"TENANT_2={t2_id}\n")
        f.write(f"DOC_1={doc1_id}\n")
        f.write(f"DOC_2={doc2_id}\n")
        f.write(f"CONV_1={conv1_id}\n")
        f.write(f"CONV_2={conv2_id}\n")
    print("IDs saved to scripts/seed_ids.txt")

if __name__ == "__main__":
    seed()
