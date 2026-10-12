import { createClient } from "@/src/lib/supabase/client";

export interface EmailConnectionStatus {
  status: "connected" | "pending_verification" | "disconnected" | "error";
  connected_at: string | null;
  email: string | null;
}

export class AuthExpiredError extends Error {}

async function getSession() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new AuthExpiredError("You must be logged in to manage your email connection.");
  return session;
}

async function parseError(res: Response, fallback: string) {
  const body = await res.json().catch(() => null);
  return body?.error?.message ?? body?.detail?.[0]?.msg ?? body?.detail ?? fallback;
}

export async function fetchEmailConnectionStatus(): Promise<EmailConnectionStatus> {
  const session = await getSession();

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tenant/channels/email/status`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (res.status === 401) throw new AuthExpiredError("Your session has expired. Please sign in again.");
  if (!res.ok) throw new Error(await parseError(res, "Failed to load email connection status."));

  return res.json();
}

/**
 * Builds the URL that starts the Gmail OAuth flow. The caller must navigate
 * the browser there directly (window.location.href) rather than fetch() it —
 * only a real navigation can land the owner on Google's consent screen. The
 * session token travels as a query param since a plain redirect can't carry
 * an Authorization header.
 */
export async function getGmailConnectUrl(): Promise<string> {
  const session = await getSession();
  return `${process.env.NEXT_PUBLIC_API_URL}/api/tenant/channels/email/connect?token=${session.access_token}`;
}

export async function disconnectEmailAccount(): Promise<EmailConnectionStatus> {
  const session = await getSession();

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tenant/channels/email/disconnect`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (res.status === 401) throw new AuthExpiredError("Your session has expired. Please sign in again.");
  if (!res.ok) throw new Error(await parseError(res, "Failed to disconnect email."));

  return res.json();
}
