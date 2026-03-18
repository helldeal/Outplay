-- Fix streak PC rewards not being credited after function refactor

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

  IF v_reward_type = 'PC' THEN
    UPDATE public.users
    SET
      pc_balance = pc_balance + COALESCE(v_reward_pc, 0),
      total_pc_earned = total_pc_earned + COALESCE(v_reward_pc, 0)
    WHERE id = p_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'User profile not found for %', p_user_id;
    END IF;
  ELSIF v_reward_type = 'BOOSTER' THEN
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
    'pcGained', COALESCE(v_reward_pc, 0),
    'boosterType', v_reward_booster_type,
    'opening', v_opening
  );
END;
$$;
