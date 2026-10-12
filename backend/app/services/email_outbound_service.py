"""Sends an approved reply through the Gmail API — HTTPS on port 443, which
avoids the outbound-SMTP port block that made raw smtplib sending
unreachable from Railway (and most cloud hosts with restrictive egress).
"""

import base64
import logging
from email.mime.text import MIMEText

import requests

from app.exceptions import UpstreamServiceError
from app.services import email_credentials_service, gmail_oauth_service

GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
REQUEST_TIMEOUT_SECONDS = 10

logger = logging.getLogger("replymind")


def send_email_reply(tenant_id: str, to_address: str, subject: str, body: str) -> None:
    access_token = email_credentials_service.get_valid_access_token(tenant_id)

    message = MIMEText(body)
    message["To"] = to_address
    message["Subject"] = subject if subject.lower().startswith("re:") else f"Re: {subject}"

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()

    response = requests.post(
        GMAIL_SEND_URL,
        headers=gmail_oauth_service.auth_header(access_token),
        json={"raw": raw},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    if not response.ok:
        logger.error("Gmail send failed for tenant=%s to=%s: %s", tenant_id, to_address, response.text)
        raise UpstreamServiceError(f"Failed to send email reply: {response.text}")
