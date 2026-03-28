-- Include Series Split tier titles in profile title selection and validation

CREATE OR REPLACE FUNCTION public.get_current_user_available_titles(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  title text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'You can only access your own available titles';
  END IF;

  RETURN QUERY
  SELECT t.title
  FROM (
    SELECT DISTINCT ad.reward_title AS title
    FROM public.user_achievements ua
    JOIN public.achievement_definitions ad ON ad.id = ua.achievement_id
    WHERE ua.user_id = p_user_id
      AND ua.reward_granted_at IS NOT NULL
      AND ad.reward_title IS NOT NULL

    UNION

    SELECT DISTINCT st.reward_title AS title
    FROM public.user_series_split_tier ust
    JOIN public.series_split_tiers st ON st.id = ust.tier_id
    WHERE ust.user_id = p_user_id
      AND ust.claimed_at IS NOT NULL
      AND st.reward_title IS NOT NULL
  ) AS t
  WHERE NULLIF(trim(t.title), '') IS NOT NULL
  ORDER BY t.title ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_current_user_available_titles(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_user_available_titles(uuid) TO authenticated;

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
      FROM (
        SELECT ad.reward_title AS title
        FROM public.user_achievements ua
        JOIN public.achievement_definitions ad ON ad.id = ua.achievement_id
        WHERE ua.user_id = v_user_id
          AND ua.reward_granted_at IS NOT NULL
          AND ad.reward_title IS NOT NULL

        UNION ALL

        SELECT st.reward_title AS title
        FROM public.user_series_split_tier ust
        JOIN public.series_split_tiers st ON st.id = ust.tier_id
        WHERE ust.user_id = v_user_id
          AND ust.claimed_at IS NOT NULL
          AND st.reward_title IS NOT NULL
      ) unlocked_titles
      WHERE unlocked_titles.title = v_title
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
