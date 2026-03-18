-- Add target series support for booster openings (achievements, daily, streak)
-- Allows users to specify which series they're targeting when opening boosters

ALTER TABLE public.booster_openings
ADD COLUMN target_series_id uuid;

-- Add foreign key constraint
ALTER TABLE public.booster_openings
ADD CONSTRAINT booster_openings_target_series_fk
FOREIGN KEY (target_series_id) REFERENCES public.series(id) ON DELETE SET NULL;

-- Create index for efficient lookups by target series
CREATE INDEX booster_openings_target_series_id_idx ON public.booster_openings(target_series_id);
