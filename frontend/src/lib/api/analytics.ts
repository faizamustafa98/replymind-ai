import { createClient } from "@/src/lib/supabase/client";

export interface AnalyticsSummary {
  total_conversations: number;
  pending_review_count: number;
  resolved_count: number;
  total_messages: number;
  period_start: string;
  period_end: string;
  is_mock: boolean;
}

export class AuthExpiredError extends Error {}
export class BackendUnavailableError extends Error {}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new AuthExpiredError("You must be logged in to view analytics.");

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analytics/summary`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (res.status === 401) throw new AuthExpiredError("Your session has expired. Please sign in again.");
  if (res.status === 503) throw new BackendUnavailableError("Couldn't reach the server to load analytics.");

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail?.[0]?.msg ?? body?.detail ?? "Failed to load analytics.");
  }

  return res.json();
}
