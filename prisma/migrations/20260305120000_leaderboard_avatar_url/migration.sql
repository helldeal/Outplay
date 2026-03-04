-- Add avatar_url to leaderboard & recent drops RPCs.

DROP FUNCTION IF EXISTS public.get_leaderboard();

CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  total_cards int,
  weighted_score int
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
    COALESCE(SUM(c.pc_value), 0)::int AS weighted_score
  FROM public.users u
  LEFT JOIN public.user_cards uc ON uc.user_id = u.id
  LEFT JOIN public.cards c ON c.id = uc.card_id
  GROUP BY u.id, u.username, u.avatar_url
  ORDER BY weighted_score DESC, total_cards DESC, username ASC;
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;

DROP FUNCTION IF EXISTS public.get_recent_drops(int);

CREATE OR REPLACE FUNCTION public.get_recent_drops(p_limit int DEFAULT 5, p_offset int DEFAULT 0)
RETURNS TABLE (
  opening_id uuid,
  user_id uuid,
  username text,
  avatar_url text,
  booster_name text,
  opened_at timestamptz,
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
    bo.user_id,
    COALESCE(u.username, concat('Player-', left(u.id::text, 6))) AS username,
    u.avatar_url,
    b.name AS booster_name,
    bo.created_at AS opened_at,
    best_card.id AS best_card_id,
    best_card.name AS best_card_name,
    best_card.rarity AS best_card_rarity,
    best_card."imageUrl" AS best_card_image_url,
    best_card.pc_value::int AS best_card_pc_value
  FROM public.booster_openings bo
  JOIN public.users u ON u.id = bo.user_id
  JOIN public.boosters b ON b.id = bo.booster_id
  LEFT JOIN LATERAL (
    SELECT
      c.id,
      c.name,
      c.rarity,
      c."imageUrl",
      c.pc_value
    FROM jsonb_array_elements_text(
      CASE
        WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
        ELSE '[]'::jsonb
      END
    ) card_id
    JOIN public.cards c ON c.id = card_id
    ORDER BY
      c.pc_value DESC,
      CASE c.rarity
        WHEN 'LEGENDS'::public."Rarity" THEN 5
        WHEN 'WORLD_CLASS'::public."Rarity" THEN 4
        WHEN 'CHAMPION'::public."Rarity" THEN 3
        WHEN 'CHALLENGER'::public."Rarity" THEN 2
        WHEN 'ROOKIE'::public."Rarity" THEN 1
        ELSE 0
      END DESC,
      c.id ASC
    LIMIT 1
  ) best_card ON true
  ORDER BY bo.created_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 5), 1)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.get_recent_drops(int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recent_drops(int, int) TO authenticated;
