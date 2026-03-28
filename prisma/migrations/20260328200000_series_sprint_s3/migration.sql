CREATE TABLE IF NOT EXISTS public.series_splits (
  id uuid PRIMARY KEY DEFAULT public.generate_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  series_id uuid NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  points_per_series_opening int NOT NULL DEFAULT 25,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT series_splits_dates_ck CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.series_split_tiers (
  id uuid PRIMARY KEY DEFAULT public.generate_uuid(),
  split_id uuid NOT NULL REFERENCES public.series_splits(id) ON DELETE CASCADE,
  tier_level int NOT NULL,
  points_required int NOT NULL,
  reward_pc int NOT NULL DEFAULT 0,
  reward_booster_type public."BoosterType",
  reward_title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT series_split_tiers_level_ck CHECK (tier_level >= 1),
  CONSTRAINT series_split_tiers_points_ck CHECK (points_required >= 0),
  CONSTRAINT series_split_tiers_reward_ck CHECK (
    reward_pc > 0 OR reward_booster_type IS NOT NULL OR reward_title IS NOT NULL
  ),
  UNIQUE (split_id, tier_level)
);

CREATE TABLE IF NOT EXISTS public.series_split_missions (
  id uuid PRIMARY KEY DEFAULT public.generate_uuid(),
  split_id uuid NOT NULL REFERENCES public.series_splits(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  metric_key text NOT NULL,
  target_value numeric NOT NULL,
  reward_points int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT series_split_missions_target_ck CHECK (target_value > 0),
  CONSTRAINT series_split_missions_reward_points_ck CHECK (reward_points > 0)
);

CREATE TABLE IF NOT EXISTS public.user_series_split_mission_claims (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES public.series_split_missions(id) ON DELETE CASCADE,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, mission_id)
);

CREATE TABLE IF NOT EXISTS public.user_series_split_tier_claims (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.series_split_tiers(id) ON DELETE CASCADE,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  reward_opening_id uuid REFERENCES public.booster_openings(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, tier_id)
);

CREATE INDEX IF NOT EXISTS idx_series_splits_series_dates
  ON public.series_splits (series_id, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_series_split_tiers_split_points
  ON public.series_split_tiers (split_id, points_required);

CREATE INDEX IF NOT EXISTS idx_series_split_missions_split
  ON public.series_split_missions (split_id);

CREATE OR REPLACE FUNCTION public._series_split_metric(
  p_user_id uuid,
  p_split_id uuid,
  p_metric_key text
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value numeric := 0;
  v_series_id uuid;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
BEGIN
  SELECT ss.series_id, ss.starts_at, ss.ends_at
  INTO v_series_id, v_starts_at, v_ends_at
  FROM public.series_splits ss
  WHERE ss.id = p_split_id
  LIMIT 1;

  IF v_series_id IS NULL THEN
    RETURN 0;
  END IF;

  CASE p_metric_key
    WHEN 'series_opened_count' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.booster_openings bo
      WHERE bo.user_id = p_user_id
        AND bo.series_id = v_series_id
        AND bo.created_at >= v_starts_at
        AND bo.created_at < v_ends_at;

    WHEN 'series_premium_opened_count' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.booster_openings bo
      JOIN public.boosters b ON b.id = bo.booster_id
      WHERE bo.user_id = p_user_id
        AND bo.series_id = v_series_id
        AND bo.created_at >= v_starts_at
        AND bo.created_at < v_ends_at
        AND b.type = 'PREMIUM'::public."BoosterType";

    WHEN 'series_luck_opened_count' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.booster_openings bo
      JOIN public.boosters b ON b.id = bo.booster_id
      WHERE bo.user_id = p_user_id
        AND bo.series_id = v_series_id
        AND bo.created_at >= v_starts_at
        AND bo.created_at < v_ends_at
        AND b.type = 'LUCK'::public."BoosterType";

    WHEN 'series_world_class_plus_drops_total' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.booster_openings bo
      JOIN LATERAL jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
          ELSE '[]'::jsonb
        END
      ) AS drawn(card_id) ON true
      JOIN public.cards c ON c.id = drawn.card_id
      WHERE bo.user_id = p_user_id
        AND bo.series_id = v_series_id
        AND bo.created_at >= v_starts_at
        AND bo.created_at < v_ends_at
        AND c.rarity IN ('WORLD_CLASS'::public."Rarity", 'LEGENDS'::public."Rarity");

    WHEN 'series_legends_drops_total' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.booster_openings bo
      JOIN LATERAL jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
          ELSE '[]'::jsonb
        END
      ) AS drawn(card_id) ON true
      JOIN public.cards c ON c.id = drawn.card_id
      WHERE bo.user_id = p_user_id
        AND bo.series_id = v_series_id
        AND bo.created_at >= v_starts_at
        AND bo.created_at < v_ends_at
        AND c.rarity = 'LEGENDS'::public."Rarity";

    WHEN 'series_premium_openings_with_3_world_class_plus' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM (
        SELECT bo.id
        FROM public.booster_openings bo
        JOIN public.boosters b ON b.id = bo.booster_id
        JOIN LATERAL jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
            ELSE '[]'::jsonb
          END
        ) AS drawn(card_id) ON true
        JOIN public.cards c ON c.id = drawn.card_id
        WHERE bo.user_id = p_user_id
          AND bo.series_id = v_series_id
          AND bo.created_at >= v_starts_at
          AND bo.created_at < v_ends_at
          AND b.type = 'PREMIUM'::public."BoosterType"
          AND c.rarity IN ('WORLD_CLASS'::public."Rarity", 'LEGENDS'::public."Rarity")
        GROUP BY bo.id
        HAVING COUNT(*) >= 3
      ) qualified;

    WHEN 'series_luck_openings_with_2_world_class_plus' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM (
        SELECT bo.id
        FROM public.booster_openings bo
        JOIN public.boosters b ON b.id = bo.booster_id
        JOIN LATERAL jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
            ELSE '[]'::jsonb
          END
        ) AS drawn(card_id) ON true
        JOIN public.cards c ON c.id = drawn.card_id
        WHERE bo.user_id = p_user_id
          AND bo.series_id = v_series_id
          AND bo.created_at >= v_starts_at
          AND bo.created_at < v_ends_at
          AND b.type = 'LUCK'::public."BoosterType"
          AND c.rarity IN ('WORLD_CLASS'::public."Rarity", 'LEGENDS'::public."Rarity")
        GROUP BY bo.id
        HAVING COUNT(*) >= 2
      ) qualified;

    ELSE
      v_value := 0;
  END CASE;

  RETURN COALESCE(v_value, 0);
