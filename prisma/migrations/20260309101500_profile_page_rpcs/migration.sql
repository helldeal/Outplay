-- Profile page RPCs: public profile overview, public profile collection, and secure self profile update.

DROP FUNCTION IF EXISTS public.get_public_profile_overview(uuid);

CREATE OR REPLACE FUNCTION public.get_public_profile_overview(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  title text,
  total_cards int,
  weighted_score int,
  achievements_unlocked int,
  total_openings int,
  normal_openings int,
  luck_openings int,
  premium_openings int,
  daily_openings int,
  streak_openings int,
  avg_pc_gained numeric,
  duplicate_rate numeric,
  legends_owned int,
  world_class_owned int,
  champion_owned int,
  best_card_id text,
  best_card_name text,
  best_card_rarity public."Rarity",
  best_card_pc_value int,
  favorite_game text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH base_user AS (
    SELECT
      u.id,
      COALESCE(NULLIF(trim(u.username), ''), concat('Player-', left(u.id::text, 6))) AS username,
      u.avatar_url,
      NULLIF(trim(u.title), '') AS title
    FROM public.users u
    WHERE u.id = p_user_id
  ),
  opening_stats AS (
    SELECT
      COUNT(*)::int AS total_openings,
      COUNT(*) FILTER (WHERE b.type = 'NORMAL')::int AS normal_openings,
      COUNT(*) FILTER (WHERE b.type = 'LUCK')::int AS luck_openings,
      COUNT(*) FILTER (WHERE b.type = 'PREMIUM')::int AS premium_openings,
      COUNT(*) FILTER (WHERE bo.type = 'DAILY')::int AS daily_openings,
      COUNT(*) FILTER (WHERE bo.type = 'STREAK')::int AS streak_openings,
      COALESCE(AVG(bo.pc_gained::numeric), 0::numeric) AS avg_pc_gained,
      CASE
        WHEN COUNT(*) = 0 THEN 0::numeric
        ELSE COALESCE(SUM(bo.duplicate_cards)::numeric / (COUNT(*)::numeric * 5), 0::numeric)
      END AS duplicate_rate
    FROM public.booster_openings bo
    LEFT JOIN public.boosters b ON b.id = bo.booster_id
    WHERE bo.user_id = p_user_id
  ),
  card_stats AS (
    SELECT
      COUNT(*)::int AS total_cards,
      COALESCE(SUM(c.pc_value), 0)::int AS weighted_score,
      COUNT(*) FILTER (WHERE c.rarity = 'LEGENDS')::int AS legends_owned,
      COUNT(*) FILTER (WHERE c.rarity = 'WORLD_CLASS')::int AS world_class_owned,
      COUNT(*) FILTER (WHERE c.rarity = 'CHAMPION')::int AS champion_owned
    FROM public.user_cards uc
    JOIN public.cards c ON c.id = uc.card_id
    WHERE uc.user_id = p_user_id
  ),
  achievements_stats AS (
    SELECT COUNT(*)::int AS achievements_unlocked
    FROM public.user_achievements ua
    WHERE ua.user_id = p_user_id
  ),
  best_card AS (
    SELECT
      c.id,
      c.name,
      c.rarity,
      c.pc_value
    FROM public.user_cards uc
    JOIN public.cards c ON c.id = uc.card_id
    WHERE uc.user_id = p_user_id
    ORDER BY c.pc_value DESC, uc.obtained_at DESC
    LIMIT 1
  ),
  favorite_game AS (
    SELECT
      g.name,
      COUNT(*)::int AS card_count
    FROM public.user_cards uc
    JOIN public.cards c ON c.id = uc.card_id
    JOIN public.games g ON g.id = c.game_id
    WHERE uc.user_id = p_user_id
    GROUP BY g.name
    ORDER BY card_count DESC, g.name ASC
    LIMIT 1
  )
  SELECT
    bu.id AS user_id,
    bu.username,
    bu.avatar_url,
    bu.title,
    COALESCE(cs.total_cards, 0) AS total_cards,
    COALESCE(cs.weighted_score, 0) AS weighted_score,
    COALESCE(ach.achievements_unlocked, 0) AS achievements_unlocked,
    COALESCE(os.total_openings, 0) AS total_openings,
    COALESCE(os.normal_openings, 0) AS normal_openings,
    COALESCE(os.luck_openings, 0) AS luck_openings,
    COALESCE(os.premium_openings, 0) AS premium_openings,
    COALESCE(os.daily_openings, 0) AS daily_openings,
    COALESCE(os.streak_openings, 0) AS streak_openings,
    COALESCE(os.avg_pc_gained, 0::numeric) AS avg_pc_gained,
    COALESCE(os.duplicate_rate, 0::numeric) AS duplicate_rate,
    COALESCE(cs.legends_owned, 0) AS legends_owned,
    COALESCE(cs.world_class_owned, 0) AS world_class_owned,
    COALESCE(cs.champion_owned, 0) AS champion_owned,
    bc.id AS best_card_id,
    bc.name AS best_card_name,
    bc.rarity AS best_card_rarity,
    bc.pc_value AS best_card_pc_value,
    fg.name AS favorite_game
  FROM base_user bu
  LEFT JOIN opening_stats os ON true
  LEFT JOIN card_stats cs ON true
  LEFT JOIN achievements_stats ach ON true
  LEFT JOIN best_card bc ON true
  LEFT JOIN favorite_game fg ON true;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_overview(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_overview(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.get_public_profile_collection(uuid);

CREATE OR REPLACE FUNCTION public.get_public_profile_collection(p_user_id uuid)
RETURNS TABLE (
  card_id text,
  obtained_at timestamptz,
  card_name text,
  card_rarity public."Rarity",
  card_image_url text,
  card_pc_value int,
  game_name text,
  game_logo_url text,
  team_name text,
  team_logo_url text,
  nationality_code text,
  nationality_flag_url text,
  role_name text,
  role_icon_url text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    uc.card_id,
    uc.obtained_at,
    c.name AS card_name,
    c.rarity AS card_rarity,
    c."imageUrl" AS card_image_url,
    c.pc_value AS card_pc_value,
    g.name AS game_name,
    g."logoUrl" AS game_logo_url,
    t.name AS team_name,
    t."logoUrl" AS team_logo_url,
    n.code AS nationality_code,
    n."flagUrl" AS nationality_flag_url,
    r.name AS role_name,
    r."iconUrl" AS role_icon_url
  FROM public.user_cards uc
  JOIN public.cards c ON c.id = uc.card_id
  JOIN public.games g ON g.id = c.game_id
  LEFT JOIN public.teams t ON t.id = c.team_id
  JOIN public.nationalities n ON n.id = c.nationality_id
  LEFT JOIN public.roles r ON r.id = c.role_id
  WHERE uc.user_id = p_user_id
  ORDER BY uc.obtained_at DESC, c.pc_value DESC;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_collection(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_collection(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.update_current_user_profile_identity(text, text);

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
  v_title text := NULLIF(trim(p_title), '');
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
