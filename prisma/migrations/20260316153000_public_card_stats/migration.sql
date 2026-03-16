-- Public card stats RPC for expanded card details.

DROP FUNCTION IF EXISTS public.get_public_card_stats(text);

CREATE OR REPLACE FUNCTION public.get_public_card_stats(p_card_id text)
RETURNS TABLE (
  card_id text,
  total_opened_cards bigint,
  total_card_drops bigint,
  drop_rate_pct numeric,
  owners_count int,
  first_holder_user_id uuid,
  first_holder_username text,
  first_holder_avatar_url text,
  first_holder_obtained_at timestamptz,
  top_holder_user_id uuid,
  top_holder_username text,
  top_holder_avatar_url text,
  top_holder_drops bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH all_opened_cards AS (
    SELECT
      bo.user_id,
      card_elem.card_id
    FROM public.booster_openings bo
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE
        WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
        ELSE '[]'::jsonb
      END
    ) AS card_elem(card_id)
  ),
  totals AS (
    SELECT
      COUNT(*)::bigint AS total_opened_cards,
      COUNT(*) FILTER (WHERE aoc.card_id = p_card_id)::bigint AS total_card_drops
    FROM all_opened_cards aoc
  ),
  owners AS (
    SELECT COUNT(DISTINCT uc.user_id)::int AS owners_count
    FROM public.user_cards uc
    WHERE uc.card_id = p_card_id
  ),
  first_holder AS (
    SELECT
      uc.user_id,
      COALESCE(NULLIF(trim(u.username), ''), concat('Player-', left(u.id::text, 6))) AS username,
      u.avatar_url,
      uc.obtained_at
    FROM public.user_cards uc
    JOIN public.users u ON u.id = uc.user_id
    WHERE uc.card_id = p_card_id
    ORDER BY uc.obtained_at ASC, uc.user_id ASC
    LIMIT 1
  ),
  top_holder AS (
    SELECT
      grouped.user_id,
      grouped.drops,
      COALESCE(NULLIF(trim(u.username), ''), concat('Player-', left(u.id::text, 6))) AS username,
      u.avatar_url
    FROM (
      SELECT
        aoc.user_id,
        COUNT(*)::bigint AS drops
      FROM all_opened_cards aoc
      WHERE aoc.card_id = p_card_id
      GROUP BY aoc.user_id
      ORDER BY drops DESC, aoc.user_id ASC
      LIMIT 1
    ) grouped
    JOIN public.users u ON u.id = grouped.user_id
  )
  SELECT
    p_card_id AS card_id,
    totals.total_opened_cards,
    totals.total_card_drops,
    CASE
      WHEN totals.total_opened_cards > 0 THEN
        ROUND((totals.total_card_drops::numeric * 100) / totals.total_opened_cards::numeric, 6)
      ELSE 0::numeric
    END AS drop_rate_pct,
    owners.owners_count,
    fh.user_id AS first_holder_user_id,
    fh.username AS first_holder_username,
    fh.avatar_url AS first_holder_avatar_url,
    fh.obtained_at AS first_holder_obtained_at,
    th.user_id AS top_holder_user_id,
    th.username AS top_holder_username,
    th.avatar_url AS top_holder_avatar_url,
    th.drops AS top_holder_drops
  FROM totals
  CROSS JOIN owners
  LEFT JOIN first_holder fh ON true
  LEFT JOIN top_holder th ON true;
$$;

REVOKE ALL ON FUNCTION public.get_public_card_stats(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_card_stats(text) TO authenticated;