END;
$$;

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
      (umc.mission_id IS NOT NULL) AS claimed
    FROM public.series_split_missions m
    LEFT JOIN public.user_series_split_mission_claims umc
      ON umc.mission_id = m.id
     AND umc.user_id = p_user_id
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
      (utc.tier_id IS NOT NULL) AS claimed,
      ((SELECT value FROM total_points) >= t.points_required) AS unlocked
    FROM public.series_split_tiers t
    LEFT JOIN public.user_series_split_tier_claims utc
      ON utc.tier_id = t.id
     AND utc.user_id = p_user_id
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
            'canClaim', (mr.current_value >= mr.target_value AND NOT mr.claimed)
          )
          ORDER BY mr.reward_points ASC, mr.code ASC
        )
        FROM mission_rows mr
      ),
      '[]'::jsonb
    ) AS missions;
END;
$$;

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

  IF EXISTS (
    SELECT 1
    FROM public.user_series_split_mission_claims umc
    WHERE umc.user_id = p_user_id
      AND umc.mission_id = v_mission.id
  ) THEN
    RAISE EXCEPTION 'Mission % already claimed', p_mission_code;
  END IF;

  v_current_value := public._series_split_metric(p_user_id, v_split.id, v_mission.metric_key);

  IF v_current_value < v_mission.target_value THEN
    RAISE EXCEPTION 'Mission % not completed yet', p_mission_code;
  END IF;

  INSERT INTO public.user_series_split_mission_claims (
    user_id,
    mission_id,
    claimed_at
  )
  VALUES (
    p_user_id,
    v_mission.id,
    now()
  );

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
    FROM public.user_series_split_mission_claims umc
    JOIN public.series_split_missions m ON m.id = umc.mission_id
    WHERE umc.user_id = p_user_id
      AND m.split_id = v_split.id
  ) claimed_points;

  RETURN jsonb_build_object(
    'code', v_mission.code,
    'rewardPoints', v_mission.reward_points,
    'totalPoints', COALESCE(v_total_points, 0)
  );
