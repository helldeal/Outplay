-- Add score-based card top lists for leaderboard global stats and public profile stats.

DROP FUNCTION IF EXISTS public.get_leaderboard_global_stats();

CREATE OR REPLACE FUNCTION public.get_leaderboard_global_stats()
RETURNS TABLE (
  total_pc_spent bigint,
  total_cards_opened bigint,
  total_openings bigint,
  booster_distribution jsonb,
  top_drop_cards jsonb,
  top_best_score_cards jsonb,
  top_worst_score_cards jsonb
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH openings AS (
    SELECT
      bo.id,
      bo.type AS opening_type,
      bo.cards,
      bo.series_id,
      b.type AS booster_type,
      b.price_pc,
      b.drop_rates
    FROM public.booster_openings bo
    JOIN public.boosters b ON b.id = bo.booster_id
  ),
  cards_volume AS (
    SELECT COUNT(*)::bigint AS total_cards_opened
    FROM openings o
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE
        WHEN jsonb_typeof(o.cards::jsonb) = 'array' THEN o.cards::jsonb
        ELSE '[]'::jsonb
      END
    ) AS opened(card_id)
  ),
  booster_dist AS (
    SELECT
      o.booster_type,
      COUNT(*)::bigint AS openings_count
    FROM openings o
    GROUP BY o.booster_type
  ),
  booster_dist_json AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'booster_type', booster_type,
          'openings_count', openings_count
        )
        ORDER BY openings_count DESC, booster_type ASC
      ),
      '[]'::jsonb
    ) AS value
    FROM booster_dist
  ),
  top_drop_cards_json AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'card_id', grouped.card_id,
          'card_name', grouped.card_name,
          'card_rarity', grouped.card_rarity,
          'card_image_url', grouped.card_image_url,
          'drops_count', grouped.drops_count
        )
        ORDER BY grouped.drops_count DESC, grouped.card_id ASC
      ),
      '[]'::jsonb
    ) AS value
    FROM (
      SELECT
        c.id AS card_id,
        c.name AS card_name,
        c.rarity AS card_rarity,
        c."imageUrl" AS card_image_url,
        COUNT(*)::bigint AS drops_count
      FROM openings o
      CROSS JOIN LATERAL jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(o.cards::jsonb) = 'array' THEN o.cards::jsonb
          ELSE '[]'::jsonb
        END
      ) AS opened(card_id)
      JOIN public.cards c ON c.id = opened.card_id
      GROUP BY c.id, c.name, c.rarity, c."imageUrl"
      ORDER BY
        drops_count DESC,
        CASE c.rarity
          WHEN 'LEGENDS'::public."Rarity" THEN 5
          WHEN 'WORLD_CLASS'::public."Rarity" THEN 4
          WHEN 'CHAMPION'::public."Rarity" THEN 3
          WHEN 'CHALLENGER'::public."Rarity" THEN 2
          WHEN 'ROOKIE'::public."Rarity" THEN 1
          ELSE 0
        END DESC,
        c.id ASC
      LIMIT 5
    ) grouped
  ),
  series_totals AS (
    SELECT
      o.series_id,
      COUNT(*)::bigint AS total_openings,
      (COUNT(*) * 5)::bigint AS total_opened_cards
    FROM openings o
    GROUP BY o.series_id
  ),
  series_booster_mix AS (
    SELECT
      o.series_id,
      o.booster_type,
      COUNT(*)::bigint AS openings_count,
      COALESCE((o.drop_rates ->> 'ROOKIE')::numeric, 0) AS rate_rookie,
      COALESCE((o.drop_rates ->> 'CHALLENGER')::numeric, 0) AS rate_challenger,
      COALESCE((o.drop_rates ->> 'CHAMPION')::numeric, 0) AS rate_champion,
      COALESCE((o.drop_rates ->> 'WORLD_CLASS')::numeric, 0) AS rate_world_class,
      COALESCE((o.drop_rates ->> 'LEGENDS')::numeric, 0) AS rate_legends
    FROM openings o
    GROUP BY o.series_id, o.booster_type, o.drop_rates
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
      o.series_id,
      opened.card_id
    FROM openings o
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE
        WHEN jsonb_typeof(o.cards::jsonb) = 'array' THEN o.cards::jsonb
        ELSE '[]'::jsonb
      END
    ) AS opened(card_id)
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
      )::int AS score_value
    FROM card_coefficients cc
  ),
  top_best_score_cards_json AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'card_id', grouped.card_id,
          'card_name', grouped.card_name,
          'card_rarity', grouped.card_rarity,
          'card_image_url', grouped.card_image_url,
          'score_value', grouped.score_value
        )
        ORDER BY grouped.score_value DESC, grouped.card_id ASC
      ),
      '[]'::jsonb
    ) AS value
    FROM (
      SELECT
        c.id AS card_id,
        c.name AS card_name,
        c.rarity AS card_rarity,
        c."imageUrl" AS card_image_url,
        cwv.score_value
      FROM card_weighted_values cwv
      JOIN public.cards c ON c.id = cwv.card_id
      ORDER BY
        cwv.score_value DESC,
        CASE c.rarity
          WHEN 'LEGENDS'::public."Rarity" THEN 5
          WHEN 'WORLD_CLASS'::public."Rarity" THEN 4
          WHEN 'CHAMPION'::public."Rarity" THEN 3
          WHEN 'CHALLENGER'::public."Rarity" THEN 2
          WHEN 'ROOKIE'::public."Rarity" THEN 1
          ELSE 0
        END DESC,
        c.id ASC
      LIMIT 5
    ) grouped
  ),
  top_worst_score_cards_json AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'card_id', grouped.card_id,
          'card_name', grouped.card_name,
          'card_rarity', grouped.card_rarity,
          'card_image_url', grouped.card_image_url,
          'score_value', grouped.score_value
        )
        ORDER BY grouped.score_value ASC, grouped.card_id ASC
      ),
      '[]'::jsonb
    ) AS value
    FROM (
      SELECT
        c.id AS card_id,
        c.name AS card_name,
        c.rarity AS card_rarity,
        c."imageUrl" AS card_image_url,
        cwv.score_value
      FROM card_weighted_values cwv
      JOIN public.cards c ON c.id = cwv.card_id
      ORDER BY
        cwv.score_value ASC,
        CASE c.rarity
          WHEN 'ROOKIE'::public."Rarity" THEN 1
          WHEN 'CHALLENGER'::public."Rarity" THEN 2
          WHEN 'CHAMPION'::public."Rarity" THEN 3
          WHEN 'WORLD_CLASS'::public."Rarity" THEN 4
          WHEN 'LEGENDS'::public."Rarity" THEN 5
          ELSE 0
        END ASC,
        c.id ASC
      LIMIT 5
    ) grouped
  )
  SELECT
    COALESCE(
      SUM(
        CASE
          WHEN o.opening_type = 'SHOP'::public."OpeningType" THEN o.price_pc
          ELSE 0
        END
      ),
      0
    )::bigint AS total_pc_spent,
    COALESCE((SELECT cv.total_cards_opened FROM cards_volume cv), 0)::bigint AS total_cards_opened,
    COUNT(o.id)::bigint AS total_openings,
    (SELECT bdj.value FROM booster_dist_json bdj) AS booster_distribution,
    (SELECT tdj.value FROM top_drop_cards_json tdj) AS top_drop_cards,
    (SELECT tsj.value FROM top_best_score_cards_json tsj) AS top_best_score_cards,
    (SELECT twj.value FROM top_worst_score_cards_json twj) AS top_worst_score_cards
  FROM openings o;
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard_global_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_global_stats() TO authenticated;

