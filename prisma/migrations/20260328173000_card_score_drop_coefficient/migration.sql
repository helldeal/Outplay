-- Dynamic card score based on expected vs actual drop-rate.
-- - Overdropped cards get lower score
-- - Underdropped cards get higher score
-- Coefficient is clamped to [0.50, 2.00] to avoid extreme swings.

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
    u.avatar_url,
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
  GROUP BY u.id, u.username, u.avatar_url, a.unlocked_count, a.leaderboard_points
  ORDER BY weighted_score DESC, total_cards DESC, achievements_unlocked DESC, username ASC;
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;

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
  top_holder_drops bigint,
  expected_drop_rate_pct numeric,
  drop_coefficient numeric,
  card_score int,
  last_drop_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH target_card AS (
    SELECT c.id, c.series_id, c.rarity, c.pc_value
    FROM public.cards c
    WHERE c.id = p_card_id
    LIMIT 1
  ),
  all_opened_cards AS (
    SELECT
      bo.user_id,
      bo.created_at,
      card_elem.card_id
    FROM public.booster_openings bo
    JOIN target_card tc ON tc.series_id = bo.series_id
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
      COUNT(*) FILTER (WHERE aoc.card_id = p_card_id)::bigint AS total_card_drops,
      MAX(aoc.created_at) FILTER (WHERE aoc.card_id = p_card_id) AS last_drop_at
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
  ),
  series_totals AS (
    SELECT
      bo.series_id,
      COUNT(*)::bigint AS total_openings
    FROM public.booster_openings bo
    JOIN target_card tc ON tc.series_id = bo.series_id
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
    JOIN target_card tc ON tc.series_id = bo.series_id
    GROUP BY bo.series_id, b.type, b.drop_rates
  ),
  series_rarity_count AS (
    SELECT
      tc.series_id,
      tc.rarity,
      COUNT(*)::int AS cards_in_rarity
    FROM public.cards c
    JOIN target_card tc ON tc.series_id = c.series_id AND tc.rarity = c.rarity
    GROUP BY tc.series_id, tc.rarity
  ),
  expected_calc AS (
    SELECT
      COALESCE(
        SUM(
          (sbm.openings_count::numeric / NULLIF(st.total_openings::numeric, 0))
          * (
            CASE tc.rarity
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
      ) AS expected_rate
    FROM target_card tc
    LEFT JOIN series_totals st ON st.series_id = tc.series_id
    LEFT JOIN series_rarity_count src
      ON src.series_id = tc.series_id
     AND src.rarity = tc.rarity
    LEFT JOIN series_booster_mix sbm ON sbm.series_id = tc.series_id
  ),
  score_calc AS (
    SELECT
      CASE
        WHEN t.total_opened_cards > 0 THEN t.total_card_drops::numeric / t.total_opened_cards::numeric
        ELSE 0::numeric
      END AS actual_rate,
      ec.expected_rate,
      CASE
        WHEN ec.expected_rate > 0
         AND t.total_opened_cards > 0
         AND t.total_card_drops > 0
        THEN GREATEST(
          0.50::numeric,
          LEAST(2.00::numeric, ec.expected_rate / (t.total_card_drops::numeric / t.total_opened_cards::numeric))
        )
        ELSE 1.00::numeric
      END AS drop_coefficient,
      tc.pc_value
    FROM totals t
    CROSS JOIN expected_calc ec
    CROSS JOIN target_card tc
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
    th.drops AS top_holder_drops,
    ROUND(sc.expected_rate * 100, 6) AS expected_drop_rate_pct,
    ROUND(sc.drop_coefficient, 6) AS drop_coefficient,
    ROUND(sc.pc_value::numeric * sc.drop_coefficient)::int AS card_score,
    totals.last_drop_at
  FROM totals
  CROSS JOIN owners
  CROSS JOIN score_calc sc
  LEFT JOIN first_holder fh ON true
  LEFT JOIN top_holder th ON true;
$$;

REVOKE ALL ON FUNCTION public.get_public_card_stats(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_card_stats(text) TO authenticated;
