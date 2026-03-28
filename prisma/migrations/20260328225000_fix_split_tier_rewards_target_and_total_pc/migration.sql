-- Fix split tier rewards:
-- 1) PC rewards must also increment users.total_pc_earned
-- 2) Booster rewards must use real opening resolver (cards generated, target series respected)
CREATE OR REPLACE FUNCTION public.claim_series_split_tier(
  p_tier_level int,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_split RECORD;
  v_tier RECORD;
  v_total_points int;
  v_opening jsonb := NULL;
  v_opening_id uuid;
  v_pc int;
  v_booster_type public."BoosterType";
  v_booster_id uuid;
  v_target_series_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated user';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'You can only claim your own split tier';
  END IF;

  SELECT ss.id, ss.series_id, ss.starts_at, ss.ends_at, ss.points_per_series_opening
  INTO v_split
  FROM public.series_splits ss
  WHERE now() >= ss.starts_at
    AND now() < ss.ends_at
  ORDER BY ss.starts_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active series split';
  END IF;

  SELECT t.*
  INTO v_tier
  FROM public.series_split_tiers t
  WHERE t.split_id = v_split.id
    AND t.tier_level = p_tier_level
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tier level % not found in active split', p_tier_level;
  END IF;

  PERFORM public._ensure_series_split_records(p_user_id, v_split.id);

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_series_split_tier ust
    WHERE ust.user_id = p_user_id
      AND ust.tier_id = v_tier.id
  ) THEN
    RAISE EXCEPTION 'Tier % not unlocked yet', p_tier_level;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_series_split_tier ust
    WHERE ust.user_id = p_user_id
      AND ust.tier_id = v_tier.id
      AND ust.claimed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Tier % already claimed', p_tier_level;
  END IF;

  WITH points_calc AS (
    SELECT
      (
        COALESCE(opening_points.value, 0)
        + COALESCE(claimed_points.value, 0)
      )::int AS total
    FROM (
      SELECT (COUNT(*) * v_split.points_per_series_opening)::int AS value
      FROM public.booster_openings bo
      WHERE bo.user_id = p_user_id
        AND bo.series_id = v_split.series_id
        AND bo.created_at >= v_split.starts_at
        AND bo.created_at < v_split.ends_at
    ) opening_points,
    (
      SELECT COALESCE(SUM(m.reward_points), 0)::int AS value
      FROM public.user_series_split_mission usm
      JOIN public.series_split_missions m ON m.id = usm.mission_id
      WHERE usm.user_id = p_user_id
        AND m.split_id = v_split.id
        AND usm.claimed_at IS NOT NULL
    ) claimed_points
  )
  SELECT total INTO v_total_points
  FROM points_calc;

  IF v_total_points < v_tier.points_required THEN
    RAISE EXCEPTION 'Not enough points to claim tier %', p_tier_level;
  END IF;

  v_pc := v_tier.reward_pc;
  v_booster_type := v_tier.reward_booster_type;

  IF v_pc > 0 THEN
    UPDATE public.users
    SET
      pc_balance = pc_balance + v_pc,
      total_pc_earned = total_pc_earned + v_pc
    WHERE id = p_user_id;
  END IF;

  IF v_booster_type IS NOT NULL THEN
    SELECT u.target_series_id
    INTO v_target_series_id
    FROM public.users u
    WHERE u.id = p_user_id;

    v_booster_id := public._resolve_reward_booster_id(v_booster_type, v_target_series_id);

    IF v_booster_id IS NULL THEN
      RAISE EXCEPTION 'No booster found for reward type %', v_booster_type;
    END IF;

    v_opening := public._resolve_booster_opening(
      v_booster_id,
      p_user_id,
      'ACHIEVEMENT'::public."OpeningType",
      false,
      v_target_series_id
    );

    IF v_opening IS NOT NULL AND (v_opening ->> 'openingId') IS NOT NULL THEN
      v_opening_id := (v_opening ->> 'openingId')::uuid;
    END IF;
  END IF;

  IF v_tier.reward_title IS NOT NULL THEN
    UPDATE public.users
    SET title = v_tier.reward_title
    WHERE id = p_user_id;
  END IF;

  UPDATE public.user_series_split_tier
  SET
    claimed_at = now(),
    reward_opening_id = v_opening_id
  WHERE user_id = p_user_id
    AND tier_id = v_tier.id;

  RETURN jsonb_build_object(
    'tierLevel', v_tier.tier_level,
    'rewardPc', v_tier.reward_pc,
    'rewardBoosterType', v_tier.reward_booster_type,
    'rewardTitle', v_tier.reward_title,
    'opening', v_opening
  );
END;
$$;
