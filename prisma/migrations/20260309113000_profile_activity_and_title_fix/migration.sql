-- Profile fixes: robust title normalization + public profile activity RPCs.

CREATE OR REPLACE FUNCTION public.update_current_user_profile_identity(
  p_username text,
  p_title text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  username text,
  title text
)
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_username text := NULLIF(trim(p_username), '');
  v_title_raw text := NULLIF(trim(COALESCE(p_title, '')), '');
  v_title text;
  v_is_allowed_title boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_username IS NULL THEN
    RAISE EXCEPTION 'Username is required';
  END IF;

  IF length(v_username) < 3 OR length(v_username) > 24 THEN
    RAISE EXCEPTION 'Username length must be between 3 and 24 characters';
  END IF;

  IF v_username !~ '^[A-Za-z0-9 _-]+$' THEN
    RAISE EXCEPTION 'Username contains forbidden characters';
  END IF;

  -- Normalize common frontend sentinel values to NULL.
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

  UPDATE public.users u
  SET
    username = v_username,
    title = v_title
  WHERE u.id = v_user_id;

  RETURN QUERY
  SELECT
    u.id,
    u.username,
    u.title
  FROM public.users u
  WHERE u.id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_current_user_profile_identity(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_current_user_profile_identity(text, text) TO authenticated;

DROP FUNCTION IF EXISTS public.get_public_profile_recent_openings(uuid, int);

CREATE OR REPLACE FUNCTION public.get_public_profile_recent_openings(
  p_user_id uuid,
  p_limit int DEFAULT 8
)
RETURNS TABLE (
  opening_id uuid,
  opened_at timestamptz,
  opening_type public."OpeningType",
  booster_name text,
  booster_type public."BoosterType",
  series_name text,
  pc_gained int,
  duplicate_cards int,
  best_card_id text,
  best_card_name text,
  best_card_rarity public."Rarity",
  best_card_image_url text,
  best_card_pc_value int
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    bo.id AS opening_id,
    bo.created_at AS opened_at,
    bo.type AS opening_type,
    b.name AS booster_name,
    b.type AS booster_type,
    s.name AS series_name,
    bo.pc_gained,
    bo.duplicate_cards,
    best_card.id AS best_card_id,
    best_card.name AS best_card_name,
    best_card.rarity AS best_card_rarity,
    best_card."imageUrl" AS best_card_image_url,
    best_card.pc_value AS best_card_pc_value
  FROM public.booster_openings bo
  LEFT JOIN public.boosters b ON b.id = bo.booster_id
  LEFT JOIN public.series s ON s.id = bo.series_id
  LEFT JOIN LATERAL (
    SELECT
      c.id,
      c.name,
      c.rarity,
      c."imageUrl",
      c.pc_value
    FROM jsonb_array_elements_text(bo.cards) AS opened_card(card_id)
    JOIN public.cards c ON c.id = opened_card.card_id
    ORDER BY c.pc_value DESC, c.id ASC
    LIMIT 1
  ) best_card ON true
  WHERE bo.user_id = p_user_id
  ORDER BY bo.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 8), 30));
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_recent_openings(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_recent_openings(uuid, int) TO authenticated;

DROP FUNCTION IF EXISTS public.get_public_profile_recent_achievements(uuid, int);

CREATE OR REPLACE FUNCTION public.get_public_profile_recent_achievements(
  p_user_id uuid,
  p_limit int DEFAULT 8
)
RETURNS TABLE (
  unlocked_at timestamptz,
  code text,
  name text,
  category text,
  reward_title text,
  reward_pc int,
  reward_booster_type public."BoosterType"
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    ua.unlocked_at,
    ad.code,
    ad.name,
    ad.category,
    ad.reward_title,
    ad.reward_pc,
    ad.reward_booster_type
  FROM public.user_achievements ua
  JOIN public.achievement_definitions ad ON ad.id = ua.achievement_id
  WHERE ua.user_id = p_user_id
  ORDER BY ua.unlocked_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 8), 30));
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_recent_achievements(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_recent_achievements(uuid, int) TO authenticated;
