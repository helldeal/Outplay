-- Achievements manual-claim mode: unlock is automatic, reward claim is explicit by user action.

CREATE OR REPLACE FUNCTION public.evaluate_achievements(
  p_user_id uuid
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unlocked_total int := 0;
  v_unlocked_in_pass int;
  v_new_achievement_id uuid;
  v_metric numeric;
  v_guard int;
  v_def RECORD;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO public.login_streaks (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  FOR v_guard IN 1..6 LOOP
    v_unlocked_in_pass := 0;

    FOR v_def IN
      SELECT ad.id, ad.metric_key, ad.target_value
      FROM public.achievement_definitions ad
      LEFT JOIN public.user_achievements ua
        ON ua.achievement_id = ad.id
       AND ua.user_id = p_user_id
      WHERE ua.achievement_id IS NULL
      ORDER BY ad.created_at ASC
    LOOP
      v_metric := public._achievement_metric(p_user_id, v_def.metric_key);

      IF v_metric < v_def.target_value THEN
        CONTINUE;
      END IF;

      INSERT INTO public.user_achievements (
        user_id,
        achievement_id,
        unlocked_at
      )
      VALUES (p_user_id, v_def.id, now())
      ON CONFLICT (user_id, achievement_id) DO NOTHING
      RETURNING achievement_id INTO v_new_achievement_id;

      IF v_new_achievement_id IS NULL THEN
        CONTINUE;
      END IF;

      v_unlocked_in_pass := v_unlocked_in_pass + 1;
      v_unlocked_total := v_unlocked_total + 1;
      v_new_achievement_id := NULL;
    END LOOP;

    EXIT WHEN v_unlocked_in_pass = 0;
  END LOOP;

  RETURN v_unlocked_total;
END;
$$;

CREATE OR REPLACE FUNCTION public._claim_achievement_reward_internal(
  p_user_id uuid,
  p_achievement_code text
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
    v_booster_id := public._resolve_reward_booster_id(v_def.reward_booster_type);

    IF v_booster_id IS NULL THEN
      RAISE EXCEPTION 'No booster found for reward type %', v_def.reward_booster_type;
    END IF;

    v_opening := public._resolve_booster_opening(
      v_booster_id,
      p_user_id,
      'ACHIEVEMENT'::public."OpeningType",
      false
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
  WHERE ua.user_id = p_user_id
    AND ua.achievement_id = v_def.id;

  RETURN jsonb_build_object(
    'code', v_def.code,
    'name', v_def.name,
    'rewardPc', COALESCE(v_def.reward_pc, 0),
    'rewardBoosterType', v_def.reward_booster_type,
    'rewardTitle', v_def.reward_title,
    'opening', v_opening
  );
END;
$$;

DROP FUNCTION IF EXISTS public.get_achievements_progress(uuid);

DO $$
BEGIN
  IF to_regprocedure('auth.uid()') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.claim_achievement_reward(
        p_achievement_code text,
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
          RAISE EXCEPTION 'You can only claim your own achievement rewards';
        END IF;

        RETURN public._claim_achievement_reward_internal(p_user_id, p_achievement_code);
      END;
      $fn$;
    $sql$;

    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.get_achievements_progress(
        p_user_id uuid DEFAULT auth.uid()
      )
      RETURNS TABLE (
        achievement_id uuid,
        code text,
        name text,
        category text,
        description text,
        target_value numeric,
        current_value numeric,
        progress_pct int,
        unlocked boolean,
        unlocked_at timestamptz,
        reward_label text,
        reward_pc int,
        reward_booster_type public."BoosterType",
        reward_title text,
        reward_claimed boolean,
        can_claim_reward boolean,
        seen boolean
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
          RAISE EXCEPTION 'You can only access your own achievements';
        END IF;

        PERFORM public.evaluate_achievements(p_user_id);

        RETURN QUERY
        SELECT
          ad.id AS achievement_id,
          ad.code,
          ad.name,
          ad.category,
          ad.description,
          ad.target_value,
          metrics.current_value,
          LEAST(
            100,
            FLOOR(
              CASE
                WHEN ad.target_value <= 0 THEN 0
                ELSE (metrics.current_value / ad.target_value) * 100
              END
            )::int
          ) AS progress_pct,
          (ua.achievement_id IS NOT NULL) AS unlocked,
          ua.unlocked_at,
          public._build_achievement_reward_label(ad.reward_pc, ad.reward_booster_type, ad.reward_title) AS reward_label,
          ad.reward_pc,
          ad.reward_booster_type,
          ad.reward_title,
          (ua.reward_granted_at IS NOT NULL) AS reward_claimed,
          (ua.achievement_id IS NOT NULL AND ua.reward_granted_at IS NULL) AS can_claim_reward,
          (ua.seen_at IS NOT NULL) AS seen
        FROM public.achievement_definitions ad
        LEFT JOIN public.user_achievements ua
          ON ua.achievement_id = ad.id
         AND ua.user_id = p_user_id
        CROSS JOIN LATERAL (
          SELECT public._achievement_metric(p_user_id, ad.metric_key) AS current_value
        ) metrics
        ORDER BY ad.category ASC, ad.created_at ASC;
      END;
      $fn$;
    $sql$;
  ELSE
    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.claim_achievement_reward(
        p_achievement_code text,
        p_user_id uuid
      )
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $fn$
      BEGIN
        RETURN public._claim_achievement_reward_internal(p_user_id, p_achievement_code);
      END;
      $fn$;
    $sql$;

    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.get_achievements_progress(
        p_user_id uuid
      )
      RETURNS TABLE (
        achievement_id uuid,
        code text,
        name text,
        category text,
        description text,
        target_value numeric,
        current_value numeric,
        progress_pct int,
        unlocked boolean,
        unlocked_at timestamptz,
        reward_label text,
        reward_pc int,
        reward_booster_type public."BoosterType",
        reward_title text,
        reward_claimed boolean,
        can_claim_reward boolean,
        seen boolean
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $fn$
      BEGIN
        PERFORM public.evaluate_achievements(p_user_id);

        RETURN QUERY
        SELECT
          ad.id AS achievement_id,
          ad.code,
          ad.name,
          ad.category,
          ad.description,
          ad.target_value,
          metrics.current_value,
          LEAST(
            100,
            FLOOR(
              CASE
                WHEN ad.target_value <= 0 THEN 0
                ELSE (metrics.current_value / ad.target_value) * 100
              END
            )::int
          ) AS progress_pct,
          (ua.achievement_id IS NOT NULL) AS unlocked,
          ua.unlocked_at,
          public._build_achievement_reward_label(ad.reward_pc, ad.reward_booster_type, ad.reward_title) AS reward_label,
          ad.reward_pc,
          ad.reward_booster_type,
          ad.reward_title,
          (ua.reward_granted_at IS NOT NULL) AS reward_claimed,
          (ua.achievement_id IS NOT NULL AND ua.reward_granted_at IS NULL) AS can_claim_reward,
          (ua.seen_at IS NOT NULL) AS seen
        FROM public.achievement_definitions ad
        LEFT JOIN public.user_achievements ua
          ON ua.achievement_id = ad.id
         AND ua.user_id = p_user_id
        CROSS JOIN LATERAL (
          SELECT public._achievement_metric(p_user_id, ad.metric_key) AS current_value
        ) metrics
        ORDER BY ad.category ASC, ad.created_at ASC;
      END;
      $fn$;
    $sql$;
  END IF;
END
$$;

GRANT EXECUTE ON FUNCTION public.claim_achievement_reward(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_achievements_progress(uuid) TO authenticated;
