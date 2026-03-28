-- Step 1: Create new tables with correct schema
CREATE TABLE IF NOT EXISTS public.user_series_split_mission (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES public.series_split_missions(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  seen_at timestamptz,
  claimed_at timestamptz,
  PRIMARY KEY (user_id, mission_id)
);

CREATE TABLE IF NOT EXISTS public.user_series_split_tier (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.series_split_tiers(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  seen_at timestamptz,
  claimed_at timestamptz,
  reward_opening_id uuid REFERENCES public.booster_openings(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, tier_id)
);

-- Step 2: Migrate data from old tables if they exist
INSERT INTO public.user_series_split_mission (user_id, mission_id, unlocked_at, claimed_at)
SELECT user_id, mission_id,  
  COALESCE(unlocked_at, claimed_at), 
  claimed_at
FROM public.user_series_split_mission_claims umc
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_series_split_mission u
  WHERE u.user_id = umc.user_id AND u.mission_id = umc.mission_id
)
ON CONFLICT (user_id, mission_id) DO NOTHING;

INSERT INTO public.user_series_split_tier (user_id, tier_id, unlocked_at, claimed_at, reward_opening_id)
SELECT user_id, tier_id, 
  COALESCE(unlocked_at, claimed_at),
  claimed_at,
  reward_opening_id
FROM public.user_series_split_tier_claims utc
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_series_split_tier u
  WHERE u.user_id = utc.user_id AND u.tier_id = utc.tier_id
)
ON CONFLICT (user_id, tier_id) DO NOTHING;