DROP FUNCTION IF EXISTS public.get_public_profile_score_cards(uuid);

CREATE OR REPLACE FUNCTION public.get_public_profile_score_cards(p_user_id uuid)
RETURNS TABLE (
  top_best_score_cards jsonb,
  top_worst_score_cards jsonb
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH openings AS (
    SELECT
      bo.cards,
      bo.series_id,
      b.drop_rates,
      b.type AS booster_type
    FROM public.booster_openings bo
    JOIN public.boosters b ON b.id = bo.booster_id
  ),
  series_totals AS (
    SELECT
      o.series_id,
      COUNT(*)::bigint AS total_openings,
      (COUNT(*) * 5)::bigint AS total_opened_cards
    FROM openings o
    GROUP BY o.series_id
  ),
  series_booster_mix AS (
    SELECT
      o.series_id,
      o.booster_type,
      COUNT(*)::bigint AS openings_count,
      COALESCE((o.drop_rates ->> 'ROOKIE')::numeric, 0) AS rate_rookie,
      COALESCE((o.drop_rates ->> 'CHALLENGER')::numeric, 0) AS rate_challenger,
      COALESCE((o.drop_rates ->> 'CHAMPION')::numeric, 0) AS rate_champion,
      COALESCE((o.drop_rates ->> 'WORLD_CLASS')::numeric, 0) AS rate_world_class,
      COALESCE((o.drop_rates ->> 'LEGENDS')::numeric, 0) AS rate_legends
    FROM openings o
    GROUP BY o.series_id, o.booster_type, o.drop_rates
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
      o.series_id,
      opened.card_id
    FROM openings o
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE
        WHEN jsonb_typeof(o.cards::jsonb) = 'array' THEN o.cards::jsonb
        ELSE '[]'::jsonb
      END
    ) AS opened(card_id)
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
      )::int AS score_value
    FROM card_coefficients cc
  ),
  player_cards AS (
    SELECT DISTINCT uc.card_id
    FROM public.user_cards uc
    WHERE uc.user_id = p_user_id
  ),
  top_best_score_cards_json AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'card_id', grouped.card_id,
          'card_name', grouped.card_name,
          'card_rarity', grouped.card_rarity,
          'card_image_url', grouped.card_image_url,
          'score_value', grouped.score_value
        )
        ORDER BY grouped.score_value DESC, grouped.card_id ASC
      ),
      '[]'::jsonb
    ) AS value
    FROM (
      SELECT
        c.id AS card_id,
        c.name AS card_name,
        c.rarity AS card_rarity,
        c."imageUrl" AS card_image_url,
        cwv.score_value
      FROM player_cards pc
      JOIN card_weighted_values cwv ON cwv.card_id = pc.card_id
      JOIN public.cards c ON c.id = pc.card_id
      ORDER BY
        cwv.score_value DESC,
        CASE c.rarity
          WHEN 'LEGENDS'::public."Rarity" THEN 5
          WHEN 'WORLD_CLASS'::public."Rarity" THEN 4
          WHEN 'CHAMPION'::public."Rarity" THEN 3
          WHEN 'CHALLENGER'::public."Rarity" THEN 2
          WHEN 'ROOKIE'::public."Rarity" THEN 1
          ELSE 0
        END DESC,
        c.id ASC
      LIMIT 5
    ) grouped
  ),
  top_worst_score_cards_json AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'card_id', grouped.card_id,
          'card_name', grouped.card_name,
          'card_rarity', grouped.card_rarity,
          'card_image_url', grouped.card_image_url,
          'score_value', grouped.score_value
        )
        ORDER BY grouped.score_value ASC, grouped.card_id ASC
      ),
      '[]'::jsonb
    ) AS value
    FROM (
      SELECT
        c.id AS card_id,
        c.name AS card_name,
        c.rarity AS card_rarity,
        c."imageUrl" AS card_image_url,
        cwv.score_value
      FROM player_cards pc
      JOIN card_weighted_values cwv ON cwv.card_id = pc.card_id
      JOIN public.cards c ON c.id = pc.card_id
      ORDER BY
        cwv.score_value ASC,
        CASE c.rarity
          WHEN 'ROOKIE'::public."Rarity" THEN 1
          WHEN 'CHALLENGER'::public."Rarity" THEN 2
          WHEN 'CHAMPION'::public."Rarity" THEN 3
          WHEN 'WORLD_CLASS'::public."Rarity" THEN 4
          WHEN 'LEGENDS'::public."Rarity" THEN 5
          ELSE 0
        END ASC,
        c.id ASC
      LIMIT 5
    ) grouped
  )
  SELECT
    (SELECT value FROM top_best_score_cards_json) AS top_best_score_cards,
    (SELECT value FROM top_worst_score_cards_json) AS top_worst_score_cards;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_score_cards(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_score_cards(uuid) TO authenticated;
