"""Assembles conversation list/detail views and their message threads."""

from app.repositories import conversation_repo, message_repo
from app.middleware.exceptions import NotFoundError

def _conversations_by_latest_question_flag(tenant_id: str, is_question: bool):
    conversations = conversation_repo.fetch_all_conversations(tenant_id)
    latest_messages = message_repo.fetch_latest_messages_for_tenant(tenant_id)

    latest_by_conversation = {}
    for message in latest_messages:
        conversation_id = message["conversation_id"]
        if conversation_id not in latest_by_conversation:
            latest_by_conversation[conversation_id] = message

    result = []
    for conversation in conversations:
        latest_message = latest_by_conversation.get(conversation["id"])
        conversation["last_message_preview"] = latest_message["content"] if latest_message else None
        if latest_message and bool(latest_message["is_question"]) == is_question:
            result.append(conversation)

    return result

def get_all_conversations(tenant_id: str):
    return _conversations_by_latest_question_flag(tenant_id, is_question=True)

def get_rejected_conversations(tenant_id: str):
    return _conversations_by_latest_question_flag(tenant_id, is_question=False)

def reject_conversation(conversation_id: str, tenant_id: str):
    """Manually move a conversation into the Rejected view (is_question=False on
    its latest inbound message). Nothing lands in Rejected except via this call.
    """
    conversation = conversation_repo.fetch_conversation_by_id(conversation_id, tenant_id)
    if not conversation:
        raise NotFoundError(f"No conversation found with id '{conversation_id}' for this tenant")
    message_repo.set_latest_inbound_is_question(conversation_id, tenant_id, False)
    return {"conversation_id": conversation_id, "status": "rejected"}


def unreject_conversation(conversation_id: str, tenant_id: str):
    """Move a conversation back out of Rejected into the Inbox."""
    conversation = conversation_repo.fetch_conversation_by_id(conversation_id, tenant_id)
    if not conversation:
        raise NotFoundError(f"No conversation found with id '{conversation_id}' for this tenant")
    message_repo.set_latest_inbound_is_question(conversation_id, tenant_id, True)
    return {"conversation_id": conversation_id, "status": "inbox"}


def get_conversation_with_messages(conversation_id: str, tenant_id: str):
    conversation = conversation_repo.fetch_conversation_by_id(conversation_id, tenant_id)
    if not conversation:
        raise NotFoundError(f"No conversation found with id '{conversation_id}' for this tenant")

    messages = message_repo.fetch_messages_for_conversation(conversation_id, tenant_id)

    if conversation["unread_count"] > 0:
        conversation_repo.mark_conversation_as_read(conversation_id, tenant_id)
        conversation["unread_count"] = 0

    return {
        "conversation": conversation,
        "messages": messages,
    }