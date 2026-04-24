-- Public title and copies display updates
-- - Add title-aware identity fields to opening recap and card stats RPCs
-- - Expose copies_count for owned cards used by Legendex/Collection cards
-- - Keep grants aligned with the new function definitions

DROP FUNCTION IF EXISTS public.get_public_opening_recap(uuid);

CREATE OR REPLACE FUNCTION public.get_public_opening_recap(p_opening_id uuid)
RETURNS TABLE (
  opening_id uuid,
  user_id uuid,
  username text,
  title text,
  avatar_url text,
  opened_at timestamptz,
  opening_type public."OpeningType",
  booster_name text,
  booster_type public."BoosterType",
  booster_price_pc int,
  series_name text,
  pc_gained int,
  duplicate_cards int,
  opened_cards jsonb
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    bo.id AS opening_id,
    bo.user_id,
    COALESCE(NULLIF(trim(u.username), ''), concat('Player-', left(u.id::text, 6))) AS username,
    u.title,
    u.avatar_url,
    bo.created_at AS opened_at,
    bo.type AS opening_type,
    CASE
      WHEN bo.type = 'COMPLETER'::public."OpeningType" THEN 'Compléteur de cartes'
      ELSE b.name
    END AS booster_name,
    b.type AS booster_type,
    CASE
      WHEN bo.type = 'COMPLETER'::public."OpeningType" THEN NULL
      ELSE b.price_pc
    END AS booster_price_pc,
    s.name AS series_name,
    bo.pc_gained,
    bo.duplicate_cards,
    CASE
      WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
      ELSE '[]'::jsonb
    END AS opened_cards
  FROM public.booster_openings bo
  JOIN public.users u ON u.id = bo.user_id
  LEFT JOIN public.boosters b ON b.id = bo.booster_id
  LEFT JOIN public.series s ON s.id = bo.series_id
  WHERE bo.id = p_opening_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_opening_recap(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_opening_recap(uuid) TO authenticated;

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
  first_holder_title text,
  first_holder_avatar_url text,
  first_holder_obtained_at timestamptz,
  top_holder_user_id uuid,
  top_holder_username text,
  top_holder_title text,
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
      u.title,
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
      u.title,
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
    fh.title AS first_holder_title,
    fh.avatar_url AS first_holder_avatar_url,
    fh.obtained_at AS first_holder_obtained_at,
    th.user_id AS top_holder_user_id,
    th.username AS top_holder_username,
    th.title AS top_holder_title,
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
