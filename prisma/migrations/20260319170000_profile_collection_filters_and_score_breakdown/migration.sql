DROP FUNCTION IF EXISTS public.get_leaderboard();

CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  total_cards int,
  weighted_score int,
  card_score int,
  achievement_score int,
  achievements_unlocked int
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH achievements AS (
    SELECT
      ua.user_id,
      COUNT(*)::int AS unlocked_count,
      COALESCE(SUM(ad.leaderboard_points), 0)::int AS leaderboard_points
    FROM public.user_achievements ua
    JOIN public.achievement_definitions ad ON ad.id = ua.achievement_id
    GROUP BY ua.user_id
  )
  SELECT
    u.id AS user_id,
    COALESCE(u.username, concat('Player-', left(u.id::text, 6))) AS username,
    u.avatar_url,
    COUNT(uc.card_id)::int AS total_cards,
    (
      COALESCE(SUM(c.pc_value), 0)::int
      + COALESCE(a.leaderboard_points, 0)
    )::int AS weighted_score,
    COALESCE(SUM(c.pc_value), 0)::int AS card_score,
    COALESCE(a.leaderboard_points, 0)::int AS achievement_score,
    COALESCE(a.unlocked_count, 0)::int AS achievements_unlocked
  FROM public.users u
  LEFT JOIN public.user_cards uc ON uc.user_id = u.id
  LEFT JOIN public.cards c ON c.id = uc.card_id
  LEFT JOIN achievements a ON a.user_id = u.id
  GROUP BY u.id, u.username, u.avatar_url, a.unlocked_count, a.leaderboard_points
  ORDER BY weighted_score DESC, total_cards DESC, achievements_unlocked DESC, username ASC;
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;

DROP FUNCTION IF EXISTS public.get_public_profile_collection(uuid);

CREATE OR REPLACE FUNCTION public.get_public_profile_collection(p_user_id uuid)
RETURNS TABLE (
  card_id text,
  obtained_at timestamptz,
  card_name text,
  card_rarity public."Rarity",
  card_image_url text,
  card_pc_value int,
  series_name text,
  series_code text,
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
    s.name AS series_name,
    s.code AS series_code,
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
  LEFT JOIN public.series s ON s.id = c.series_id
  JOIN public.games g ON g.id = c.game_id
  LEFT JOIN public.teams t ON t.id = c.team_id
  JOIN public.nationalities n ON n.id = c.nationality_id
  LEFT JOIN public.roles r ON r.id = c.role_id
  WHERE uc.user_id = p_user_id
  ORDER BY uc.obtained_at DESC, c.pc_value DESC;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_collection(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_collection(uuid) TO authenticated;
