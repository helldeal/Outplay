-- Recreate the card completer opener without any split/purchase limit.
-- This is intentionally in a new migration so databases that already applied
-- the previous limit migration are updated too.

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
    RAISE EXCEPTION 'Collection déjà complète';
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

REVOKE ALL ON FUNCTION public.open_card_completer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_card_completer(uuid) TO authenticated;