END;
$$;

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
  v_opening_id uuid := NULL;
  v_booster_id uuid;
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
    RAISE EXCEPTION 'Tier % not found in active split', p_tier_level;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_series_split_tier_claims utc
    WHERE utc.user_id = p_user_id
      AND utc.tier_id = v_tier.id
  ) THEN
    RAISE EXCEPTION 'Tier % already claimed', p_tier_level;
  END IF;

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
    FROM public.user_series_split_mission_claims umc
    JOIN public.series_split_missions m ON m.id = umc.mission_id
    WHERE umc.user_id = p_user_id
      AND m.split_id = v_split.id
  ) claimed_points;

  IF COALESCE(v_total_points, 0) < v_tier.points_required THEN
    RAISE EXCEPTION 'Tier % is not unlocked yet', p_tier_level;
  END IF;

  IF COALESCE(v_tier.reward_pc, 0) > 0 THEN
    UPDATE public.users
    SET
      pc_balance = pc_balance + v_tier.reward_pc,
      total_pc_earned = total_pc_earned + v_tier.reward_pc
    WHERE id = p_user_id;
  END IF;

  IF v_tier.reward_booster_type IS NOT NULL THEN
    v_booster_id := public._resolve_reward_booster_id(v_tier.reward_booster_type, v_split.series_id);

    IF v_booster_id IS NULL THEN
      RAISE EXCEPTION 'No booster found for reward type %', v_tier.reward_booster_type;
    END IF;

    v_opening := public._resolve_booster_opening(
      v_booster_id,
      p_user_id,
      'ACHIEVEMENT'::public."OpeningType",
      false,
      v_split.series_id
    );

    IF v_opening IS NOT NULL AND (v_opening ->> 'openingId') IS NOT NULL THEN
      v_opening_id := (v_opening ->> 'openingId')::uuid;
    END IF;
  END IF;

  INSERT INTO public.user_series_split_tier_claims (
    user_id,
    tier_id,
    claimed_at,
    reward_opening_id
  )
  VALUES (
    p_user_id,
    v_tier.id,
    now(),
    v_opening_id
  );

  RETURN jsonb_build_object(
    'tierLevel', v_tier.tier_level,
    'rewardPc', v_tier.reward_pc,
    'rewardBoosterType', v_tier.reward_booster_type,
    'rewardTitle', v_tier.reward_title,
    'opening', v_opening
  );
END;
$$;

WITH s3 AS (
  SELECT s.id
  FROM public.series s
  WHERE s.code = 'S3'
  LIMIT 1
),
upsert_split AS (
  INSERT INTO public.series_splits (
    code,
    name,
    series_id,
    starts_at,
    ends_at,
    points_per_series_opening
  )
  SELECT
    'SERIES_S3_SPLIT',
    'Series Split French Touch',
    s3.id,
    '2026-03-28T00:00:00Z'::timestamptz,
    '2026-04-25T00:00:00Z'::timestamptz,
    25
  FROM s3
  ON CONFLICT (code) DO UPDATE
  SET
    name = EXCLUDED.name,
    series_id = EXCLUDED.series_id,
    starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at,
    points_per_series_opening = EXCLUDED.points_per_series_opening
  RETURNING id
),
split_ref AS (
  SELECT id FROM upsert_split
  UNION ALL
  SELECT ss.id
  FROM public.series_splits ss
  WHERE ss.code = 'SERIES_S3_SPLIT'
  LIMIT 1
)
INSERT INTO public.series_split_tiers (
  split_id,
  tier_level,
  points_required,
  reward_pc,
  reward_booster_type,
  reward_title
)
SELECT
  sr.id,
  tier.level,
  tier.points_required,
  tier.reward_pc,
  tier.reward_booster_type,
  tier.reward_title
