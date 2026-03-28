-- Fix ambiguous column reference in get_series_split_overview
CREATE OR REPLACE FUNCTION public.get_series_split_overview(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  split_id uuid,
  split_code text,
  split_name text,
  series_id uuid,
  series_code text,
  series_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  points_per_series_opening int,
  opening_points int,
  mission_points int,
  total_points int,
  tiers jsonb,
  missions jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_split RECORD;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated user';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'You can only access your own split overview';
  END IF;

  SELECT
    ss.id,
    ss.code,
    ss.name,
    ss.series_id,
    ss.starts_at,
    ss.ends_at,
    ss.points_per_series_opening,
    s.code AS series_code,
    s.name AS series_name
  INTO v_split
  FROM public.series_splits ss
  JOIN public.series s ON s.id = ss.series_id
  WHERE now() >= ss.starts_at
    AND now() < ss.ends_at
  ORDER BY ss.starts_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Ensure records exist for unlocked missions and tiers
  PERFORM public._ensure_series_split_records(p_user_id, v_split.id);

  RETURN QUERY
  WITH opening_stats AS (
    SELECT
      COUNT(*)::int AS openings_count,
      (COUNT(*) * v_split.points_per_series_opening)::int AS opening_points_value
    FROM public.booster_openings bo
    WHERE bo.user_id = p_user_id
      AND bo.series_id = v_split.series_id
      AND bo.created_at >= v_split.starts_at
      AND bo.created_at < v_split.ends_at
  ),
  mission_rows AS (
    SELECT
      m.id,
      m.code,
      m.name,
      m.description,
      m.metric_key,
      m.target_value,
      m.reward_points,
      public._series_split_metric(p_user_id, v_split.id, m.metric_key) AS current_value,
      COALESCE(usm.claimed_at IS NOT NULL, false) AS claimed,
      COALESCE(usm.unlocked_at IS NOT NULL, false) AS unlocked
    FROM public.series_split_missions m
    LEFT JOIN public.user_series_split_mission usm
      ON usm.mission_id = m.id
      AND usm.user_id = p_user_id
    WHERE m.split_id = v_split.id
  ),
  mission_points AS (
    SELECT COALESCE(SUM(mr.reward_points) FILTER (WHERE mr.claimed), 0)::int AS value
    FROM mission_rows mr
  ),
  total_points AS (
    SELECT
      (COALESCE(os.opening_points_value, 0) + COALESCE(mp.value, 0))::int AS value
    FROM opening_stats os
    CROSS JOIN mission_points mp
  ),
  tier_rows AS (
    SELECT
      t.id,
      t.tier_level,
      t.points_required,
      t.reward_pc,
      t.reward_booster_type,
      t.reward_title,
      COALESCE(ust.claimed_at IS NOT NULL, false) AS claimed,
      ((SELECT value FROM total_points) >= t.points_required) AS unlocked
    FROM public.series_split_tiers t
    LEFT JOIN public.user_series_split_tier ust
      ON ust.tier_id = t.id
      AND ust.user_id = p_user_id
    WHERE t.split_id = v_split.id
    ORDER BY t.tier_level ASC
  )
  SELECT
    v_split.id AS split_id,
    v_split.code AS split_code,
    v_split.name AS split_name,
    v_split.series_id,
    v_split.series_code,
    v_split.series_name,
    v_split.starts_at,
    v_split.ends_at,
    v_split.points_per_series_opening,
    COALESCE((SELECT os.opening_points_value FROM opening_stats os), 0) AS opening_points,
    COALESCE((SELECT value FROM mission_points), 0) AS mission_points,
    COALESCE((SELECT value FROM total_points), 0) AS total_points,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'tierLevel', tr.tier_level,
            'pointsRequired', tr.points_required,
            'rewardPc', tr.reward_pc,
            'rewardBoosterType', tr.reward_booster_type,
            'rewardTitle', tr.reward_title,
            'unlocked', tr.unlocked,
            'claimed', tr.claimed,
            'canClaim', (tr.unlocked AND NOT tr.claimed)
          )
          ORDER BY tr.tier_level ASC
        )
        FROM tier_rows tr
      ),
      '[]'::jsonb
    ) AS tiers,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'code', mr.code,
            'name', mr.name,
            'description', mr.description,
            'metricKey', mr.metric_key,
            'targetValue', mr.target_value,
            'currentValue', mr.current_value,
            'progressPct', LEAST(
              100,
              FLOOR(
                CASE
                  WHEN mr.target_value <= 0 THEN 0
                  ELSE (mr.current_value / mr.target_value) * 100
                END
              )::int
            ),
            'rewardPoints', mr.reward_points,
            'completed', (mr.current_value >= mr.target_value),
            'claimed', mr.claimed,
            'canClaim', ((mr.current_value >= mr.target_value) AND NOT mr.claimed)
          )
          ORDER BY mr.reward_points ASC, mr.code ASC
        )
        FROM mission_rows mr
      ),
      '[]'::jsonb
    ) AS missions;
END;
$$;
