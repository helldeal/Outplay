-- Enforce shop purchase limits.
-- SHOP boosters from the active split series: max 5 purchases per day.

CREATE OR REPLACE FUNCTION public.get_user_opening_limits(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_split RECORD;
  v_shop_openings_today int := 0;
  v_shop_remaining int := 5;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated user';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'You can only access your own opening limits';
  END IF;

  SELECT
    ss.id,
    ss.series_id,
    ss.code AS split_code,
    s.code AS series_code,
    ss.starts_at,
    ss.ends_at
  INTO v_split
  FROM public.series_splits ss
  JOIN public.series s ON s.id = ss.series_id
  WHERE now() >= ss.starts_at
    AND now() < ss.ends_at
  ORDER BY ss.starts_at DESC
  LIMIT 1;

  IF FOUND THEN
    SELECT COUNT(*) INTO v_shop_openings_today
    FROM public.booster_openings bo
    WHERE bo.user_id = p_user_id
      AND bo.type = 'SHOP'::public."OpeningType"
      AND bo.series_id = v_split.series_id
      AND (bo.created_at AT TIME ZONE 'UTC')::date = (now() AT TIME ZONE 'UTC')::date;

    v_shop_remaining := GREATEST(0, 5 - v_shop_openings_today);
  END IF;

  RETURN jsonb_build_object(
    'hasActiveSplit', FOUND,
    'activeSplitCode', v_split.series_code,
    'shopOpeningsToday', v_shop_openings_today,
    'shopRemainingToday', v_shop_remaining
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.open_booster(
  p_booster_id uuid,
  p_user_id uuid DEFAULT auth.uid(),
  p_target_series_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booster RECORD;
  v_openings_today int := 0;
  v_active_split RECORD;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated user';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'You can only open boosters for yourself';
  END IF;

  SELECT id, series_id, type, price_pc, is_daily_only, drop_rates
  INTO v_booster
  FROM public.boosters
  WHERE id = p_booster_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booster not found';
  END IF;

  IF v_booster.is_daily_only THEN
    RAISE EXCEPTION 'Daily-only booster cannot be opened from shop';
  END IF;

  SELECT ss.id, ss.series_id, ss.starts_at, ss.ends_at
  INTO v_active_split
  FROM public.series_splits ss
  WHERE now() >= ss.starts_at
    AND now() < ss.ends_at
  ORDER BY ss.starts_at DESC
  LIMIT 1;

  IF FOUND AND v_active_split.series_id = v_booster.series_id THEN
    SELECT COUNT(*) INTO v_openings_today
    FROM public.booster_openings bo
    WHERE bo.user_id = p_user_id
      AND bo.type = 'SHOP'::public."OpeningType"
      AND bo.series_id = v_booster.series_id
      AND (bo.created_at AT TIME ZONE 'UTC')::date = (now() AT TIME ZONE 'UTC')::date;

    IF v_openings_today >= 5 THEN
      RAISE EXCEPTION 'Limite atteinte: 5 achats de boosters de la série en cours par jour.';
    END IF;
  END IF;

  RETURN public._resolve_booster_opening(
    p_booster_id,
    p_user_id,
    'SHOP'::public."OpeningType",
    true,
    p_target_series_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_opening_limits(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.open_booster(uuid, uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_user_opening_limits(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_booster(uuid, uuid, uuid) TO authenticated;
