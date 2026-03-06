-- Leaderboard: include unlocked achievements count per user.

DROP FUNCTION IF EXISTS public.get_leaderboard();

CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  total_cards int,
  weighted_score int,
  achievements_unlocked int
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    u.id AS user_id,
    COALESCE(u.username, concat('Player-', left(u.id::text, 6))) AS username,
    u.avatar_url,
    COUNT(uc.card_id)::int AS total_cards,
    COALESCE(SUM(c.pc_value), 0)::int AS weighted_score,
    COALESCE(ua.unlocked_count, 0)::int AS achievements_unlocked
  FROM public.users u
  LEFT JOIN public.user_cards uc ON uc.user_id = u.id
  LEFT JOIN public.cards c ON c.id = uc.card_id
  LEFT JOIN (
    SELECT
      user_id,
      COUNT(*)::int AS unlocked_count
    FROM public.user_achievements
    GROUP BY user_id
  ) ua ON ua.user_id = u.id
  GROUP BY u.id, u.username, u.avatar_url, ua.unlocked_count
  ORDER BY weighted_score DESC, total_cards DESC, achievements_unlocked DESC, username ASC;
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;
