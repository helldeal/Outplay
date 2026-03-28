ALTER TABLE public.user_series_split_mission_claims
	ADD COLUMN IF NOT EXISTS unlocked_at timestamptz;

UPDATE public.user_series_split_mission_claims
SET unlocked_at = claimed_at
WHERE unlocked_at IS NULL;

ALTER TABLE public.user_series_split_mission_claims
	ALTER COLUMN unlocked_at SET DEFAULT now();

ALTER TABLE public.user_series_split_mission_claims
	ALTER COLUMN unlocked_at SET NOT NULL;

ALTER TABLE public.user_series_split_mission_claims
	ADD COLUMN IF NOT EXISTS notified_at timestamptz,
	ADD COLUMN IF NOT EXISTS seen_at timestamptz;

ALTER TABLE public.user_series_split_tier_claims
	ADD COLUMN IF NOT EXISTS unlocked_at timestamptz;

UPDATE public.user_series_split_tier_claims
SET unlocked_at = claimed_at
WHERE unlocked_at IS NULL;

ALTER TABLE public.user_series_split_tier_claims
	ALTER COLUMN unlocked_at SET DEFAULT now();

ALTER TABLE public.user_series_split_tier_claims
	ALTER COLUMN unlocked_at SET NOT NULL;

ALTER TABLE public.user_series_split_tier_claims
	ADD COLUMN IF NOT EXISTS notified_at timestamptz,
	ADD COLUMN IF NOT EXISTS seen_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_user_split_mission_claims_unlocked
	ON public.user_series_split_mission_claims (user_id, unlocked_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_split_mission_claims_notified
	ON public.user_series_split_mission_claims (user_id, notified_at);

CREATE INDEX IF NOT EXISTS idx_user_split_mission_claims_seen
	ON public.user_series_split_mission_claims (user_id, seen_at);

CREATE INDEX IF NOT EXISTS idx_user_split_tier_claims_unlocked
	ON public.user_series_split_tier_claims (user_id, unlocked_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_split_tier_claims_notified
	ON public.user_series_split_tier_claims (user_id, notified_at);

CREATE INDEX IF NOT EXISTS idx_user_split_tier_claims_seen
	ON public.user_series_split_tier_claims (user_id, seen_at);

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
		FROM public.user_series_split_mission_claims umc
		JOIN public.series_split_missions m ON m.id = umc.mission_id
		JOIN public.series_splits ss ON ss.id = m.split_id
		WHERE umc.user_id = p_user_id
			AND umc.seen_at IS NULL
			AND now() >= ss.starts_at
			AND now() < ss.ends_at

		UNION ALL

		SELECT COUNT(*)::int AS value
		FROM public.user_series_split_tier_claims utc
		JOIN public.series_split_tiers t ON t.id = utc.tier_id
		JOIN public.series_splits ss ON ss.id = t.split_id
		WHERE utc.user_id = p_user_id
			AND utc.seen_at IS NULL
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
			umc.mission_id,
			NULL::uuid AS tier_id,
			umc.unlocked_at
		FROM public.user_series_split_mission_claims umc
		JOIN public.series_split_missions m ON m.id = umc.mission_id
		JOIN public.series_splits ss ON ss.id = m.split_id
		WHERE umc.user_id = p_user_id
			AND umc.notified_at IS NULL
			AND now() >= ss.starts_at
			AND now() < ss.ends_at

		UNION ALL

		SELECT
			'TIER'::text AS source,
			NULL::uuid AS mission_id,
			utc.tier_id,
			utc.unlocked_at
		FROM public.user_series_split_tier_claims utc
		JOIN public.series_split_tiers t ON t.id = utc.tier_id
		JOIN public.series_splits ss ON ss.id = t.split_id
		WHERE utc.user_id = p_user_id
			AND utc.notified_at IS NULL
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
		UPDATE public.user_series_split_mission_claims umc
		SET notified_at = now()
		WHERE umc.user_id = p_user_id
			AND umc.mission_id IN (
				SELECT s.mission_id
				FROM selected s
				WHERE s.source = 'MISSION'
					AND s.mission_id IS NOT NULL
			)
		RETURNING umc.mission_id, umc.unlocked_at
	),
	marked_tiers AS (
		UPDATE public.user_series_split_tier_claims utc
		SET notified_at = now()
		WHERE utc.user_id = p_user_id
			AND utc.tier_id IN (
				SELECT s.tier_id
				FROM selected s
				WHERE s.source = 'TIER'
					AND s.tier_id IS NOT NULL
			)
		RETURNING utc.tier_id, utc.unlocked_at
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
		format('Tier %s réclamé', t.tier_level) AS title,
		trim(
			concat_ws(
				' · ',
				CASE
					WHEN COALESCE(t.reward_pc, 0) > 0 THEN format('%s PC', t.reward_pc)
					ELSE NULL
				END,
				CASE
					WHEN t.reward_booster_type IS NOT NULL THEN format('%s Booster', t.reward_booster_type)
					ELSE NULL
				END,
				CASE
					WHEN t.reward_title IS NOT NULL THEN format('Titre: %s', t.reward_title)
					ELSE NULL
				END
			)
		) AS reward_label,
		mt.unlocked_at
	FROM marked_tiers mt
	JOIN public.series_split_tiers t ON t.id = mt.tier_id

	ORDER BY unlocked_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_series_split_seen(
	p_user_id uuid DEFAULT auth.uid()
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_missions_updated int := 0;
	v_tiers_updated int := 0;
BEGIN
	IF p_user_id IS NULL THEN
		RAISE EXCEPTION 'Unauthenticated user';
	END IF;

	IF auth.uid() IS DISTINCT FROM p_user_id THEN
		RAISE EXCEPTION 'You can only mark your own split notifications as seen';
	END IF;

	UPDATE public.user_series_split_mission_claims umc
	SET seen_at = now()
	FROM public.series_split_missions m
	JOIN public.series_splits ss ON ss.id = m.split_id
	WHERE umc.user_id = p_user_id
		AND umc.mission_id = m.id
		AND umc.seen_at IS NULL
		AND now() >= ss.starts_at
		AND now() < ss.ends_at;
	GET DIAGNOSTICS v_missions_updated = ROW_COUNT;

	UPDATE public.user_series_split_tier_claims utc
	SET seen_at = now()
	FROM public.series_split_tiers t
	JOIN public.series_splits ss ON ss.id = t.split_id
	WHERE utc.user_id = p_user_id
		AND utc.tier_id = t.id
		AND utc.seen_at IS NULL
		AND now() >= ss.starts_at
		AND now() < ss.ends_at;
	GET DIAGNOSTICS v_tiers_updated = ROW_COUNT;

	RETURN COALESCE(v_missions_updated, 0) + COALESCE(v_tiers_updated, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.get_series_split_unseen_count(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pull_series_split_notifications(uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_series_split_seen(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_series_split_unseen_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pull_series_split_notifications(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_series_split_seen(uuid) TO authenticated;
