"use server";

import { createClient } from "@/src/lib/supabase/server";

export async function signIn(email: string, password: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };
  return { error: null };
}

export async function signUp(email: string, password: string, name: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });

  console.log("DEBUG signUp session:", data.session);
  console.log("DEBUG signUp access_token:", data.session?.access_token);

  if (error) return { error: error.message };
  return { error: null };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
