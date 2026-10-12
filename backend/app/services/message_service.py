"""Message status transitions, including delivering approved replies to customers."""

from datetime import datetime, timezone
from email.utils import parseaddr

from app.exceptions import ValidationError
from app.middleware.exceptions import NotFoundError
from app.repositories import conversation_repo, message_repo
from app.schemas.message import DraftStatus
from app.services import email_outbound_service, whatsapp_service

# Setting the message to one of these statuses means "actually deliver this
# reply to the customer" — not just bookkeeping like "discarded" or "pending".
SENT_STATUSES = {DraftStatus.approved_sent, DraftStatus.manually_sent}


def update_message_status(message_id: str, tenant_id: str, draft_status: DraftStatus, final_reply: str = None):
    existing = message_repo.fetch_message_by_id(message_id, tenant_id)
    if not existing:
        raise NotFoundError(f"No message found with id '{message_id}' for this tenant")

    update_data = {"draft_status": draft_status.value}
    if final_reply is not None:
        update_data["final_reply"] = final_reply

    if draft_status in SENT_STATUSES:
        content = final_reply or existing.get("ai_draft")
        if not content or not content.strip():
            raise ValidationError("No reply content to send")

        conversation = conversation_repo.fetch_conversation_by_id(existing["conversation_id"], tenant_id)
        if not conversation:
            raise NotFoundError("Conversation not found for this message")

        _send_reply(tenant_id, conversation, content)
        update_data["sent_at"] = datetime.now(timezone.utc).isoformat()
        # The reply itself becomes a real outbound row in the thread — the
        # patched inbound message only records that it was answered, it isn't
        # what renders as the "me" bubble in the conversation.
        message_repo.insert_message(tenant_id, existing["conversation_id"], "outbound", content)

    message_repo.update_message_status_in_db(message_id, tenant_id, update_data)

    return message_repo.fetch_message_by_id(message_id, tenant_id)


def _send_reply(tenant_id: str, conversation: dict, content: str) -> None:
    channel = conversation["channel"]

    if channel == "email":
        to_address = parseaddr(conversation["customer_identifier"])[1]
        # parseaddr only splits a "Name <addr>" structure — it returns whatever
        # string it's given back as-is when there's no such structure, even if
        # that string isn't an email address at all (e.g. "not-an-email").
        if not to_address or "@" not in to_address:
            raise ValidationError("Could not determine a reply-to email address for this conversation")
        email_outbound_service.send_email_reply(tenant_id, to_address, "Re: Your message", content)
        return

    if channel == "whatsapp":
        # customer_identifier is the customer's WhatsApp phone number.
        whatsapp_service.send_whatsapp_reply(conversation["customer_identifier"], content)
        return

    raise ValidationError(f"Sending replies is not yet supported for the '{channel}' channel")