-- Step 3: Create indexes on new tables
CREATE INDEX IF NOT EXISTS idx_user_split_mission_unlocked
  ON public.user_series_split_mission (user_id, unlocked_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_split_mission_notified
  ON public.user_series_split_mission (user_id, notified_at);

CREATE INDEX IF NOT EXISTS idx_user_split_mission_seen
  ON public.user_series_split_mission (user_id, seen_at);

CREATE INDEX IF NOT EXISTS idx_user_split_tier_unlocked
  ON public.user_series_split_tier (user_id, unlocked_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_split_tier_notified
  ON public.user_series_split_tier (user_id, notified_at);

CREATE INDEX IF NOT EXISTS idx_user_split_tier_seen
  ON public.user_series_split_tier (user_id, seen_at);

-- Step 4: Helper function to ensure mission/tier records exist at unlock time
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
  -- Calculate total points for this user in this split
  WITH opening_stats AS (
    SELECT
      (COUNT(*) * ss.points_per_series_opening)::int AS opening_points_value
    FROM public.booster_openings bo
    CROSS JOIN public.series_splits ss
    WHERE bo.user_id = p_user_id
      AND ss.id = p_split_id
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

  -- Handle missions: Insert if unlocked and not yet recorded
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

  -- Handle tiers: Insert if unlocked and not yet recorded
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

-- Step 5: Update get_series_split_overview to use new tables
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

-- Step 6: Update claim_series_split_mission to UPDATE new tables
CREATE OR REPLACE FUNCTION public.claim_series_split_mission(
  p_mission_code text,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_split RECORD;
  v_mission RECORD;
  v_current_value numeric;
  v_total_points int;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated user';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'You can only claim your own split mission';
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

  SELECT m.*
  INTO v_mission
  FROM public.series_split_missions m
  WHERE m.split_id = v_split.id
    AND m.code = p_mission_code
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mission % not found in active split', p_mission_code;
  END IF;

  -- Ensure record exists (should already exist if unlocked)
  PERFORM public._ensure_series_split_records(p_user_id, v_split.id);

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_series_split_mission usm
    WHERE usm.user_id = p_user_id
      AND usm.mission_id = v_mission.id
  ) THEN
    RAISE EXCEPTION 'Mission % not unlocked yet', p_mission_code;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_series_split_mission usm
    WHERE usm.user_id = p_user_id
      AND usm.mission_id = v_mission.id
      AND usm.claimed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Mission % already claimed', p_mission_code;
  END IF;

  v_current_value := public._series_split_metric(p_user_id, v_split.id, v_mission.metric_key);

  IF v_current_value < v_mission.target_value THEN
    RAISE EXCEPTION 'Mission % not completed yet', p_mission_code;
  END IF;

  -- UPDATE instead of INSERT
  UPDATE public.user_series_split_mission
  SET claimed_at = now()
  WHERE user_id = p_user_id
    AND mission_id = v_mission.id;

  SELECT
    (
      COALESCE(opening_points.value, 0)
      + COALESCE(claimed_points.value, 0)
    )::int
  INTO v_total_points
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
  ) claimed_points;

  RETURN jsonb_build_object(
    'code', v_mission.code,
    'rewardPoints', v_mission.reward_points,
    'totalPoints', COALESCE(v_total_points, 0)
  );
END;
$$;

-- Step 7: Update claim_series_split_tier to UPDATE new tables
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

  -- Ensure record exists (should already exist if unlocked)
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

  -- Handle rewards
  v_pc := v_tier.reward_pc;
  v_booster_type := v_tier.reward_booster_type;

  IF v_pc > 0 THEN
    UPDATE public.users
    SET planches_count = planches_count + v_pc
    WHERE id = p_user_id;
  END IF;

  IF v_booster_type IS NOT NULL THEN
    WITH booster_ref AS (
      SELECT b.id
      FROM public.boosters b
      WHERE b.type = v_booster_type
      ORDER BY RANDOM()
      LIMIT 1
    ),
    opening_inserted AS (
      INSERT INTO public.booster_openings (
        user_id,
        booster_id,
        series_id,
        cards,
        created_at
      )
      SELECT
        p_user_id,
        br.id,
        v_split.series_id,
        '[]'::text,
        now()
      FROM booster_ref br
      RETURNING id
    )
    SELECT id INTO v_opening_id FROM opening_inserted;

    SELECT jsonb_build_object(
      'id', v_opening_id,
      'boosterType', v_booster_type
    ) INTO v_opening;
  END IF;

  IF v_tier.reward_title IS NOT NULL THEN
    UPDATE public.users
    SET title = v_tier.reward_title
    WHERE id = p_user_id;
  END IF;

  -- UPDATE instead of INSERT
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

-- Step 8: Drop old notification functions and recreate with new tables
DROP FUNCTION IF EXISTS public.get_series_split_unseen_count(uuid);
DROP FUNCTION IF EXISTS public.pull_series_split_notifications(uuid, int);
DROP FUNCTION IF EXISTS public.mark_series_split_seen(uuid);

CREATE OR REPLACE FUNCTION public.get_series_split_unseen_count(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated user';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'You can only access your own split unseen count';
  END IF;

  SELECT COALESCE(SUM(value), 0)::int
  INTO v_count
  FROM (
    SELECT COUNT(*)::int AS value
    FROM public.user_series_split_mission usm
    JOIN public.series_split_missions m ON m.id = usm.mission_id
    JOIN public.series_splits ss ON ss.id = m.split_id
    WHERE usm.user_id = p_user_id
      AND usm.unlocked_at IS NOT NULL
      AND usm.seen_at IS NULL
      AND now() >= ss.starts_at
      AND now() < ss.ends_at

    UNION ALL

    SELECT COUNT(*)::int AS value
    FROM public.user_series_split_tier ust
    JOIN public.series_split_tiers t ON t.id = ust.tier_id
    JOIN public.series_splits ss ON ss.id = t.split_id
    WHERE ust.user_id = p_user_id
      AND ust.unlocked_at IS NOT NULL
      AND ust.seen_at IS NULL
      AND now() >= ss.starts_at
      AND now() < ss.ends_at
  ) counts;

  RETURN COALESCE(v_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.pull_series_split_notifications(
  p_user_id uuid DEFAULT auth.uid(),
  p_limit int DEFAULT 6
)
RETURNS TABLE (
  notification_type text,
  mission_code text,
  tier_level int,
  title text,
  reward_label text,
  unlocked_at timestamptz
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
    RAISE EXCEPTION 'You can only pull your own split notifications';
  END IF;

  RETURN QUERY
  WITH pending AS (
    SELECT
      'MISSION'::text AS source,
      usm.mission_id,
      NULL::uuid AS tier_id,
      usm.unlocked_at
    FROM public.user_series_split_mission usm
    JOIN public.series_split_missions m ON m.id = usm.mission_id
    JOIN public.series_splits ss ON ss.id = m.split_id
    WHERE usm.user_id = p_user_id
      AND usm.unlocked_at IS NOT NULL
      AND usm.notified_at IS NULL
      AND now() >= ss.starts_at
      AND now() < ss.ends_at

    UNION ALL

    SELECT
      'TIER'::text AS source,
      NULL::uuid AS mission_id,
      ust.tier_id,
      ust.unlocked_at
    FROM public.user_series_split_tier ust
    JOIN public.series_split_tiers t ON t.id = ust.tier_id
    JOIN public.series_splits ss ON ss.id = t.split_id
    WHERE ust.user_id = p_user_id
      AND ust.unlocked_at IS NOT NULL
      AND ust.notified_at IS NULL
      AND now() >= ss.starts_at
      AND now() < ss.ends_at
  ),
  selected AS (
    SELECT *
    FROM pending
    ORDER BY unlocked_at DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 6), 20))
  ),
  marked_missions AS (
    UPDATE public.user_series_split_mission usm
    SET notified_at = now()
    WHERE usm.user_id = p_user_id
      AND usm.mission_id IN (
        SELECT s.mission_id
        FROM selected s
        WHERE s.source = 'MISSION'
          AND s.mission_id IS NOT NULL
      )
    RETURNING usm.mission_id, usm.unlocked_at
  ),
  marked_tiers AS (
    UPDATE public.user_series_split_tier ust
    SET notified_at = now()
    WHERE ust.user_id = p_user_id
      AND ust.tier_id IN (
        SELECT s.tier_id
        FROM selected s
        WHERE s.source = 'TIER'
          AND s.tier_id IS NOT NULL
      )
    RETURNING ust.tier_id, ust.unlocked_at
  )
  SELECT
    'MISSION'::text AS notification_type,
    m.code AS mission_code,
    NULL::int AS tier_level,
    m.name AS title,
    format('+%s points mission', m.reward_points) AS reward_label,
    mm.unlocked_at
  FROM marked_missions mm
  JOIN public.series_split_missions m ON m.id = mm.mission_id

  UNION ALL

  SELECT
    'TIER'::text AS notification_type,
    NULL::text AS mission_code,
    t.tier_level,
    format('Palier %s atteint', t.tier_level) AS title,
    COALESCE(
      COALESCE(t.reward_pc::text || ' PC', '') ||
        CASE 
          WHEN t.reward_booster_type IS NOT NULL THEN 
            COALESCE(' + ' || t.reward_booster_type || ' booster', '')
          ELSE ''
        END ||
        CASE 
          WHEN t.reward_title IS NOT NULL THEN 
            COALESCE(' + titre: ' || t.reward_title, '')
          ELSE ''
        END,
      'Récompense'
    ) AS reward_label,
    mt.unlocked_at
  FROM marked_tiers mt
  JOIN public.series_split_tiers t ON t.id = mt.tier_id

  ORDER BY unlocked_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_series_split_seen(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated user';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'You can only mark your own split notifications as seen';
  END IF;

  -- Mark all active split missions as seen if they were unlocked
  UPDATE public.user_series_split_mission usm
  SET seen_at = now()
  WHERE usm.user_id = p_user_id
    AND usm.unlocked_at IS NOT NULL
    AND usm.seen_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.series_split_missions m
      JOIN public.series_splits ss ON ss.id = m.split_id
      WHERE m.id = usm.mission_id
        AND now() >= ss.starts_at
        AND now() < ss.ends_at
    );

  -- Mark all active split tiers as seen if they were unlocked
  UPDATE public.user_series_split_tier ust
  SET seen_at = now()
  WHERE ust.user_id = p_user_id
    AND ust.unlocked_at IS NOT NULL
    AND ust.seen_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.series_split_tiers t
      JOIN public.series_splits ss ON ss.id = t.split_id
      WHERE t.id = ust.tier_id
        AND now() >= ss.starts_at
        AND now() < ss.ends_at
    );
END;
$$;

-- Step 9: Grant permissions
REVOKE ALL ON FUNCTION public._ensure_series_split_records(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_series_split_unseen_count(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pull_series_split_notifications(uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_series_split_seen(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public._ensure_series_split_records(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_series_split_unseen_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pull_series_split_notifications(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_series_split_seen(uuid) TO authenticated;
