-- Dedicated radar stats RPC: player values + global max + global average (all users).

DROP FUNCTION IF EXISTS public.get_public_profile_radar_stats(uuid);

CREATE OR REPLACE FUNCTION public.get_public_profile_radar_stats(p_user_id uuid)
RETURNS TABLE (
  player_duplicate_rate numeric,
  player_big_pull_rate numeric,
  player_avg_pc_gained numeric,
  player_avg_pc_spent numeric,
  player_value_score_ratio numeric,
  avg_duplicate_rate numeric,
  avg_big_pull_rate numeric,
  avg_avg_pc_gained numeric,
  avg_avg_pc_spent numeric,
  avg_value_score_ratio numeric,
  max_duplicate_rate numeric,
  max_big_pull_rate numeric,
  max_avg_pc_gained numeric,
  max_avg_pc_spent numeric,
  max_value_score_ratio numeric,
  min_duplicate_rate numeric,
  min_big_pull_rate numeric,
  min_avg_pc_gained numeric,
  min_avg_pc_spent numeric,
  min_value_score_ratio numeric
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
      b.price_pc
    FROM all_users au
    LEFT JOIN public.booster_openings bo ON bo.user_id = au.user_id
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
        WHEN COALESCE(ls.card_score, 0) > 0 THEN
          COALESCE(cvt.total_card_value, 0::numeric) / ls.card_score::numeric
        ELSE 0::numeric
      END AS value_score_ratio
    FROM all_users au
    LEFT JOIN opening_stats os ON os.user_id = au.user_id
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
      COALESCE(AVG(am.value_score_ratio), 0::numeric) AS value_score_ratio
    FROM all_metrics am
  ),
  maxes AS (
    SELECT
      COALESCE(MAX(am.duplicate_rate), 0::numeric) AS duplicate_rate,
      COALESCE(MAX(am.big_pull_rate), 0::numeric) AS big_pull_rate,
      COALESCE(MAX(am.avg_pc_gained), 0::numeric) AS avg_pc_gained,
      COALESCE(MAX(am.avg_pc_spent), 0::numeric) AS avg_pc_spent,
      COALESCE(MAX(am.value_score_ratio), 0::numeric) AS value_score_ratio
    FROM all_metrics am
  ),
  mins AS (
    SELECT
      COALESCE(MIN(am.duplicate_rate), 0::numeric) AS duplicate_rate,
      COALESCE(MIN(am.big_pull_rate), 0::numeric) AS big_pull_rate,
      COALESCE(MIN(am.avg_pc_gained), 0::numeric) AS avg_pc_gained,
      COALESCE(MIN(am.avg_pc_spent), 0::numeric) AS avg_pc_spent,
      COALESCE(MIN(am.value_score_ratio), 0::numeric) AS value_score_ratio
    FROM all_metrics am
  )
  SELECT
    COALESCE(pm.duplicate_rate, 0::numeric) AS player_duplicate_rate,
    COALESCE(pm.big_pull_rate, 0::numeric) AS player_big_pull_rate,
    COALESCE(pm.avg_pc_gained, 0::numeric) AS player_avg_pc_gained,
    COALESCE(pm.avg_pc_spent, 0::numeric) AS player_avg_pc_spent,
    COALESCE(pm.value_score_ratio, 0::numeric) AS player_value_score_ratio,
    COALESCE(av.duplicate_rate, 0::numeric) AS avg_duplicate_rate,
    COALESCE(av.big_pull_rate, 0::numeric) AS avg_big_pull_rate,
    COALESCE(av.avg_pc_gained, 0::numeric) AS avg_avg_pc_gained,
    COALESCE(av.avg_pc_spent, 0::numeric) AS avg_avg_pc_spent,
    COALESCE(av.value_score_ratio, 0::numeric) AS avg_value_score_ratio,
    COALESCE(mx.duplicate_rate, 0::numeric) AS max_duplicate_rate,
    COALESCE(mx.big_pull_rate, 0::numeric) AS max_big_pull_rate,
    COALESCE(mx.avg_pc_gained, 0::numeric) AS max_avg_pc_gained,
    COALESCE(mx.avg_pc_spent, 0::numeric) AS max_avg_pc_spent,
    COALESCE(mx.value_score_ratio, 0::numeric) AS max_value_score_ratio,
    COALESCE(mn.duplicate_rate, 0::numeric) AS min_duplicate_rate,
    COALESCE(mn.big_pull_rate, 0::numeric) AS min_big_pull_rate,
    COALESCE(mn.avg_pc_gained, 0::numeric) AS min_avg_pc_gained,
    COALESCE(mn.avg_pc_spent, 0::numeric) AS min_avg_pc_spent,
    COALESCE(mn.value_score_ratio, 0::numeric) AS min_value_score_ratio
  FROM averages av
  CROSS JOIN maxes mx
  CROSS JOIN mins mn
  LEFT JOIN player_metric pm ON true;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_radar_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_radar_stats(uuid) TO authenticated;
