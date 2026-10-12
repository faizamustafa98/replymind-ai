import { createClient } from "@/src/lib/supabase/client";

export type SentStatus = "approved_sent" | "manually_sent";

export class AuthExpiredError extends Error {}

/**
 * Sends a reply for real — the backend delivers it through the tenant's
 * connected email account via SMTP, then records it as a message. Targets
 * the customer's own last message in the conversation (see
 * fetchConversationDetail's replyToMessageId), not an arbitrary id.
 */
export async function sendMessageReply(messageId: string, content: string, status: SentStatus) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new AuthExpiredError("You must be logged in to send a reply.");

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/messages/${messageId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ draft_status: status, final_reply: content }),
  });

  if (res.status === 401) throw new AuthExpiredError("Your session has expired. Please sign in again.");
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? body?.detail?.[0]?.msg ?? body?.detail ?? "Failed to send reply.");
  }
}
