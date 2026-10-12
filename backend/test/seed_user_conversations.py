"""
Seeds conversations + messages for a specific already-signed-up auth user,
so the Inbox/Rejected pages have real data to render against.

Run from backend/ with the venv active:
    python test/seed_user_conversations.py

NOTE: nothing in the backend currently creates a `users` row (tenant_id link)
when someone signs up via Supabase Auth — there's no route or DB trigger that
does it. Every tenant-scoped endpoint (onboarding, conversations, ...) depends
on that row existing, via get_current_tenant_id(). This script bootstraps a
tenant + users row for USER_ID if one isn't already there, purely so this
seed can run; it isn't a substitute for adding a real signup->tenant flow.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uuid
from app.db.client import get_supabase

USER_ID = "cf1a1d42-afa6-4da5-862d-1670968f06f2"


def get_or_create_tenant_for_user(sb, user_id: str) -> str:
    existing = sb.table("users").select("tenant_id").eq("id", user_id).maybe_single().execute()
    if existing and existing.data:
        print(f"Found existing users row -> tenant_id={existing.data['tenant_id']}")
        return existing.data["tenant_id"]

    print(f"No 'users' row for {user_id} yet — bootstrapping a tenant + user row.")

    tenant_id = str(uuid.uuid4())
    sb.table("tenants").insert({
        "id": tenant_id,
        "business_name": "Test Business",
        "bot_persona": "professional",
        "bot_language": "en",
        "onboarding_completed": True,
        "profile_completed": True,
        "documents_uploaded": True,
    }).execute()

    sb.table("users").insert({
        "id": user_id,
        "tenant_id": tenant_id,
        "email": f"{user_id}@seed.local",
        "password_hash": "seed-script-placeholder",
        "full_name": "Seed Test User",
        "role": "owner",
    }).execute()

    return tenant_id


def cleanup_previous_seed(sb, tenant_id: str):
    sb.table("messages").delete().eq("tenant_id", tenant_id).execute()
    sb.table("conversations").delete().eq("tenant_id", tenant_id).execute()


def seed_conversations(sb, tenant_id: str):
    conversations = [
        {
            "channel": "whatsapp",
            "customer_identifier": "+923001234567",
            "customer_name": "Ayesha Khan",
            "messages": [
                # (direction, content, is_question, draft_status, ai_draft)
                ("inbound", "Hi, do you deliver to DHA Phase 5?", True, "ready",
                 "Yes! We deliver to DHA Phase 5 within 45 minutes."),
                ("inbound", "Also, what are your Sunday timings?", True, "pending", None),
            ],
        },
        {
            "channel": "email",
            "customer_identifier": "hassan.raza@example.com",
            "customer_name": "Hassan Raza",
            "messages": [
                ("inbound", "Can I get a refund on order #4521?", True, "ready",
                 "Sure — refunds for order #4521 take 3-5 business days once approved."),
            ],
        },
        {
            "channel": "instagram",
            "customer_identifier": "ig_scoped_998877",
            "customer_name": "Bilal Ahmed",
            "messages": [
                ("inbound", "Loved the new collection! 😍", False, "discarded", None),
            ],
        },
        {
            "channel": "livechat",
            "customer_identifier": str(uuid.uuid4()),
            "customer_name": None,
            "messages": [
                ("inbound", "Thanks, that's all I needed!", False, "discarded", None),
            ],
        },
    ]

    created = []
    for conv in conversations:
        conv_id = str(uuid.uuid4())
        sb.table("conversations").insert({
            "id": conv_id,
            "tenant_id": tenant_id,
            "channel": conv["channel"],
            "customer_identifier": conv["customer_identifier"],
            "customer_name": conv["customer_name"],
            "status": "open",
        }).execute()
        created.append(conv_id)

        for direction, content, is_question, draft_status, ai_draft in conv["messages"]:
            sb.table("messages").insert({
                "id": str(uuid.uuid4()),
                "conversation_id": conv_id,
                "tenant_id": tenant_id,
                "direction": direction,
                "content": content,
                "is_question": is_question,
                "draft_status": draft_status,
                "ai_draft": ai_draft,
            }).execute()

    return created


def main():
    sb = get_supabase()
    tenant_id = get_or_create_tenant_for_user(sb, USER_ID)
    cleanup_previous_seed(sb, tenant_id)
    conversation_ids = seed_conversations(sb, tenant_id)

    print("=" * 50)
    print("SEED COMPLETE")
    print(f"User:          {USER_ID}")
    print(f"Tenant:        {tenant_id}")
    print(f"Conversations: {len(conversation_ids)} created")
    print("  -> 2 whatsapp/email conversations flagged is_question=True (Inbox)")
    print("  -> 2 instagram/livechat conversations flagged is_question=False (Rejected)")
    print("=" * 50)


if __name__ == "__main__":
    main()
