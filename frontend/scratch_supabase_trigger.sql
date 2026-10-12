-- 1. Leftover pre-Supabase-Auth column: password_hash was for a custom auth
-- system; Supabase Auth owns real password storage in auth.users now, so this
-- app-side column would never be populated by us. Drop it entirely.
ALTER TABLE public.users DROP COLUMN password_hash;

-- 2. Tie public.users.id to the real Supabase auth user, and tenant_id to tenants.
-- Skip any ADD PRIMARY KEY/FK statement below that already exists on your tables.
-- tenants.id already has a primary key, so nothing to add there.

ALTER TABLE public.users
  ADD CONSTRAINT users_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE public.users
  ADD CONSTRAINT users_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- 3. Trigger function: fires after Supabase creates a row in auth.users
-- (i.e. right after signUp()). Creates a new tenant, then the matching
-- public.users profile row pointing at it.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.tenants (
    id, auto_reply_level, rag_context_window, rag_confidence_threshold,
    plan_tier, plan_expires_at, onboarding_completed, profile_completed,
    documents_uploaded, business_profile, business_name, bot_persona,
    bot_language, created_at, updated_at
  ) VALUES (
    new_tenant_id,
    'average',              -- auto_reply_level default
    10,                     -- rag_context_window default
    0.85,                   -- rag_confidence_threshold, matches 'average'
    'free',                 -- plan_tier default
    NULL,                   -- plan_expires_at (free plan never expires)
    false, false, false,    -- onboarding/profile/documents flags
    '{}'::jsonb,            -- business_profile, filled in during onboarding
    'New Business',         -- business_name placeholder, overwritten in onboarding
    'friendly',             -- bot_persona default
    'en',                   -- bot_language default
    now(), now()
  );

  INSERT INTO public.users (
    id, full_name, role, email, tenant_id, created_at, updated_at
  ) VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    'owner',                -- first user of a new tenant is its owner
    NEW.email,
    new_tenant_id,
    now(), now()
  );

  RETURN NEW;
END;
$$;

-- 4. Attach the trigger to Supabase's own auth.users table.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
