import "server-only";
import { cache } from "react";
import { createClient } from "@/src/lib/supabase/server";

// Revalidates the session against Supabase's auth server on every call, but
// memoized per-request so Server Components/Actions sharing a render pass
// don't each pay the round trip. This is the check to rely on for real
// authorization — proxy.ts only does an optimistic redirect.
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
