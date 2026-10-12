"""WhatsApp channel adapter — verifies inbound Meta Cloud API webhooks,
normalizes their deeply-nested payloads to the shape the rest of the app uses,
and sends outbound replies via the Graph API (the counterpart to
email_outbound_service for the WhatsApp channel).
"""

import hashlib
import hmac
import logging

import requests

from app.config.settings import (
    WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_APP_SECRET,
    WHATSAPP_PHONE_NUMBER_ID,
)
from app.exceptions import ChannelSendError

logger = logging.getLogger("replymind")

CHANNEL = "whatsapp"
GRAPH_API_VERSION = "v21.0"
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"
REQUEST_TIMEOUT_SECONDS = 10


def verify_signature(payload_bytes: bytes, signature_header: str) -> bool:
    """Confirm a webhook POST genuinely came from Meta via the App Secret HMAC.

    If WHATSAPP_APP_SECRET isn't configured, verification is skipped (returns
    True) so the demo works before the secret is added — set it in production.
    signature_header looks like "sha256=<hex-digest>".
    """
    if not WHATSAPP_APP_SECRET:
        logger.warning("WHATSAPP_APP_SECRET not set — skipping webhook signature verification")
        return True
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(
        WHATSAPP_APP_SECRET.encode(), payload_bytes, hashlib.sha256
    ).hexdigest()
    received = signature_header.split("sha256=", 1)[-1]
    return hmac.compare_digest(expected, received)


def normalize_inbound(payload: dict) -> dict | None:
    """Pull a single inbound text message out of Meta's nested webhook payload.

    Returns None when the event isn't a new text message — Meta sends
    status-updates ("delivered"/"read") and non-text messages (image/audio) to
    the same endpoint, and those are out of scope for the text-only RAG pipeline.
    """
    try:
        change = payload["entry"][0]["changes"][0]["value"]
        if "messages" not in change:
            return None  # a status-update event, not a new message
        message = change["messages"][0]
        if message.get("type") != "text":
            return None  # skip non-text messages for now
        contact = (change.get("contacts") or [{}])[0]
        return {
            "channel": CHANNEL,
            "customer_identifier": message["from"],  # customer phone number
            "customer_name": (contact.get("profile") or {}).get("name"),
            "content": message["text"]["body"],
            "channel_message_id": message["id"],
            "phone_number_id": change.get("metadata", {}).get("phone_number_id"),
        }
    except (KeyError, IndexError):
        return None


def send_whatsapp_reply(to: str, message: str) -> None:
    """Send a text reply to a customer's WhatsApp number via the Graph API."""
    url = f"{GRAPH_API_BASE}/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    response = requests.post(
        url,
        headers={"Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}"},
        json={
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": message},
        },
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    if not response.ok:
        logger.error("WhatsApp send failed to=%s: %s", to, response.text)
        raise ChannelSendError(f"WhatsApp could not deliver this reply: {_meta_error_reason(response)}")


# Meta error codes worth translating — the raw text is developer-facing and the
# owner clicking "send" in the inbox needs to know what to actually do about it.
_META_ERROR_HINTS = {
    131030: "that number isn't on your app's allowed test-recipient list (add it under WhatsApp → API Setup, or switch the app to Live mode)",
    131047: "more than 24 hours have passed since the customer's last message, so a free-form reply is no longer allowed — a message template is required",
    131026: "the recipient number isn't a valid WhatsApp account",
    190: "the WhatsApp access token has expired — generate a permanent System User token",
}


def _meta_error_reason(response) -> str:
    """Turn Meta's error envelope into one actionable sentence."""
    try:
        error = response.json().get("error") or {}
    except ValueError:
        return response.text[:200]

    code = error.get("code")
    hint = _META_ERROR_HINTS.get(code)
    if hint:
        return hint
    detail = (error.get("error_data") or {}).get("details") or error.get("message") or response.text[:200]
    return f"{detail} (Meta error {code})"
