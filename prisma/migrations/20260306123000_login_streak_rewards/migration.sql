-- Login streak rewards (7-day cycle) with daily-reset logic.
-- This feature is additive and does not replace existing daily boosters.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE n.nspname = 'public'
      AND t.typname = 'OpeningType'
      AND e.enumlabel = 'STREAK'
  ) THEN
    ALTER TYPE public."OpeningType" ADD VALUE 'STREAK';
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.login_streaks (
  user_id uuid PRIMARY KEY,
  current_day int NOT NULL DEFAULT 0,
  last_claim_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT login_streaks_current_day_check CHECK (current_day BETWEEN 0 AND 7),
  CONSTRAINT login_streaks_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION public.login_streaks_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_login_streaks_set_updated_at ON public.login_streaks;
CREATE TRIGGER trg_login_streaks_set_updated_at
BEFORE UPDATE ON public.login_streaks
FOR EACH ROW
EXECUTE FUNCTION public.login_streaks_set_updated_at();

ALTER TABLE public.login_streaks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS login_streaks_select_own ON public.login_streaks;
  DROP POLICY IF EXISTS login_streaks_insert_own ON public.login_streaks;
  DROP POLICY IF EXISTS login_streaks_update_own ON public.login_streaks;

  IF to_regprocedure('auth.uid()') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY login_streaks_select_own
      ON public.login_streaks
      FOR SELECT
      USING (auth.uid() = user_id);

      CREATE POLICY login_streaks_insert_own
      ON public.login_streaks
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);

      CREATE POLICY login_streaks_update_own
      ON public.login_streaks
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    $sql$;
  ELSE
    EXECUTE $sql$
      CREATE POLICY login_streaks_select_own
      ON public.login_streaks
      FOR SELECT
      USING (true);

      CREATE POLICY login_streaks_insert_own
      ON public.login_streaks
      FOR INSERT
      WITH CHECK (true);

      CREATE POLICY login_streaks_update_own
      ON public.login_streaks
      FOR UPDATE
      USING (true)
      WITH CHECK (true);
    $sql$;
  END IF;
END
$$;

GRANT SELECT, INSERT, UPDATE ON TABLE public.login_streaks TO authenticated;

CREATE OR REPLACE FUNCTION public._compute_login_streak_next_day(
  p_current_day int,
  p_last_claim_date date,
  p_today date
)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_last_claim_date IS NULL THEN 1
    WHEN p_last_claim_date = p_today THEN GREATEST(1, LEAST(COALESCE(p_current_day, 1), 7))
    WHEN p_today - p_last_claim_date = 1 THEN
      CASE
        WHEN COALESCE(p_current_day, 0) >= 7 THEN 1
        ELSE COALESCE(p_current_day, 0) + 1
      END
    ELSE 1
  END;
$$;

