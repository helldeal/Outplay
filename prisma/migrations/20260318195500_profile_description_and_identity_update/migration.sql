-- Add profile description and remove username edit from profile identity RPC

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS description text;

CREATE OR REPLACE FUNCTION public.get_public_profile_description(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  description text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    u.id AS user_id,
    NULLIF(trim(u.description), '') AS description
  FROM public.users u
  WHERE u.id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_description(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_description(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.update_current_user_profile_identity(text, text);
DROP FUNCTION IF EXISTS public.update_current_user_profile_identity(text, text, text);
DROP FUNCTION IF EXISTS public.update_current_user_profile_identity(text, text, text, text);

CREATE OR REPLACE FUNCTION public.update_current_user_profile_identity(
  p_title text DEFAULT NULL,
  p_signature_card_id text DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  username text,
  title text,
  signature_card_id text,
  description text
)
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_title_raw text := NULLIF(trim(COALESCE(p_title, '')), '');
  v_title text;
  v_signature_card_id text := NULLIF(trim(COALESCE(p_signature_card_id, '')), '');
  v_description text := NULLIF(trim(COALESCE(p_description, '')), '');
  v_is_allowed_title boolean := false;
  v_owns_signature_card boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_title_raw IS NULL OR lower(v_title_raw) IN ('null', 'undefined', 'aucun titre') THEN
    v_title := NULL;
  ELSE
    v_title := v_title_raw;
  END IF;

  IF v_title IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.user_achievements ua
      JOIN public.achievement_definitions ad ON ad.id = ua.achievement_id
      WHERE ua.user_id = v_user_id
        AND ua.reward_granted_at IS NOT NULL
        AND ad.reward_title = v_title
    )
    INTO v_is_allowed_title;

    IF NOT v_is_allowed_title THEN
      RAISE EXCEPTION 'Title is not unlocked by this user';
    END IF;
  END IF;

  IF v_signature_card_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.user_cards uc
      WHERE uc.user_id = v_user_id
        AND uc.card_id = v_signature_card_id
    )
    INTO v_owns_signature_card;

    IF NOT v_owns_signature_card THEN
      RAISE EXCEPTION 'Signature card must belong to current user';
    END IF;
  END IF;

  UPDATE public.users u
  SET
    title = v_title,
    signature_card_id = v_signature_card_id,
    description = v_description
  WHERE u.id = v_user_id;

  RETURN QUERY
  SELECT
    u.id,
    u.username,
    u.title,
    u.signature_card_id,
    u.description
  FROM public.users u
  WHERE u.id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_current_user_profile_identity(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_current_user_profile_identity(text, text, text) TO authenticated;
