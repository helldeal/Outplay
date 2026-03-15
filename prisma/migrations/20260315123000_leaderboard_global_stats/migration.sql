-- Leaderboard: global stats block (PC spent, card volume, booster distribution, top dropped cards).

DROP FUNCTION IF EXISTS public.get_leaderboard_global_stats();

CREATE OR REPLACE FUNCTION public.get_leaderboard_global_stats()
RETURNS TABLE (
  total_pc_spent bigint,
  total_cards_opened bigint,
  total_openings bigint,
  booster_distribution jsonb,
  top_drop_cards jsonb
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
      b.type AS booster_type,
      b.price_pc
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
  top_cards AS (
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
  ),
  top_cards_json AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'card_id', card_id,
          'card_name', card_name,
          'card_rarity', card_rarity,
          'card_image_url', card_image_url,
          'drops_count', drops_count
        )
        ORDER BY drops_count DESC, card_id ASC
      ),
      '[]'::jsonb
    ) AS value
    FROM top_cards
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
    (SELECT tcj.value FROM top_cards_json tcj) AS top_drop_cards
  FROM openings o;
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard_global_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_global_stats() TO authenticated;