CREATE OR REPLACE FUNCTION public._login_streak_reward_for_day(
  p_day int,
  OUT reward_type text,
  OUT reward_pc int,
  OUT reward_booster_type public."BoosterType"
)
RETURNS record
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE p_day
    WHEN 1 THEN
      reward_type := 'PC';
      reward_pc := 500;
      reward_booster_type := NULL;
    WHEN 2 THEN
      reward_type := 'PC';
      reward_pc := 750;
      reward_booster_type := NULL;
    WHEN 3 THEN
      reward_type := 'BOOSTER';
      reward_pc := 0;
      reward_booster_type := 'NORMAL'::public."BoosterType";
    WHEN 4 THEN
      reward_type := 'PC';
      reward_pc := 1000;
      reward_booster_type := NULL;
    WHEN 5 THEN
      reward_type := 'BOOSTER';
      reward_pc := 0;
      reward_booster_type := 'LUCK'::public."BoosterType";
    WHEN 6 THEN
      reward_type := 'PC';
      reward_pc := 1500;
      reward_booster_type := NULL;
    WHEN 7 THEN
      reward_type := 'BOOSTER';
      reward_pc := 0;
      reward_booster_type := 'PREMIUM'::public."BoosterType";
    ELSE
      RAISE EXCEPTION 'Invalid streak day %', p_day;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public._get_login_streak_status_internal(
  p_user_id uuid
)
RETURNS TABLE (
  current_day int,
  last_claim_date date,
  can_claim_today boolean,
  next_day int,
  next_reward_type text,
  next_reward_pc int,
  next_reward_booster_type public."BoosterType"
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_current_day int := 0;
  v_last_claim_date date := NULL;
  v_next_day int;
  v_reward_type text;
  v_reward_pc int;
  v_reward_booster_type public."BoosterType";
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated user';
  END IF;

  SELECT ls.current_day, ls.last_claim_date
  INTO v_current_day, v_last_claim_date
  FROM public.login_streaks ls
  WHERE ls.user_id = p_user_id;

  IF v_last_claim_date = v_today THEN
    can_claim_today := false;
    next_day := CASE
      WHEN v_current_day >= 7 THEN 1
      ELSE GREATEST(1, v_current_day + 1)
    END;
  ELSE
    can_claim_today := true;
    next_day := public._compute_login_streak_next_day(
      v_current_day,
      v_last_claim_date,
      v_today
    );
  END IF;

  SELECT reward_type, reward_pc, reward_booster_type
  INTO v_reward_type, v_reward_pc, v_reward_booster_type
  FROM public._login_streak_reward_for_day(next_day);

  current_day := COALESCE(v_current_day, 0);
  last_claim_date := v_last_claim_date;
  next_reward_type := v_reward_type;
  next_reward_pc := v_reward_pc;
  next_reward_booster_type := v_reward_booster_type;

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public._claim_login_streak_reward_internal(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_streak public.login_streaks%ROWTYPE;
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

  SELECT reward_type, reward_pc, reward_booster_type
  INTO v_reward_type, v_reward_pc, v_reward_booster_type
  FROM public._login_streak_reward_for_day(v_next_day);

  IF v_reward_type = 'PC' THEN
    UPDATE public.users
    SET pc_balance = pc_balance + v_reward_pc
    WHERE id = p_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'User profile not found for %', p_user_id;
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

    v_opening := public._resolve_booster_opening(
      v_reward_booster_id,
      p_user_id,
      'STREAK'::public."OpeningType",
      false
    );
  END IF;

  UPDATE public.login_streaks
  SET
    current_day = v_next_day,
    last_claim_date = v_today,
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

DO $$
BEGIN
  IF to_regprocedure('auth.uid()') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.get_login_streak_status(
        p_user_id uuid DEFAULT auth.uid()
      )
      RETURNS TABLE (
        current_day int,
        last_claim_date date,
        can_claim_today boolean,
        next_day int,
        next_reward_type text,
        next_reward_pc int,
        next_reward_booster_type public."BoosterType"
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $fn$
      BEGIN
        IF p_user_id IS NULL THEN
          RAISE EXCEPTION 'Unauthenticated user';
        END IF;

        IF auth.uid() IS DISTINCT FROM p_user_id THEN
          RAISE EXCEPTION 'You can only access your own login streak';
        END IF;

        RETURN QUERY
        SELECT * FROM public._get_login_streak_status_internal(p_user_id);
      END;
      $fn$;
    $sql$;

    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.claim_login_streak_reward(
        p_user_id uuid DEFAULT auth.uid()
      )
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $fn$
      BEGIN
        IF p_user_id IS NULL THEN
          RAISE EXCEPTION 'Unauthenticated user';
        END IF;

        IF auth.uid() IS DISTINCT FROM p_user_id THEN
          RAISE EXCEPTION 'You can only claim your own login streak';
        END IF;

        RETURN public._claim_login_streak_reward_internal(p_user_id);
      END;
      $fn$;
    $sql$;
  ELSE
    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.get_login_streak_status(
        p_user_id uuid
      )
      RETURNS TABLE (
        current_day int,
        last_claim_date date,
        can_claim_today boolean,
        next_day int,
        next_reward_type text,
        next_reward_pc int,
        next_reward_booster_type public."BoosterType"
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $fn$
      BEGIN
        IF p_user_id IS NULL THEN
          RAISE EXCEPTION 'Unauthenticated user';
        END IF;

        RETURN QUERY
        SELECT * FROM public._get_login_streak_status_internal(p_user_id);
      END;
      $fn$;
    $sql$;

    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.claim_login_streak_reward(
        p_user_id uuid
      )
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $fn$
      BEGIN
        IF p_user_id IS NULL THEN
          RAISE EXCEPTION 'Unauthenticated user';
        END IF;

        RETURN public._claim_login_streak_reward_internal(p_user_id);
      END;
      $fn$;
    $sql$;
  END IF;
END
$$;

GRANT EXECUTE ON FUNCTION public.get_login_streak_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_login_streak_reward(uuid) TO authenticated;
