-- Expose public identity fields directly in leaderboard RPC.
-- This avoids client-side reads on users table (RLS-limited) and provides
-- title + signature card metadata for leaderboard views.

DROP FUNCTION IF EXISTS public.get_leaderboard();

CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
  user_id uuid,
  username text,
  title text,
  avatar_url text,
  signature_card_name text,
  signature_card_rarity public."Rarity",
  signature_card_image_url text,
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
  ),
  series_totals AS (
    SELECT
      bo.series_id,
      COUNT(*)::bigint AS total_openings,
      (COUNT(*) * 5)::bigint AS total_opened_cards
    FROM public.booster_openings bo
    GROUP BY bo.series_id
  ),
  series_booster_mix AS (
    SELECT
      bo.series_id,
      b.type AS booster_type,
      COUNT(*)::bigint AS openings_count,
      COALESCE((b.drop_rates ->> 'ROOKIE')::numeric, 0) AS rate_rookie,
      COALESCE((b.drop_rates ->> 'CHALLENGER')::numeric, 0) AS rate_challenger,
      COALESCE((b.drop_rates ->> 'CHAMPION')::numeric, 0) AS rate_champion,
      COALESCE((b.drop_rates ->> 'WORLD_CLASS')::numeric, 0) AS rate_world_class,
      COALESCE((b.drop_rates ->> 'LEGENDS')::numeric, 0) AS rate_legends
    FROM public.booster_openings bo
    JOIN public.boosters b ON b.id = bo.booster_id
    GROUP BY bo.series_id, b.type, b.drop_rates
  ),
  series_rarity_counts AS (
    SELECT
      c.series_id,
      c.rarity,
      COUNT(*)::int AS cards_in_rarity
    FROM public.cards c
    GROUP BY c.series_id, c.rarity
  ),
  opened_cards AS (
    SELECT
      bo.series_id,
      drawn.card_id
    FROM public.booster_openings bo
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE
        WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
        ELSE '[]'::jsonb
      END
    ) AS drawn(card_id)
  ),
  card_actual AS (
    SELECT
      oc.card_id,
      COUNT(*)::bigint AS total_card_drops
    FROM opened_cards oc
    GROUP BY oc.card_id
  ),
  card_coefficients AS (
    SELECT
      c.id AS card_id,
      c.pc_value,
      st.total_openings,
      st.total_opened_cards,
      COALESCE(ca.total_card_drops, 0)::bigint AS total_card_drops,
      COALESCE(
        SUM(
          (sbm.openings_count::numeric / NULLIF(st.total_openings::numeric, 0))
          * (
            CASE c.rarity
              WHEN 'ROOKIE'::public."Rarity" THEN sbm.rate_rookie
              WHEN 'CHALLENGER'::public."Rarity" THEN sbm.rate_challenger
              WHEN 'CHAMPION'::public."Rarity" THEN sbm.rate_champion
              WHEN 'WORLD_CLASS'::public."Rarity" THEN sbm.rate_world_class
              WHEN 'LEGENDS'::public."Rarity" THEN sbm.rate_legends
            END / 100.0
          )
          * (1.0 / NULLIF(src.cards_in_rarity::numeric, 0))
        ),
        0::numeric
      ) AS expected_rate,
      CASE
        WHEN st.total_opened_cards > 0 THEN
          COALESCE(ca.total_card_drops, 0)::numeric / st.total_opened_cards::numeric
        ELSE 0::numeric
      END AS actual_rate
    FROM public.cards c
    LEFT JOIN series_totals st ON st.series_id = c.series_id
    LEFT JOIN series_rarity_counts src
      ON src.series_id = c.series_id
     AND src.rarity = c.rarity
    LEFT JOIN series_booster_mix sbm ON sbm.series_id = c.series_id
    LEFT JOIN card_actual ca ON ca.card_id = c.id
    GROUP BY
      c.id,
      c.pc_value,
      c.rarity,
      st.total_openings,
      st.total_opened_cards,
      src.cards_in_rarity,
      ca.total_card_drops
  ),
  card_weighted_values AS (
    SELECT
      cc.card_id,
      ROUND(
        cc.pc_value::numeric *
        CASE
          WHEN cc.expected_rate > 0 AND cc.actual_rate > 0 THEN
            GREATEST(0.50::numeric, LEAST(2.00::numeric, cc.expected_rate / cc.actual_rate))
          ELSE 1.00::numeric
        END
      )::int AS weighted_pc_value
    FROM card_coefficients cc
  )
  SELECT
    u.id AS user_id,
    COALESCE(u.username, concat('Player-', left(u.id::text, 6))) AS username,
    u.title,
    u.avatar_url,
    sc.name AS signature_card_name,
    sc.rarity AS signature_card_rarity,
    sc."imageUrl" AS signature_card_image_url,
    COUNT(uc.card_id)::int AS total_cards,
    (
      COALESCE(SUM(cwv.weighted_pc_value), 0)::int
      + COALESCE(a.leaderboard_points, 0)
    )::int AS weighted_score,
    COALESCE(SUM(cwv.weighted_pc_value), 0)::int AS card_score,
    COALESCE(a.leaderboard_points, 0)::int AS achievement_score,
    COALESCE(a.unlocked_count, 0)::int AS achievements_unlocked
  FROM public.users u
  LEFT JOIN public.user_cards uc ON uc.user_id = u.id
  LEFT JOIN card_weighted_values cwv ON cwv.card_id = uc.card_id
  LEFT JOIN achievements a ON a.user_id = u.id
  LEFT JOIN public.user_cards usc
    ON usc.user_id = u.id
   AND usc.card_id = u.signature_card_id
  LEFT JOIN public.cards sc ON sc.id = usc.card_id
  GROUP BY
    u.id,
    u.username,
    u.title,
    u.avatar_url,
    sc.name,
    sc.rarity,
    sc."imageUrl",
    a.unlocked_count,
    a.leaderboard_points
  ORDER BY weighted_score DESC, total_cards DESC, achievements_unlocked DESC, username ASC;
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;