FROM split_ref sr
CROSS JOIN (
  VALUES
    (1, 100, 1000, NULL::public."BoosterType", NULL::text),
    (2, 250, 0, 'NORMAL'::public."BoosterType", NULL::text),
    (3, 450, 1000, NULL::public."BoosterType", NULL::text),
    (4, 700, 0, 'LUCK'::public."BoosterType", NULL::text),
    (5, 1000, 1000, NULL::public."BoosterType", 'S3 Split Enjoyer'::text),
    (6, 1350, 0, 'PREMIUM'::public."BoosterType", NULL::text),
    (7, 1750, 1000, NULL::public."BoosterType", NULL::text),
    (8, 2200, 0, 'PREMIUM'::public."BoosterType", 'S3 Split Master'::text),
    (9, 2700, 0, 'GODPACK'::public."BoosterType", NULL::text),
    (10, 3300, 3000, NULL::public."BoosterType", 'S3 Split Legend'::text)
) AS tier(level, points_required, reward_pc, reward_booster_type, reward_title)
ON CONFLICT (split_id, tier_level) DO UPDATE
SET
  points_required = EXCLUDED.points_required,
  reward_pc = EXCLUDED.reward_pc,
  reward_booster_type = EXCLUDED.reward_booster_type,
  reward_title = EXCLUDED.reward_title;

WITH split_ref AS (
  SELECT ss.id
  FROM public.series_splits ss
  WHERE ss.code = 'SERIES_S3_SPLIT'
  LIMIT 1
)
INSERT INTO public.series_split_missions (
  split_id,
  code,
  name,
  description,
  metric_key,
  target_value,
  reward_points
)
SELECT
  sr.id,
  mission.code,
  mission.name,
  mission.description,
  mission.metric_key,
  mission.target_value,
  mission.reward_points
FROM split_ref sr
CROSS JOIN (
  VALUES
    ('S3_MISSION_OPEN_1', 'Start S3', 'Ouvre 1 boosters de la série S3.', 'series_opened_count', 1::numeric, 50),
    ('S3_MISSION_OPEN_8', 'Warm-up S3', 'Ouvre 8 boosters de la série S3.', 'series_opened_count', 8::numeric, 120),
    ('S3_MISSION_OPEN_20', 'Grind S3', 'Ouvre 20 boosters de la série S3.', 'series_opened_count', 20::numeric, 220),
    ('S3_MISSION_LUCK_6', 'Luck Specialist', 'Ouvre 6 boosters Luck S3.', 'series_luck_opened_count', 6::numeric, 240),
    ('S3_MISSION_PREMIUM_6', 'Premium Specialist', 'Ouvre 6 boosters Premium S3.', 'series_premium_opened_count', 6::numeric, 280),
    ('S3_MISSION_WC_PLUS_10', 'World Class Hunter', 'Obtiens 10 drops World Class+ sur S3.', 'series_world_class_plus_drops_total', 10::numeric, 320),
    ('S3_MISSION_LEGENDS_1', 'Legend Chaser', 'Obtiens la Legende de la série S3.', 'series_legends_drops_total', 1::numeric, 360),
    ('S3_MISSION_PREMIUM_TRIPLE', 'Premium Triple', 'Fais une ouverture Premium S3 avec 3 World Class+.', 'series_premium_openings_with_3_world_class_plus', 1::numeric, 420),
    ('S3_MISSION_LUCK_DOUBLE', 'Luck Double', 'Fais une ouverture Luck S3 avec 2 World Class+.', 'series_luck_openings_with_2_world_class_plus', 1::numeric, 300)
) AS mission(code, name, description, metric_key, target_value, reward_points)
ON CONFLICT (code) DO UPDATE
SET
  split_id = EXCLUDED.split_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  metric_key = EXCLUDED.metric_key,
  target_value = EXCLUDED.target_value,
  reward_points = EXCLUDED.reward_points;

REVOKE ALL ON FUNCTION public._series_split_metric(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_series_split_overview(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_series_split_mission(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_series_split_tier(int, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_series_split_overview(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_series_split_mission(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_series_split_tier(int, uuid) TO authenticated;
