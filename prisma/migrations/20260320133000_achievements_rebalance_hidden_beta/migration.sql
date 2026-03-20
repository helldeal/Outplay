-- Achievements adjustments:
-- - Big Hitter title only on BIG_HIT_IV
-- - Remove S2 Explorer/S2 Collector achievements
-- - Rename Special Kairyuu -> Special Kairyyuu (+ title)
-- - Rename LEC Collector -> LoL Collector
-- - Rebalance starter rewards chain and set NORMAL_STARTER to 500 PC
-- - Do not auto-apply user title on achievement claim
-- - Add hidden beta achievement visible only when unlocked

ALTER TABLE public.achievement_definitions
ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

DELETE FROM public.achievement_definitions
WHERE code IN ('SERIES_S2_EXPLORER', 'SERIES_S2_COLLECTOR');

UPDATE public.achievement_definitions
SET reward_title = CASE WHEN code = 'BIG_HIT_IV' THEN 'Big Hitter' ELSE NULL END
WHERE code IN ('BIG_HIT_I', 'BIG_HIT_II', 'BIG_HIT_III', 'BIG_HIT_IV');

UPDATE public.achievement_definitions
SET
  name = 'Special Kairyyuu',
  reward_title = 'Kairyyuu'
WHERE code = 'SPECIAL_KAIRYUU';

UPDATE public.achievement_definitions
SET name = 'LoL Collector'
WHERE code = 'LEC_COLLECTOR';

UPDATE public.achievement_definitions
SET
  reward_booster_type = CASE code
    WHEN 'GODPACK_STARTER' THEN 'PREMIUM'::public."BoosterType"
    WHEN 'PREMIUM_STARTER' THEN 'LUCK'::public."BoosterType"
    WHEN 'LUCK_STARTER' THEN 'NORMAL'::public."BoosterType"
    WHEN 'NORMAL_STARTER' THEN NULL
    ELSE reward_booster_type
  END,
  reward_pc = CASE
    WHEN code = 'NORMAL_STARTER' THEN 500
    ELSE reward_pc
  END
WHERE code IN ('GODPACK_STARTER', 'PREMIUM_STARTER', 'LUCK_STARTER', 'NORMAL_STARTER');

INSERT INTO public.achievement_definitions (
  code,
  name,
  category,
  description,
  metric_key,
  target_value,
  reward_pc,
  reward_booster_type,
  reward_title,
  leaderboard_points,
  hidden
)
VALUES (
  'BETA_TESTER',
  'Beta Tester',
  'Other',
  'Réservé aux beta testeurs Outplay.',
  'manual_only',
  1,
  0,
  NULL,
  'Beta Tester',
  0,
  true
)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  metric_key = EXCLUDED.metric_key,
  target_value = EXCLUDED.target_value,
  reward_pc = EXCLUDED.reward_pc,
  reward_booster_type = EXCLUDED.reward_booster_type,
  reward_title = EXCLUDED.reward_title,
  leaderboard_points = EXCLUDED.leaderboard_points,
  hidden = EXCLUDED.hidden;

INSERT INTO public.user_achievements (
  user_id,
  achievement_id,
  unlocked_at
)
SELECT
  u.id,
  ad.id,
  now()
FROM public.users u
JOIN public.achievement_definitions ad
  ON ad.code = 'BETA_TESTER'
ON CONFLICT (user_id, achievement_id) DO NOTHING;

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

DROP FUNCTION IF EXISTS public.get_achievements_progress(uuid);

CREATE OR REPLACE FUNCTION public.get_achievements_progress(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  achievement_id uuid,
  code text,
  name text,
  category text,
  description text,
  metric_key text,
  target_value numeric,
  current_value numeric,
  progress_pct int,
  leaderboard_points int,
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
AS $$
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
    ad.metric_key,
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
    ad.leaderboard_points,
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
  WHERE (NOT COALESCE(ad.hidden, false) OR ua.achievement_id IS NOT NULL)
  ORDER BY ad.category ASC, ad.name ASC, ad.code ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_achievements_progress(uuid) TO authenticated;
