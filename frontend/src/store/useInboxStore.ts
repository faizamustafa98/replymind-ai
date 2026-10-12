import { create } from "zustand";

/**
 * Caches conversation lists and per-conversation detail across route
 * navigations. /inbox, /rejected and /dashboard are separate top-level
 * routes with no shared layout, so every navigation between them used to
 * fully remount the page and refetch everything from Supabase — this store
 * survives those remounts (it's just a JS module, not tied to any route),
 * so a visit within CACHE_TTL_MS renders instantly instead of showing a
 * loading spinner again for data that hasn't gone stale.
 */

const CACHE_TTL_MS = 60_000;

interface CachedList {
  data: any[];
  fetchedAt: number;
}

interface CachedDetail {
  data: any;
  fetchedAt: number;
}

interface InboxState {
  inbox: CachedList | null;
  rejected: CachedList | null;
  detailsById: Record<string, CachedDetail>;

  setInbox: (data: any[]) => void;
  setRejected: (data: any[]) => void;
  setDetail: (id: string, data: any) => void;
  invalidateList: (list: "inbox" | "rejected") => void;
  isListFresh: (list: "inbox" | "rejected") => boolean;
  isDetailFresh: (id: string) => boolean;
}

export const useInboxStore = create<InboxState>((set, get) => ({
  inbox: null,
  rejected: null,
  detailsById: {},

  setInbox: (data) => set({ inbox: { data, fetchedAt: Date.now() } }),
  setRejected: (data) => set({ rejected: { data, fetchedAt: Date.now() } }),
  setDetail: (id, data) =>
    set((s) => ({ detailsById: { ...s.detailsById, [id]: { data, fetchedAt: Date.now() } } })),

  // Drop a cached list so the next visit refetches it — used after moving a
  // conversation between Inbox and Rejected, since the destination list's
  // cached copy no longer reflects the move.
  invalidateList: (list) => set({ [list]: null } as Pick<InboxState, "inbox" | "rejected">),

  isListFresh: (list) => {
    const cached = get()[list];
    return !!cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS;
  },
  isDetailFresh: (id) => {
    const cached = get().detailsById[id];
    return !!cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS;
  },
}));
