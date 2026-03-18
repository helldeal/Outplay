-- Remove target series from booster_openings
-- Keep user target series as an input only to resolve the booster to open.

-- 1) Drop schema artifacts from booster_openings
DROP INDEX IF EXISTS public.booster_openings_target_series_id_idx;
ALTER TABLE public.booster_openings
  DROP CONSTRAINT IF EXISTS booster_openings_target_series_fk;
ALTER TABLE public.booster_openings
  DROP COLUMN IF EXISTS target_series_id;

-- 2) Resolve reward booster by optional target series instead of daily target only
DO $$
BEGIN
  IF to_regprocedure('public._resolve_reward_booster_id(public."BoosterType")') IS NOT NULL THEN
    DROP FUNCTION public._resolve_reward_booster_id(public."BoosterType");
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public._resolve_reward_booster_id(
  p_booster_type public."BoosterType",
  p_target_series_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_series_code text;
  v_booster_id uuid;
BEGIN
  IF p_target_series_id IS NOT NULL THEN
    SELECT s.code
    INTO v_series_code
    FROM public.series s
    WHERE s.id = p_target_series_id;
  ELSE
    v_series_code := public._get_daily_target_series_code();
  END IF;

  IF v_series_code IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT b.id
  INTO v_booster_id
  FROM public.boosters b
  JOIN public.series s ON s.id = b.series_id
  WHERE s.code = v_series_code
    AND b.type = p_booster_type
    AND (
      p_booster_type = 'GODPACK'::public."BoosterType"
      OR b.is_daily_only = false
    )
  LIMIT 1;

  RETURN v_booster_id;
END;
$$;

-- 3) Keep same function signature but stop using target_series for card draw/opening payload
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
    WHERE c.series_id = v_booster.series_id
      AND c.rarity = v_pick_rarity::public."Rarity"
    ORDER BY random()
    LIMIT 1;

    IF v_card_id IS NULL THEN
      SELECT c.id, c.pc_value
      INTO v_card_id, v_card_value
      FROM public.cards c
      WHERE c.series_id = v_booster.series_id
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
    'cards', v_cards,
    'pcGained', v_total_pc_gained,
    'chargedPc', v_charged_pc,
    'type', p_opening_type::text
  );
END;
$$;

-- 4) Daily: choose booster from target series when provided
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
  v_effective_series_code text := p_series_code;
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

  IF p_target_series_id IS NOT NULL THEN
    SELECT s.code
    INTO v_effective_series_code
    FROM public.series s
    WHERE s.id = p_target_series_id;

    IF v_effective_series_code IS NULL THEN
      RAISE EXCEPTION 'Target series not found';
    END IF;
  END IF;

  IF random() < 0.01 THEN
    SELECT b.id
    INTO v_booster_id
    FROM public.boosters b
    JOIN public.series s ON s.id = b.series_id
    WHERE s.code = v_effective_series_code
      AND b.type = 'GODPACK'::public."BoosterType"
    LIMIT 1;
  ELSE
    SELECT b.id
    INTO v_booster_id
    FROM public.boosters b
    JOIN public.series s ON s.id = b.series_id
    WHERE s.code = v_effective_series_code
      AND b.type = 'NORMAL'::public."BoosterType"
      AND b.is_daily_only = false
    LIMIT 1;
  END IF;

  IF v_booster_id IS NULL THEN
    RAISE EXCEPTION 'No daily-eligible booster found for series %', v_effective_series_code;
  END IF;

  RETURN public._resolve_booster_opening(
    v_booster_id,
    p_user_id,
    'DAILY'::public."OpeningType",
    false,
    NULL
  );
END;
$$;

