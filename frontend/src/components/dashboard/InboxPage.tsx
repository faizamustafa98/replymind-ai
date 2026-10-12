"use client";
import { useEffect, useState } from "react";
import ConversationsView from "@/src/components/dashboard/ConversationsView";
import { fetchConversations } from "@/src/lib/api/conversations";
import { useInboxStore } from "@/src/store/useInboxStore";

export default function InboxPage() {
  const cached = useInboxStore((s) => s.inbox);
  const isFresh = useInboxStore((s) => s.isListFresh("inbox"));
  const setInbox = useInboxStore((s) => s.setInbox);

  // Loading spinner only for a true first visit (no cache at all). If stale
  // cached data exists, render it immediately and refresh quietly underneath
  // instead of blanking the screen for data that's still mostly right.
  const [conversations, setConversations] = useState(cached?.data ?? []);
  const [loading, setLoading] = useState(cached === null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isFresh) return; // cache still good — skip the network round trip entirely
    fetchConversations()
      .then((data) => {
        setConversations(data);
        setInbox(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // Only re-run when the cache goes stale, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFresh]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface text-on-surface-variant text-sm">
        Loading conversations…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface text-error text-sm">
        {error}
      </div>
    );
  }

  return <ConversationsView view="inbox" heading="Inbox" conversations={conversations} />;
}
