-- Drop legacy claim tables no longer used by split notifications/claims lifecycle
DROP TABLE IF EXISTS public.user_series_split_mission_claims;
DROP TABLE IF EXISTS public.user_series_split_tier_claims;

-- Update tier notification title wording to unlocked instead of claimed/reached
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
    format('Palier %s débloqué', t.tier_level) AS title,
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