-- 5) Streak: target series selects booster, opening uses booster's own series
CREATE OR REPLACE FUNCTION public._claim_login_streak_reward_internal(
  p_user_id uuid,
  p_target_series_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak RECORD;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_next_day int;
  v_reward_type text;
  v_reward_pc int;
  v_reward_booster_type public."BoosterType";
  v_daily_series_code text;
  v_reward_booster_id uuid;
  v_opening jsonb := NULL;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated user';
  END IF;

  INSERT INTO public.login_streaks (user_id, current_day)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT *
  INTO v_streak
  FROM public.login_streaks ls
  WHERE ls.user_id = p_user_id
  FOR UPDATE;

  IF v_streak.last_claim_date = v_today THEN
    RAISE EXCEPTION 'Login streak reward already claimed today';
  END IF;

  v_next_day := public._compute_login_streak_next_day(
    v_streak.current_day,
    v_streak.last_claim_date,
    v_today
  );

  SELECT
    reward_type,
    reward_pc,
    reward_booster_type
  INTO
    v_reward_type,
    v_reward_pc,
    v_reward_booster_type
  FROM public._login_streak_reward_for_day(v_next_day);

  IF v_reward_type = 'BOOSTER' THEN
    IF p_target_series_id IS NOT NULL THEN
      SELECT b.id
      INTO v_reward_booster_id
      FROM public.boosters b
      WHERE b.series_id = p_target_series_id
        AND b.type = v_reward_booster_type
        AND (b.is_daily_only = false OR b.type = 'GODPACK'::public."BoosterType")
      LIMIT 1;

      IF v_reward_booster_id IS NULL THEN
        RAISE EXCEPTION 'No % booster found for target series', v_reward_booster_type;
      END IF;
    ELSE
      SELECT s.code
      INTO v_daily_series_code
      FROM public.boosters b
      JOIN public.series s ON s.id = b.series_id
      WHERE b.is_daily_only = true
      ORDER BY b.created_at ASC
      LIMIT 1;

      IF v_daily_series_code IS NULL THEN
        RAISE EXCEPTION 'No daily target series found for streak booster rewards';
      END IF;

      SELECT b.id
      INTO v_reward_booster_id
      FROM public.boosters b
      JOIN public.series s ON s.id = b.series_id
      WHERE s.code = v_daily_series_code
        AND b.type = v_reward_booster_type
        AND b.is_daily_only = false
      LIMIT 1;

      IF v_reward_booster_id IS NULL THEN
        RAISE EXCEPTION
          'No % booster found for daily target series %',
          v_reward_booster_type,
          v_daily_series_code;
      END IF;
    END IF;

    v_opening := public._resolve_booster_opening(
      v_reward_booster_id,
      p_user_id,
      'STREAK'::public."OpeningType",
      false,
      NULL
    );
  END IF;

  UPDATE public.login_streaks
  SET
    current_day = v_next_day,
    last_claim_date = v_today,
    total_claimed_days = total_claimed_days + 1,
    updated_at = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'day', v_next_day,
    'rewardType', v_reward_type,
    'pcGained', v_reward_pc,
    'boosterType', v_reward_booster_type,
    'opening', v_opening
  );
END;
$$;

-- 6) Achievements: target series selects reward booster
CREATE OR REPLACE FUNCTION public._claim_achievement_reward_internal(
  p_user_id uuid,
  p_achievement_code text,
  p_target_series_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_def RECORD;
  v_opening jsonb := NULL;
  v_opening_id uuid := NULL;
  v_booster_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated user';
  END IF;

  IF p_achievement_code IS NULL OR btrim(p_achievement_code) = '' THEN
    RAISE EXCEPTION 'Achievement code is required';
  END IF;

  SELECT
    ad.id,
    ad.code,
    ad.name,
    ad.reward_pc,
    ad.reward_booster_type,
    ad.reward_title,
    ua.reward_granted_at
  INTO v_def
  FROM public.achievement_definitions ad
  JOIN public.user_achievements ua
    ON ua.achievement_id = ad.id
   AND ua.user_id = p_user_id
  WHERE ad.code = p_achievement_code
  FOR UPDATE OF ua;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Achievement % is not unlocked', p_achievement_code;
  END IF;

  IF v_def.reward_granted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Achievement % reward already claimed', p_achievement_code;
  END IF;

  IF COALESCE(v_def.reward_pc, 0) > 0 THEN
    UPDATE public.users
    SET
      pc_balance = pc_balance + v_def.reward_pc,
      total_pc_earned = total_pc_earned + v_def.reward_pc
    WHERE id = p_user_id;
  END IF;

  IF v_def.reward_booster_type IS NOT NULL THEN
    v_booster_id := public._resolve_reward_booster_id(
      v_def.reward_booster_type,
      p_target_series_id
    );

    IF v_booster_id IS NULL THEN
      RAISE EXCEPTION 'No booster found for reward type %', v_def.reward_booster_type;
    END IF;

    v_opening := public._resolve_booster_opening(
      v_booster_id,
      p_user_id,
      'ACHIEVEMENT'::public."OpeningType",
      false,
      NULL
    );

    IF v_opening IS NOT NULL AND (v_opening ->> 'openingId') IS NOT NULL THEN
      v_opening_id := (v_opening ->> 'openingId')::uuid;
    END IF;
  END IF;

  IF v_def.reward_title IS NOT NULL THEN
    UPDATE public.users
    SET title = v_def.reward_title
    WHERE id = p_user_id;
  END IF;

  UPDATE public.user_achievements ua
  SET
    reward_granted_at = now(),
    reward_opening_id = v_opening_id
  FROM public.achievement_definitions ad
  WHERE ua.achievement_id = ad.id
    AND ad.code = p_achievement_code
    AND ua.user_id = p_user_id;

  RETURN jsonb_build_object(
    'code', v_def.code,
    'name', v_def.name,
    'rewardPc', v_def.reward_pc,
    'rewardBoosterType', v_def.reward_booster_type,
    'rewardTitle', v_def.reward_title,
    'opening', v_opening
  );
END;
$$;
