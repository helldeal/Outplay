-- Set S1 as the default target series for all users without a target series.

UPDATE public.users
SET target_series_id = (
  SELECT id FROM public.series WHERE code = 'S1' LIMIT 1
)
WHERE target_series_id IS NULL;
