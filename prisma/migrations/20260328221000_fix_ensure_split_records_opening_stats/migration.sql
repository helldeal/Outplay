-- Fix aggregate error in _ensure_series_split_records opening_stats CTE
CREATE OR REPLACE FUNCTION public._ensure_series_split_records(
  p_user_id uuid,
  p_split_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_points int;
  v_mission RECORD;
  v_tier RECORD;
BEGIN
  WITH opening_stats AS (
    SELECT
      (COUNT(*) * MAX(ss.points_per_series_opening))::int AS opening_points_value
    FROM public.booster_openings bo
    JOIN public.series_splits ss ON ss.id = p_split_id
    WHERE bo.user_id = p_user_id
      AND bo.series_id = ss.series_id
      AND bo.created_at >= ss.starts_at
      AND bo.created_at < ss.ends_at
  ),
  mission_points AS (
    SELECT COALESCE(SUM(m.reward_points), 0)::int AS value
    FROM public.user_series_split_mission usm
    JOIN public.series_split_missions m ON m.id = usm.mission_id
    WHERE usm.user_id = p_user_id
      AND m.split_id = p_split_id
      AND usm.claimed_at IS NOT NULL
  )
  SELECT
    COALESCE(os.opening_points_value, 0) + COALESCE(mp.value, 0)
  INTO v_total_points
  FROM opening_stats os
  CROSS JOIN mission_points mp;

  FOR v_mission IN
    SELECT m.id
    FROM public.series_split_missions m
    WHERE m.split_id = p_split_id
      AND public._series_split_metric(p_user_id, p_split_id, m.metric_key) >= m.target_value
  LOOP
    INSERT INTO public.user_series_split_mission (user_id, mission_id, unlocked_at)
    VALUES (p_user_id, v_mission.id, now())
    ON CONFLICT (user_id, mission_id) DO NOTHING;
  END LOOP;

  FOR v_tier IN
    SELECT t.id
    FROM public.series_split_tiers t
    WHERE t.split_id = p_split_id
      AND v_total_points >= t.points_required
  LOOP
    INSERT INTO public.user_series_split_tier (user_id, tier_id, unlocked_at)
    VALUES (p_user_id, v_tier.id, now())
    ON CONFLICT (user_id, tier_id) DO NOTHING;
  END LOOP;
END;
$$;
