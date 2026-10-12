import { createClient } from "@/src/lib/supabase/client";

export interface TenantChannels {
  email?: {
    status: "connected" | "disconnected" | "pending_verification" | "error";
    connected_at: string | null;
    config?: Record<string, unknown>;
  };
  whatsapp?: {
    status: "connected" | "disconnected";
    connected_at: string | null;
    config?: { display_number?: string; [key: string]: unknown };
  };
  widget?: {
    status: "connected" | "disconnected";
    connected_at: string | null;
    config?: Record<string, unknown>;
  };
  [key: string]: unknown;
}

export interface Tenant {
  id: string;
  business_name: string;
  business_type: string;
  bot_persona?: string;
  bot_language?: string;
  plan_tier: "free" | "pro" | "enterprise";
  created_at: string;
  channels: TenantChannels;
}

export class AuthExpiredError extends Error {}

async function getSession() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new AuthExpiredError("You must be logged in.");
  return session;
}

async function parseError(res: Response, fallback: string) {
  const body = await res.json().catch(() => null);
  return body?.detail?.[0]?.msg ?? body?.detail ?? body?.error?.message ?? fallback;
}

export async function fetchTenant(): Promise<Tenant> {
  const session = await getSession();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tenant`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (res.status === 401) throw new AuthExpiredError("Your session has expired. Please sign in again.");
  if (!res.ok) throw new Error(await parseError(res, "Failed to load tenant data."));
  return res.json();
}

export async function updateTenant(patch: {
  business_name?: string;
  business_type?: string;
}): Promise<Tenant> {
  const session = await getSession();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tenant`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(patch),
  });
  if (res.status === 401) throw new AuthExpiredError("Your session has expired. Please sign in again.");
  if (!res.ok) throw new Error(await parseError(res, "Failed to update tenant."));
  return res.json();
}

export async function connectWhatsApp(phone_number: string): Promise<Tenant> {
  const session = await getSession();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tenant/channels/whatsapp/connect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ phone_number }),
  });
  if (res.status === 401) throw new AuthExpiredError("Your session has expired. Please sign in again.");
  if (!res.ok) throw new Error(await parseError(res, "Failed to connect WhatsApp."));
  return res.json();
}

export async function disconnectWhatsApp(): Promise<Tenant> {
  const session = await getSession();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tenant/channels/whatsapp/disconnect`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (res.status === 401) throw new AuthExpiredError("Your session has expired. Please sign in again.");
  if (!res.ok) throw new Error(await parseError(res, "Failed to disconnect WhatsApp."));
  return res.json();
}

export async function fetchWhatsAppStatus(): Promise<{
  status: "connected" | "disconnected";
  phone_number: string | null;
  connected_at: string | null;
}> {
  const session = await getSession();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tenant/channels/whatsapp/status`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (res.status === 401) throw new AuthExpiredError("Your session has expired. Please sign in again.");
  if (!res.ok) throw new Error(await parseError(res, "Failed to load WhatsApp status."));
  return res.json();
}
