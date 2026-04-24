-- Use COMPLETER opening type in completer inserts and expose it in activity/recap RPCs.

CREATE OR REPLACE FUNCTION public.open_card_completer(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer jsonb;
  v_price_pc int;
  v_missing_count int;
  v_prob_rookie numeric;
  v_prob_challenger numeric;
  v_prob_champion numeric;
  v_prob_world_class numeric;
  v_prob_legends numeric;
  v_missing_rookie int;
  v_missing_challenger int;
  v_missing_champion int;
  v_missing_world_class int;
  v_missing_legends int;
  v_weight_rookie numeric;
  v_weight_challenger numeric;
  v_weight_champion numeric;
  v_weight_world_class numeric;
  v_weight_legends numeric;
  v_weight_total numeric;
  v_roll numeric;
  v_pick_rarity public."Rarity";
  v_card RECORD;
  v_opening_id uuid;
  v_series_premium_booster_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated user';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'You can only open card completer for yourself';
  END IF;

  v_offer := public.get_card_completer_offer(p_user_id);

  v_missing_count := COALESCE((v_offer ->> 'missingCount')::int, 0);
  IF v_missing_count <= 0 THEN
    RAISE EXCEPTION 'Collection already complete';
  END IF;

  v_price_pc := COALESCE((v_offer ->> 'pricePc')::int, 0);

  UPDATE public.users
  SET pc_balance = pc_balance - v_price_pc
  WHERE id = p_user_id
    AND pc_balance >= v_price_pc;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient PC balance';
  END IF;

  v_prob_legends := COALESCE((v_offer -> 'premiumDropRates' ->> 'LEGENDS')::numeric, 0) / 100.0;
  v_prob_world_class := COALESCE((v_offer -> 'premiumDropRates' ->> 'WORLD_CLASS')::numeric, 0) / 100.0;
  v_prob_champion := COALESCE((v_offer -> 'premiumDropRates' ->> 'CHAMPION')::numeric, 0) / 100.0;
  v_prob_challenger := COALESCE((v_offer -> 'premiumDropRates' ->> 'CHALLENGER')::numeric, 0) / 100.0;
  v_prob_rookie := COALESCE((v_offer -> 'premiumDropRates' ->> 'ROOKIE')::numeric, 0) / 100.0;

  v_missing_legends := COALESCE((v_offer -> 'missingByRarity' ->> 'LEGENDS')::int, 0);
  v_missing_world_class := COALESCE((v_offer -> 'missingByRarity' ->> 'WORLD_CLASS')::int, 0);
  v_missing_champion := COALESCE((v_offer -> 'missingByRarity' ->> 'CHAMPION')::int, 0);
  v_missing_challenger := COALESCE((v_offer -> 'missingByRarity' ->> 'CHALLENGER')::int, 0);
  v_missing_rookie := COALESCE((v_offer -> 'missingByRarity' ->> 'ROOKIE')::int, 0);

  v_weight_legends := v_prob_legends * v_missing_legends;
  v_weight_world_class := v_prob_world_class * v_missing_world_class;
  v_weight_champion := v_prob_champion * v_missing_champion;
  v_weight_challenger := v_prob_challenger * v_missing_challenger;
  v_weight_rookie := v_prob_rookie * v_missing_rookie;

  v_weight_total :=
    v_weight_legends + v_weight_world_class + v_weight_champion + v_weight_challenger + v_weight_rookie;

  IF v_weight_total <= 0 THEN
    RAISE EXCEPTION 'No eligible missing card for completer roll';
  END IF;

  v_roll := random() * v_weight_total;

  IF v_roll < v_weight_legends THEN
    v_pick_rarity := 'LEGENDS'::public."Rarity";
  ELSIF v_roll < v_weight_legends + v_weight_world_class THEN
    v_pick_rarity := 'WORLD_CLASS'::public."Rarity";
  ELSIF v_roll < v_weight_legends + v_weight_world_class + v_weight_champion THEN
    v_pick_rarity := 'CHAMPION'::public."Rarity";
  ELSIF v_roll < v_weight_legends + v_weight_world_class + v_weight_champion + v_weight_challenger THEN
    v_pick_rarity := 'CHALLENGER'::public."Rarity";
  ELSE
    v_pick_rarity := 'ROOKIE'::public."Rarity";
  END IF;

  SELECT c.id, c.series_id
  INTO v_card
  FROM public.cards c
  LEFT JOIN public.user_cards uc
    ON uc.card_id = c.id
   AND uc.user_id = p_user_id
  WHERE uc.card_id IS NULL
    AND c.rarity = v_pick_rarity
  ORDER BY random()
  LIMIT 1;

  IF v_card.id IS NULL THEN
    SELECT c.id, c.series_id
    INTO v_card
    FROM public.cards c
    LEFT JOIN public.user_cards uc
      ON uc.card_id = c.id
     AND uc.user_id = p_user_id
    WHERE uc.card_id IS NULL
    ORDER BY random()
    LIMIT 1;
  END IF;

  IF v_card.id IS NULL THEN
    RAISE EXCEPTION 'No missing card available';
  END IF;

  INSERT INTO public.user_cards (user_id, card_id, obtained_at)
  VALUES (p_user_id, v_card.id, now())
  ON CONFLICT (user_id, card_id) DO NOTHING;

  SELECT b.id
  INTO v_series_premium_booster_id
  FROM public.boosters b
  WHERE b.series_id = v_card.series_id
    AND b.type = 'PREMIUM'::public."BoosterType"
    AND b.is_daily_only = false
  ORDER BY b.created_at ASC
  LIMIT 1;

  IF v_series_premium_booster_id IS NULL THEN
    SELECT b.id
    INTO v_series_premium_booster_id
    FROM public.boosters b
    WHERE b.type = 'PREMIUM'::public."BoosterType"
      AND b.is_daily_only = false
    ORDER BY b.created_at ASC
    LIMIT 1;
  END IF;

  INSERT INTO public.booster_openings (
    user_id,
    booster_id,
    series_id,
    cards,
    pc_gained,
    type,
    duplicate_cards,
    created_at
  )
  VALUES (
    p_user_id,
    v_series_premium_booster_id,
    v_card.series_id,
    to_jsonb(ARRAY[v_card.id]::text[]),
    0,
    'COMPLETER'::public."OpeningType",
    0,
    now()
  )
  RETURNING id INTO v_opening_id;

  RETURN jsonb_build_object(
    'openingId', v_opening_id,
    'boosterId', v_series_premium_booster_id,
    'seriesId', v_card.series_id,
    'cards', ARRAY[v_card.id]::text[],
    'pcGained', 0,
    'chargedPc', v_price_pc,
    'type', 'COMPLETER'
  );
END;
$$;

DROP FUNCTION IF EXISTS public.get_recent_drops(int, int);

CREATE OR REPLACE FUNCTION public.get_recent_drops(
  p_limit int DEFAULT 5,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  opening_id uuid,
  user_id uuid,
  username text,
  avatar_url text,
  opening_type public."OpeningType",
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
    bo.type AS opening_type,
    CASE
      WHEN bo.type = 'COMPLETER'::public."OpeningType" THEN 'Compléteur de cartes'
      ELSE COALESCE(b.name, 'Booster')
    END AS booster_name,
    bo.created_at AS opened_at,
    best_card.id AS best_card_id,
    best_card.name AS best_card_name,
    best_card.rarity AS best_card_rarity,
    best_card."imageUrl" AS best_card_image_url,
    best_card.pc_value::int AS best_card_pc_value
  FROM public.booster_openings bo
  JOIN public.users u ON u.id = bo.user_id
  LEFT JOIN public.boosters b ON b.id = bo.booster_id
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

DROP FUNCTION IF EXISTS public.get_public_profile_recent_openings(uuid, int);

CREATE OR REPLACE FUNCTION public.get_public_profile_recent_openings(
  p_user_id uuid,
  p_limit int DEFAULT 8
)
RETURNS TABLE (
  opening_id uuid,
  opened_at timestamptz,
  opening_type public."OpeningType",
  booster_name text,
  booster_type public."BoosterType",
  series_name text,
  pc_gained int,
  duplicate_cards int,
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
    bo.created_at AS opened_at,
    bo.type AS opening_type,
    CASE
      WHEN bo.type = 'COMPLETER'::public."OpeningType" THEN 'Compléteur de cartes'
      ELSE b.name
    END AS booster_name,
    b.type AS booster_type,
    s.name AS series_name,
    bo.pc_gained,
    bo.duplicate_cards,
    best_card.id AS best_card_id,
    best_card.name AS best_card_name,
    best_card.rarity AS best_card_rarity,
    best_card."imageUrl" AS best_card_image_url,
    best_card.pc_value AS best_card_pc_value
  FROM public.booster_openings bo
  LEFT JOIN public.boosters b ON b.id = bo.booster_id
  LEFT JOIN public.series s ON s.id = bo.series_id
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
    ) AS opened_card(card_id)
    JOIN public.cards c ON c.id = opened_card.card_id
    ORDER BY c.pc_value DESC, c.id ASC
    LIMIT 1
  ) best_card ON true
  WHERE bo.user_id = p_user_id
  ORDER BY bo.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 8), 30));
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_recent_openings(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_recent_openings(uuid, int) TO authenticated;

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
