-- Add booster price to opening recap RPC for profitability display.

DROP FUNCTION IF EXISTS public.get_public_opening_recap(uuid);

CREATE OR REPLACE FUNCTION public.get_public_opening_recap(p_opening_id uuid)
RETURNS TABLE (
  opening_id uuid,
  user_id uuid,
  username text,
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
    u.avatar_url,
    bo.created_at AS opened_at,
    bo.type AS opening_type,
    b.name AS booster_name,
    b.type AS booster_type,
    b.price_pc AS booster_price_pc,
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
