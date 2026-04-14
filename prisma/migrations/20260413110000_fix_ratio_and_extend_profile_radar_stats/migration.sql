-- Fix ratio orientation (score/value) and extend profile radar stats with
-- average booster openings per day + booster profitability.

DROP FUNCTION IF EXISTS public.get_public_profile_radar_stats(uuid);

CREATE OR REPLACE FUNCTION public.get_public_profile_radar_stats(p_user_id uuid)
RETURNS TABLE (
  player_duplicate_rate numeric,
  player_big_pull_rate numeric,
  player_avg_pc_gained numeric,
  player_avg_pc_spent numeric,
  player_value_score_ratio numeric,
  player_avg_booster_openings_per_day numeric,
  player_avg_booster_profitability numeric,
  avg_duplicate_rate numeric,
  avg_big_pull_rate numeric,
  avg_avg_pc_gained numeric,
  avg_avg_pc_spent numeric,
  avg_value_score_ratio numeric,
  avg_avg_booster_openings_per_day numeric,
  avg_avg_booster_profitability numeric,
  max_duplicate_rate numeric,
  max_big_pull_rate numeric,
  max_avg_pc_gained numeric,
  max_avg_pc_spent numeric,
  max_value_score_ratio numeric,
  max_avg_booster_openings_per_day numeric,
  max_avg_booster_profitability numeric,
  min_duplicate_rate numeric,
  min_big_pull_rate numeric,
  min_avg_pc_gained numeric,
  min_avg_pc_spent numeric,
  min_value_score_ratio numeric,
  min_avg_booster_openings_per_day numeric,
  min_avg_booster_profitability numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH all_users AS (
    SELECT u.id AS user_id
    FROM public.users u
  ),
  leaderboard_scores AS (
    SELECT
      lb.user_id,
      lb.card_score
    FROM public.get_leaderboard() lb
  ),
  card_value_totals AS (
    SELECT
      au.user_id,
      COALESCE(SUM(c.pc_value), 0)::numeric AS total_card_value
    FROM all_users au
    LEFT JOIN public.user_cards uc ON uc.user_id = au.user_id
    LEFT JOIN public.cards c ON c.id = uc.card_id
    GROUP BY au.user_id
  ),
  opening_base AS (
    SELECT
      au.user_id,
      bo.id AS opening_id,
      bo.type AS opening_type,
      bo.cards,
      bo.pc_gained,
      bo.duplicate_cards,
      b.price_pc,
      bo.created_at
    FROM all_users au
    LEFT JOIN public.booster_openings bo ON bo.user_id = au.user_id
    LEFT JOIN public.boosters b ON b.id = bo.booster_id
  ),
  opening_values AS (
    SELECT
      ob.user_id,
      ob.opening_id,
      COALESCE(ob.price_pc, 0)::numeric AS opening_price,
      COALESCE(opening_card_values.total_value, 0::numeric) AS opening_card_value
    FROM opening_base ob
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(c.pc_value), 0)::numeric AS total_value
      FROM jsonb_array_elements_text(
        CASE
          WHEN ob.cards IS NULL THEN '[]'::jsonb
          WHEN jsonb_typeof(ob.cards::jsonb) = 'array' THEN ob.cards::jsonb
          ELSE '[]'::jsonb
        END
      ) AS opened(card_id)
      JOIN public.cards c ON c.id = opened.card_id
    ) AS opening_card_values ON true
  ),
  opening_stats AS (
    SELECT
      ob.user_id,
      COUNT(ob.opening_id)::numeric AS total_openings,
      COALESCE(AVG(ob.pc_gained::numeric), 0::numeric) AS avg_pc_gained,
      CASE
        WHEN COUNT(ob.opening_id) = 0 THEN 0::numeric
        ELSE COALESCE(
          SUM(
            CASE
              WHEN ob.opening_type = 'SHOP'::public."OpeningType" THEN COALESCE(ob.price_pc, 0)
              ELSE 0
            END
          ),
          0
        )::numeric / COUNT(ob.opening_id)::numeric
      END AS avg_pc_spent,
      COALESCE(SUM(ob.duplicate_cards), 0)::numeric AS duplicate_cards_total,
      CASE
        WHEN COUNT(ob.opening_id) = 0 THEN 0::numeric
        ELSE COUNT(ob.opening_id)::numeric /
          GREATEST(
            (EXTRACT(EPOCH FROM (NOW() - MIN(ob.created_at))) / 86400.0)::numeric + 1,
            1::numeric
          )
      END AS avg_booster_openings_per_day
    FROM opening_base ob
    GROUP BY ob.user_id
  ),
  profitability_stats AS (
    SELECT
      ov.user_id,
      CASE
        WHEN COUNT(*) FILTER (WHERE ov.opening_id IS NOT NULL AND ov.opening_price > 0) = 0 THEN 0::numeric
        ELSE COALESCE(
          AVG(
            CASE
              WHEN ov.opening_price > 0 THEN ov.opening_card_value / ov.opening_price
              ELSE NULL
            END
          ),
          0::numeric
        )
      END AS avg_booster_profitability
    FROM opening_values ov
    GROUP BY ov.user_id
  ),
  drop_stats AS (
    SELECT
      ob.user_id,
      COUNT(*)::numeric AS total_drop_cards,
      COUNT(*) FILTER (
        WHERE c.rarity IN ('LEGENDS'::public."Rarity", 'WORLD_CLASS'::public."Rarity")
      )::numeric AS big_pull_cards
    FROM opening_base ob
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE
        WHEN ob.cards IS NULL THEN '[]'::jsonb
        WHEN jsonb_typeof(ob.cards::jsonb) = 'array' THEN ob.cards::jsonb
        ELSE '[]'::jsonb
      END
    ) AS opened(card_id)
    JOIN public.cards c ON c.id = opened.card_id
    GROUP BY ob.user_id
  ),
  all_metrics AS (
    SELECT
      au.user_id,
      CASE
        WHEN COALESCE(ds.total_drop_cards, 0) = 0 THEN 0::numeric
        ELSE (COALESCE(os.duplicate_cards_total, 0) * 100.0) / ds.total_drop_cards
      END AS duplicate_rate,
      CASE
        WHEN COALESCE(ds.total_drop_cards, 0) = 0 THEN 0::numeric
        ELSE (COALESCE(ds.big_pull_cards, 0) * 100.0) / ds.total_drop_cards
      END AS big_pull_rate,
      COALESCE(os.avg_pc_gained, 0::numeric) AS avg_pc_gained,
      COALESCE(os.avg_pc_spent, 0::numeric) AS avg_pc_spent,
      CASE
        WHEN COALESCE(cvt.total_card_value, 0) > 0 THEN
          COALESCE(ls.card_score, 0)::numeric / cvt.total_card_value
        ELSE 0::numeric
      END AS value_score_ratio,
      COALESCE(os.avg_booster_openings_per_day, 0::numeric) AS avg_booster_openings_per_day,
      COALESCE(ps.avg_booster_profitability, 0::numeric) AS avg_booster_profitability
    FROM all_users au
    LEFT JOIN opening_stats os ON os.user_id = au.user_id
    LEFT JOIN profitability_stats ps ON ps.user_id = au.user_id
    LEFT JOIN drop_stats ds ON ds.user_id = au.user_id
    LEFT JOIN card_value_totals cvt ON cvt.user_id = au.user_id
    LEFT JOIN leaderboard_scores ls ON ls.user_id = au.user_id
  ),
  player_metric AS (
    SELECT *
    FROM all_metrics am
    WHERE am.user_id = p_user_id
    LIMIT 1
  ),
  averages AS (
    SELECT
      COALESCE(AVG(am.duplicate_rate), 0::numeric) AS duplicate_rate,
      COALESCE(AVG(am.big_pull_rate), 0::numeric) AS big_pull_rate,
      COALESCE(AVG(am.avg_pc_gained), 0::numeric) AS avg_pc_gained,
      COALESCE(AVG(am.avg_pc_spent), 0::numeric) AS avg_pc_spent,
      COALESCE(AVG(am.value_score_ratio), 0::numeric) AS value_score_ratio,
      COALESCE(AVG(am.avg_booster_openings_per_day), 0::numeric) AS avg_booster_openings_per_day,
      COALESCE(AVG(am.avg_booster_profitability), 0::numeric) AS avg_booster_profitability
    FROM all_metrics am
  ),
  maxes AS (
    SELECT
      COALESCE(MAX(am.duplicate_rate), 0::numeric) AS duplicate_rate,
      COALESCE(MAX(am.big_pull_rate), 0::numeric) AS big_pull_rate,
      COALESCE(MAX(am.avg_pc_gained), 0::numeric) AS avg_pc_gained,
      COALESCE(MAX(am.avg_pc_spent), 0::numeric) AS avg_pc_spent,
      COALESCE(MAX(am.value_score_ratio), 0::numeric) AS value_score_ratio,
      COALESCE(MAX(am.avg_booster_openings_per_day), 0::numeric) AS avg_booster_openings_per_day,
      COALESCE(MAX(am.avg_booster_profitability), 0::numeric) AS avg_booster_profitability
    FROM all_metrics am
  ),
  mins AS (
    SELECT
      COALESCE(MIN(am.duplicate_rate), 0::numeric) AS duplicate_rate,
      COALESCE(MIN(am.big_pull_rate), 0::numeric) AS big_pull_rate,
      COALESCE(MIN(am.avg_pc_gained), 0::numeric) AS avg_pc_gained,
      COALESCE(MIN(am.avg_pc_spent), 0::numeric) AS avg_pc_spent,
      COALESCE(MIN(am.value_score_ratio), 0::numeric) AS value_score_ratio,
      COALESCE(MIN(am.avg_booster_openings_per_day), 0::numeric) AS avg_booster_openings_per_day,
      COALESCE(MIN(am.avg_booster_profitability), 0::numeric) AS avg_booster_profitability
    FROM all_metrics am
  )
  SELECT
    COALESCE(pm.duplicate_rate, 0::numeric) AS player_duplicate_rate,
    COALESCE(pm.big_pull_rate, 0::numeric) AS player_big_pull_rate,
    COALESCE(pm.avg_pc_gained, 0::numeric) AS player_avg_pc_gained,
    COALESCE(pm.avg_pc_spent, 0::numeric) AS player_avg_pc_spent,
    COALESCE(pm.value_score_ratio, 0::numeric) AS player_value_score_ratio,
    COALESCE(pm.avg_booster_openings_per_day, 0::numeric) AS player_avg_booster_openings_per_day,
    COALESCE(pm.avg_booster_profitability, 0::numeric) AS player_avg_booster_profitability,
    COALESCE(av.duplicate_rate, 0::numeric) AS avg_duplicate_rate,
    COALESCE(av.big_pull_rate, 0::numeric) AS avg_big_pull_rate,
    COALESCE(av.avg_pc_gained, 0::numeric) AS avg_avg_pc_gained,
    COALESCE(av.avg_pc_spent, 0::numeric) AS avg_avg_pc_spent,
    COALESCE(av.value_score_ratio, 0::numeric) AS avg_value_score_ratio,
    COALESCE(av.avg_booster_openings_per_day, 0::numeric) AS avg_avg_booster_openings_per_day,
    COALESCE(av.avg_booster_profitability, 0::numeric) AS avg_avg_booster_profitability,
    COALESCE(mx.duplicate_rate, 0::numeric) AS max_duplicate_rate,
    COALESCE(mx.big_pull_rate, 0::numeric) AS max_big_pull_rate,
    COALESCE(mx.avg_pc_gained, 0::numeric) AS max_avg_pc_gained,
    COALESCE(mx.avg_pc_spent, 0::numeric) AS max_avg_pc_spent,
    COALESCE(mx.value_score_ratio, 0::numeric) AS max_value_score_ratio,
    COALESCE(mx.avg_booster_openings_per_day, 0::numeric) AS max_avg_booster_openings_per_day,
    COALESCE(mx.avg_booster_profitability, 0::numeric) AS max_avg_booster_profitability,
    COALESCE(mn.duplicate_rate, 0::numeric) AS min_duplicate_rate,
    COALESCE(mn.big_pull_rate, 0::numeric) AS min_big_pull_rate,
    COALESCE(mn.avg_pc_gained, 0::numeric) AS min_avg_pc_gained,
    COALESCE(mn.avg_pc_spent, 0::numeric) AS min_avg_pc_spent,
    COALESCE(mn.value_score_ratio, 0::numeric) AS min_value_score_ratio,
    COALESCE(mn.avg_booster_openings_per_day, 0::numeric) AS min_avg_booster_openings_per_day,
    COALESCE(mn.avg_booster_profitability, 0::numeric) AS min_avg_booster_profitability
  FROM averages av
  CROSS JOIN maxes mx
  CROSS JOIN mins mn
  LEFT JOIN player_metric pm ON true;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_radar_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_radar_stats(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.get_leaderboard_matrix_players(uuid);

CREATE OR REPLACE FUNCTION public.get_leaderboard_matrix_players(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  leaderboard_position int,
  weighted_score int,
  card_score int,
  total_card_value int,
  duplicate_rate numeric,
  big_pull_rate numeric,
  avg_pc_gained numeric,
  avg_pc_spent numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      lb.user_id,
      lb.username,
      lb.avatar_url,
      lb.weighted_score,
      lb.card_score,
      ROW_NUMBER() OVER (
        ORDER BY
          lb.weighted_score DESC,
          lb.total_cards DESC,
          lb.achievements_unlocked DESC,
          lb.username ASC
      )::int AS leaderboard_position
    FROM public.get_leaderboard() lb
  ),
  selected_users AS (
    SELECT r.user_id
    FROM ranked r
    WHERE r.leaderboard_position <= 10

    UNION

    SELECT r.user_id
    FROM ranked r
    WHERE r.user_id = p_user_id
      AND r.leaderboard_position > 10
  ),
  card_value_totals AS (
    SELECT
      su.user_id,
      COALESCE(SUM(c.pc_value), 0)::int AS total_card_value
    FROM selected_users su
    LEFT JOIN public.user_cards uc ON uc.user_id = su.user_id
    LEFT JOIN public.cards c ON c.id = uc.card_id
    GROUP BY su.user_id
  ),
  opening_base AS (
    SELECT
      su.user_id,
      bo.id AS opening_id,
      bo.type AS opening_type,
      bo.cards,
      bo.pc_gained,
      bo.duplicate_cards,
      b.price_pc
    FROM selected_users su
    LEFT JOIN public.booster_openings bo ON bo.user_id = su.user_id
    LEFT JOIN public.boosters b ON b.id = bo.booster_id
  ),
  opening_stats AS (
    SELECT
      ob.user_id,
      COUNT(ob.opening_id)::numeric AS total_openings,
      COALESCE(AVG(ob.pc_gained::numeric), 0::numeric) AS avg_pc_gained,
      CASE
        WHEN COUNT(ob.opening_id) = 0 THEN 0::numeric
        ELSE COALESCE(
          SUM(
            CASE
              WHEN ob.opening_type = 'SHOP'::public."OpeningType" THEN COALESCE(ob.price_pc, 0)
              ELSE 0
            END
          ),
          0
        )::numeric / COUNT(ob.opening_id)::numeric
      END AS avg_pc_spent,
      COALESCE(SUM(ob.duplicate_cards), 0)::numeric AS duplicate_cards_total
    FROM opening_base ob
    GROUP BY ob.user_id
  ),
  drop_stats AS (
    SELECT
      ob.user_id,
      COUNT(*)::numeric AS total_drop_cards,
      COUNT(*) FILTER (
        WHERE c.rarity IN ('LEGENDS'::public."Rarity", 'WORLD_CLASS'::public."Rarity")
      )::numeric AS big_pull_cards
    FROM opening_base ob
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE
        WHEN ob.cards IS NULL THEN '[]'::jsonb
        WHEN jsonb_typeof(ob.cards::jsonb) = 'array' THEN ob.cards::jsonb
        ELSE '[]'::jsonb
      END
    ) AS opened(card_id)
    JOIN public.cards c ON c.id = opened.card_id
    GROUP BY ob.user_id
  )
  SELECT
    r.user_id,
    r.username,
    r.avatar_url,
    r.leaderboard_position,
    r.weighted_score,
    r.card_score,
    COALESCE(cv.total_card_value, 0)::int AS total_card_value,
    CASE
      WHEN COALESCE(ds.total_drop_cards, 0) = 0 THEN 0::numeric
      ELSE (COALESCE(os.duplicate_cards_total, 0) * 100.0) / ds.total_drop_cards
    END AS duplicate_rate,
    CASE
      WHEN COALESCE(ds.total_drop_cards, 0) = 0 THEN 0::numeric
      ELSE (COALESCE(ds.big_pull_cards, 0) * 100.0) / ds.total_drop_cards
    END AS big_pull_rate,
    COALESCE(os.avg_pc_gained, 0::numeric) AS avg_pc_gained,
    COALESCE(os.avg_pc_spent, 0::numeric) AS avg_pc_spent
  FROM ranked r
  JOIN selected_users su ON su.user_id = r.user_id
  LEFT JOIN card_value_totals cv ON cv.user_id = r.user_id
  LEFT JOIN opening_stats os ON os.user_id = r.user_id
  LEFT JOIN drop_stats ds ON ds.user_id = r.user_id
  ORDER BY r.leaderboard_position ASC;
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard_matrix_players(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_matrix_players(uuid) TO authenticated;
