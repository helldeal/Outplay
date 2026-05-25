-- Add S5 series split (start 2026-05-26, end 2026-06-30), same tiers and missions as S4.

WITH s5 AS (
  SELECT s.id
  FROM public.series s
  WHERE s.code = 'S5'
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
    'SERIES_S5_SPLIT',
    'Series Split This is Rocket League',
    s5.id,
    '2026-05-26T00:00:00Z'::timestamptz,
    '2026-06-30T00:00:00Z'::timestamptz,
    25
  FROM s5
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
  WHERE ss.code = 'SERIES_S5_SPLIT'
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
    (5, 1000, 1000, NULL::public."BoosterType", 'S5 Split Enjoyer'::text),
    (6, 1350, 0, 'PREMIUM'::public."BoosterType", NULL::text),
    (7, 1750, 1000, NULL::public."BoosterType", NULL::text),
    (8, 2200, 0, 'PREMIUM'::public."BoosterType", 'S5 Split Master'::text),
    (9, 2700, 0, 'GODPACK'::public."BoosterType", NULL::text),
    (10, 3300, 3000, NULL::public."BoosterType", 'S5 Split Legend'::text)
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
  WHERE ss.code = 'SERIES_S5_SPLIT'
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
    ('S5_MISSION_OPEN_1', 'Start S5', 'Ouvre 1 boosters de la série S5.', 'series_opened_count', 1::numeric, 50),
    ('S5_MISSION_OPEN_8', 'Warm-up S5', 'Ouvre 8 boosters de la série S5.', 'series_opened_count', 8::numeric, 120),
    ('S5_MISSION_OPEN_20', 'Grind S5', 'Ouvre 20 boosters de la série S5.', 'series_opened_count', 20::numeric, 220),
    ('S5_MISSION_LUCK_6', 'Luck Specialist', 'Ouvre 6 boosters Luck S5.', 'series_luck_opened_count', 6::numeric, 240),
    ('S5_MISSION_PREMIUM_6', 'Premium Specialist', 'Ouvre 6 boosters Premium S5.', 'series_premium_opened_count', 6::numeric, 280),
    ('S5_MISSION_WC_PLUS_10', 'World Class Hunter', 'Obtiens 10 drops World Class+ sur S5.', 'series_world_class_plus_drops_total', 10::numeric, 320),
    ('S5_MISSION_LEGENDS_1', 'Legend Chaser', 'Obtiens la Legende de la série S5.', 'series_legends_drops_total', 1::numeric, 360),
    ('S5_MISSION_PREMIUM_TRIPLE', 'Premium Triple', 'Fais une ouverture Premium S5 avec 3 World Class+.', 'series_premium_openings_with_3_world_class_plus', 1::numeric, 420),
    ('S5_MISSION_LUCK_DOUBLE', 'Luck Double', 'Fais une ouverture Luck S5 avec 2 World Class+.', 'series_luck_openings_with_2_world_class_plus', 1::numeric, 300)
) AS mission(code, name, description, metric_key, target_value, reward_points)
ON CONFLICT (code) DO UPDATE
SET
  split_id = EXCLUDED.split_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  metric_key = EXCLUDED.metric_key,
  target_value = EXCLUDED.target_value,
  reward_points = EXCLUDED.reward_points;
