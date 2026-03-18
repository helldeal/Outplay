-- Add target series support to claim_achievement_reward
-- Allows achievements to respect user's target series selection

DO $$
BEGIN
  IF to_regprocedure('public._claim_achievement_reward_internal(uuid, text)') IS NOT NULL THEN
    DROP FUNCTION public._claim_achievement_reward_internal(uuid, text);
  END IF;
  
  IF to_regprocedure('public.claim_achievement_reward(uuid, text)') IS NOT NULL THEN
    DROP FUNCTION public.claim_achievement_reward(uuid, text);
  END IF;
END
$$;

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
    v_booster_id := public._resolve_reward_booster_id(v_def.reward_booster_type);

    IF v_booster_id IS NULL THEN
      RAISE EXCEPTION 'No booster found for reward type %', v_def.reward_booster_type;
    END IF;

    v_opening := public._resolve_booster_opening(
      v_booster_id,
      p_user_id,
      'ACHIEVEMENT'::public."OpeningType",
      false,
      p_target_series_id
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

CREATE OR REPLACE FUNCTION public.claim_achievement_reward(
  p_user_id uuid DEFAULT auth.uid(),
  p_achievement_code text DEFAULT NULL,
  p_target_series_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public._claim_achievement_reward_internal(
    p_user_id,
    p_achievement_code,
    p_target_series_id
  );
END;
$$;
