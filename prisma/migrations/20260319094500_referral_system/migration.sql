ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS referral_code text,
ADD COLUMN IF NOT EXISTS referred_by_user_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_referred_by_user_id_fkey'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
    ADD CONSTRAINT users_referred_by_user_id_fkey
      FOREIGN KEY (referred_by_user_id)
      REFERENCES public.users(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.referral_code_from_user_id(p_user_id uuid)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT upper(replace(p_user_id::text, '-', ''));
$$;

UPDATE public.users
SET referral_code = public.referral_code_from_user_id(id)
WHERE referral_code IS NULL OR btrim(referral_code) = '';

ALTER TABLE public.users
ALTER COLUMN referral_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code_unique
  ON public.users (referral_code);

CREATE INDEX IF NOT EXISTS idx_users_referred_by_user_id
  ON public.users (referred_by_user_id);

CREATE OR REPLACE FUNCTION public.sync_auth_user_to_public_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_username text;
  v_avatar_url text;
BEGIN
  v_username :=
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'global_name', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'preferred_username', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'user_name', '')
    );

  v_avatar_url :=
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'avatar_url', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'picture', '')
    );

  INSERT INTO public.users (id, username, avatar_url, referral_code)
  VALUES (
    NEW.id,
    v_username,
    v_avatar_url,
    public.referral_code_from_user_id(NEW.id)
  )
  ON CONFLICT (id) DO UPDATE
  SET
    username = COALESCE(EXCLUDED.username, public.users.username),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    referral_code = COALESCE(public.users.referral_code, EXCLUDED.referral_code);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_current_user_profile(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_auth_user record;
  v_user public.users%ROWTYPE;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated user';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'You can only sync your own profile';
  END IF;

  SELECT *
  INTO v_auth_user
  FROM auth.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auth user not found';
  END IF;

  INSERT INTO public.users (id, username, avatar_url, referral_code)
  VALUES (
    v_auth_user.id,
    COALESCE(
      NULLIF(v_auth_user.raw_user_meta_data ->> 'global_name', ''),
      NULLIF(v_auth_user.raw_user_meta_data ->> 'preferred_username', ''),
      NULLIF(v_auth_user.raw_user_meta_data ->> 'name', ''),
      NULLIF(v_auth_user.raw_user_meta_data ->> 'user_name', '')
    ),
    COALESCE(
      NULLIF(v_auth_user.raw_user_meta_data ->> 'avatar_url', ''),
      NULLIF(v_auth_user.raw_user_meta_data ->> 'picture', '')
    ),
    public.referral_code_from_user_id(v_auth_user.id)
  )
  ON CONFLICT (id) DO UPDATE
  SET
    username = COALESCE(EXCLUDED.username, public.users.username),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    referral_code = COALESCE(public.users.referral_code, EXCLUDED.referral_code)
  RETURNING * INTO v_user;

  RETURN v_user;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_current_user_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_current_user_profile(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_referral_code(
  p_referral_code text,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  applied boolean,
  message text,
  sponsor_user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := COALESCE(p_user_id, auth.uid());
  v_referral_code text := upper(NULLIF(btrim(COALESCE(p_referral_code, '')), ''));
  v_sponsor_user_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'You can only claim referral code for yourself';
  END IF;

  IF v_referral_code IS NULL THEN
    RETURN QUERY SELECT false, 'Referral code is empty', NULL::uuid;
    RETURN;
  END IF;

  PERFORM 1
  FROM public.users u
  WHERE u.id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  SELECT u.id
  INTO v_sponsor_user_id
  FROM public.users u
  WHERE u.referral_code = v_referral_code;

  IF v_sponsor_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Referral code not found', NULL::uuid;
    RETURN;
  END IF;

  IF v_sponsor_user_id = v_user_id THEN
    RETURN QUERY SELECT false, 'You cannot use your own referral code', NULL::uuid;
    RETURN;
  END IF;

  UPDATE public.users u
  SET
    referred_by_user_id = v_sponsor_user_id,
    pc_balance = u.pc_balance + 2000,
    total_pc_earned = u.total_pc_earned + 2000
  WHERE u.id = v_user_id
    AND u.referred_by_user_id IS NULL;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Referral already claimed', NULL::uuid;
    RETURN;
  END IF;

  UPDATE public.users u
  SET
    pc_balance = u.pc_balance + 2000,
    total_pc_earned = u.total_pc_earned + 2000
  WHERE u.id = v_sponsor_user_id;

  RETURN QUERY SELECT true, 'Referral reward granted', v_sponsor_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_referral_code(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_referral_code(text, uuid) TO authenticated;
