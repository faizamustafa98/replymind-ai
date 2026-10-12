import { createClient } from "@/src/lib/supabase/client";
import { initialsAvatar } from "@/src/lib/utils/avatar";

export interface ConversationSummary {
  id: string;
  customer_name: string | null;
  customer_identifier: string;
  channel: string;
  status: string;
  message_count: number;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
}

function formatTimestamp(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export interface MessageOut {
  id: string;
  conversation_id: string;
  content: string;
  direction: string;
  ai_draft: string | null;
  draft_status: string | null;
  final_reply: string | null;
  is_question: boolean | null;
  rag_confidence: number | null;
  sent_at: string | null;
  created_at: string;
}

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function mapMessage(m: MessageOut) {
  return {
    id: m.id,
    from: m.direction === "outbound" ? "me" : "them",
    text: m.content,
    time: formatMessageTime(m.created_at),
  };
}

// ConversationSummary is a list-level summary — no avatar, draft, or message
// thread. Those get filled in once the conversation-detail endpoint is wired up.
export function mapConversation(c: ConversationSummary) {
  const name = c.customer_name || c.customer_identifier;
  return {
    id: c.id,
    name,
    avatar: initialsAvatar(name),
    time: formatTimestamp(c.last_message_at),
    preview: c.last_message_preview ?? "",
    draft: null,
    email: c.customer_identifier,
    channel: c.channel,
    read: c.unread_count === 0,
    messages: [],
  };
}

async function getConversations(path: string) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error("You must be logged in to view conversations.");

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail?.[0]?.msg ?? body?.detail ?? "Failed to load conversations.");
  }

  const data: ConversationSummary[] = await res.json();
  return data.map(mapConversation);
}

export async function fetchConversations() {
  return getConversations("/api/conversations/");
}

export async function fetchRejectedConversations() {
  return getConversations("/api/conversations/rejected");
}

// Moves a conversation between Inbox and Rejected by flipping its latest
// inbound message's is_question flag on the server (see conversation_service).
async function postConversationAction(conversationId: string, action: "reject" | "unreject") {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error("You must be logged in to update this conversation.");

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/conversations/${conversationId}/${action}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail?.[0]?.msg ?? body?.detail ?? `Failed to ${action} conversation.`);
  }

  return res.json();
}

// Inbox → Rejected.
export function rejectConversation(conversationId: string) {
  return postConversationAction(conversationId, "reject");
}

// Rejected → Inbox.
export function unrejectConversation(conversationId: string) {
  return postConversationAction(conversationId, "unreject");
}

export async function fetchConversationDetail(conversationId: string) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error("You must be logged in to view this conversation.");

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/conversations/${conversationId}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail?.[0]?.msg ?? body?.detail ?? "Failed to load conversation.");
  }

  const data: { conversation: ConversationSummary; messages: MessageOut[] } = await res.json();
  const messages = data.messages.map(mapMessage);

  // Replies are sent against the customer's own last message, not just
  // whichever row is newest overall — once a reply goes out, the newest row
  // is that outbound message itself, which isn't something to reply to.
  const lastInbound = [...data.messages].reverse().find((m) => m.direction === "inbound") ?? null;

  // The AI draft footer only shows a draft when that message is still
  // awaiting owner review — once it's sent/discarded there's nothing to act on.
  const draft =
    lastInbound &&
    ["pending", "ready"].includes(lastInbound.draft_status ?? "") &&
    lastInbound.ai_draft
      ? lastInbound.ai_draft
      : null;

  return {
    ...mapConversation(data.conversation),
    messages,
    draft,
    replyToMessageId: lastInbound?.id ?? null,
  };
}
