-- Update booster opening functions to support target series selection
-- Allows users to specify which series they're targeting when opening boosters

DO $$
BEGIN
  IF to_regprocedure('public._resolve_booster_opening(uuid, uuid, public."OpeningType", boolean)') IS NOT NULL THEN
    DROP FUNCTION public._resolve_booster_opening(uuid, uuid, public."OpeningType", boolean);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public._resolve_booster_opening(
  p_booster_id uuid,
  p_user_id uuid,
  p_opening_type public."OpeningType",
  p_charge_price boolean,
  p_target_series_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booster RECORD;
  v_opening_id uuid;
  v_cards text[] := ARRAY[]::text[];
  v_draw_count int := 5;
  v_total_pc_gained int := 0;
  v_roll numeric;
  v_pick_rarity text;
  v_card_id text;
  v_card_value int;
  v_already_owned boolean;
  v_charged_pc int := 0;
  v_duplicate_cards int := 0;
  i int;
  p_legends numeric;
  p_world_class numeric;
  p_champion numeric;
  p_challenger numeric;
  v_target_series_id uuid;
BEGIN
  SELECT id, series_id, type, price_pc, is_daily_only, drop_rates
  INTO v_booster
  FROM public.boosters
  WHERE id = p_booster_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booster not found';
  END IF;

  IF p_opening_type = 'SHOP'::public."OpeningType" AND v_booster.is_daily_only THEN
    RAISE EXCEPTION 'Daily-only booster cannot be opened from shop';
  END IF;

  IF p_charge_price AND v_booster.price_pc > 0 THEN
    UPDATE public.users
    SET pc_balance = pc_balance - v_booster.price_pc
    WHERE id = p_user_id
      AND pc_balance >= v_booster.price_pc;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient PC balance';
    END IF;

    v_charged_pc := v_booster.price_pc;
  END IF;

  -- Use target series if provided, otherwise use booster's series
  v_target_series_id := COALESCE(p_target_series_id, v_booster.series_id);

  p_legends := COALESCE((v_booster.drop_rates ->> 'LEGENDS')::numeric, 0);
  p_world_class := COALESCE((v_booster.drop_rates ->> 'WORLD_CLASS')::numeric, 0);
  p_champion := COALESCE((v_booster.drop_rates ->> 'CHAMPION')::numeric, 0);
  p_challenger := COALESCE((v_booster.drop_rates ->> 'CHALLENGER')::numeric, 0);

  FOR i IN 1..v_draw_count LOOP
    v_roll := random() * 100;

    IF v_roll < p_legends THEN
      v_pick_rarity := 'LEGENDS';
    ELSIF v_roll < p_legends + p_world_class THEN
      v_pick_rarity := 'WORLD_CLASS';
    ELSIF v_roll < p_legends + p_world_class + p_champion THEN
      v_pick_rarity := 'CHAMPION';
    ELSIF v_roll < p_legends + p_world_class + p_champion + p_challenger THEN
      v_pick_rarity := 'CHALLENGER';
    ELSE
      v_pick_rarity := 'ROOKIE';
    END IF;

    SELECT c.id, c.pc_value
    INTO v_card_id, v_card_value
    FROM public.cards c
    WHERE c.series_id = v_target_series_id
      AND c.rarity = v_pick_rarity::public."Rarity"
    ORDER BY random()
    LIMIT 1;

    IF v_card_id IS NULL THEN
      SELECT c.id, c.pc_value
      INTO v_card_id, v_card_value
      FROM public.cards c
      WHERE c.series_id = v_target_series_id
      ORDER BY random()
      LIMIT 1;
    END IF;

    v_cards := array_append(v_cards, v_card_id);

    SELECT EXISTS (
      SELECT 1
      FROM public.user_cards uc
      WHERE uc.user_id = p_user_id
        AND uc.card_id = v_card_id
    )
    INTO v_already_owned;

    IF v_already_owned THEN
      v_total_pc_gained := v_total_pc_gained + COALESCE(v_card_value, 0);
      v_duplicate_cards := v_duplicate_cards + 1;
    ELSE
      INSERT INTO public.user_cards (user_id, card_id, obtained_at)
      VALUES (p_user_id, v_card_id, now());
    END IF;
  END LOOP;

  IF v_total_pc_gained > 0 THEN
    UPDATE public.users
    SET
      pc_balance = pc_balance + v_total_pc_gained,
      total_pc_earned = total_pc_earned + v_total_pc_gained
    WHERE id = p_user_id;
  END IF;

  INSERT INTO public.booster_openings (
    user_id,
    booster_id,
    series_id,
    target_series_id,
    cards,
    pc_gained,
    type,
    duplicate_cards,
    created_at
  )
  VALUES (
    p_user_id,
    v_booster.id,
    v_booster.series_id,
    v_target_series_id,
    to_jsonb(v_cards),
    v_total_pc_gained,
    p_opening_type,
    v_duplicate_cards,
    now()
  )
  RETURNING id INTO v_opening_id;

  RETURN jsonb_build_object(
    'openingId', v_opening_id,
    'boosterId', v_booster.id,
    'seriesId', v_booster.series_id,
    'targetSeriesId', v_target_series_id,
    'cards', v_cards,
    'pcGained', v_total_pc_gained,
    'chargedPc', v_charged_pc,
    'type', p_opening_type::text
  );
END;
$$;

-- Update open_booster to support target series
DO $$
BEGIN
  IF to_regprocedure('public.open_booster(uuid, uuid)') IS NOT NULL THEN
    DROP FUNCTION public.open_booster(uuid, uuid);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.open_booster(
  p_booster_id uuid,
  p_user_id uuid,
  p_target_series_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated user';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'You can only open boosters for yourself';
  END IF;

  RETURN public._resolve_booster_opening(
    p_booster_id,
    p_user_id,
    'SHOP'::public."OpeningType",
    true,
    p_target_series_id
  );
END;
$$;

-- Update open_daily_booster to support target series  
DO $$
BEGIN
  IF to_regprocedure('public.open_daily_booster(text, uuid)') IS NOT NULL THEN
    DROP FUNCTION public.open_daily_booster(text, uuid);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.open_daily_booster(
  p_series_code text,
  p_user_id uuid,
  p_target_series_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booster_id uuid;
  v_today_daily_exists boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated user';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'You can only open boosters for yourself';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.booster_openings bo
    WHERE bo.user_id = p_user_id
      AND bo.type = 'DAILY'::public."OpeningType"
      AND (bo.created_at AT TIME ZONE 'UTC')::date = (now() AT TIME ZONE 'UTC')::date
  )
  INTO v_today_daily_exists;

  IF v_today_daily_exists THEN
    RAISE EXCEPTION 'Daily booster already opened today';
  END IF;

  IF random() < 0.01 THEN
    SELECT b.id
    INTO v_booster_id
    FROM public.boosters b
    JOIN public.series s ON s.id = b.series_id
    WHERE s.code = p_series_code
      AND b.type = 'GODPACK'::public."BoosterType"
    LIMIT 1;
  ELSE
    SELECT b.id
    INTO v_booster_id
    FROM public.boosters b
    JOIN public.series s ON s.id = b.series_id
    WHERE s.code = p_series_code
      AND b.type = 'NORMAL'::public."BoosterType"
    LIMIT 1;
  END IF;

  IF v_booster_id IS NULL THEN
    RAISE EXCEPTION 'No daily-eligible booster found for series %', p_series_code;
  END IF;

  RETURN public._resolve_booster_opening(
    v_booster_id,
    p_user_id,
    'DAILY'::public."OpeningType",
    false,
    p_target_series_id
  );
END;
$$;
