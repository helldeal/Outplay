-- Add target series preference to users
-- Allows users to specify which series they want to target for booster rewards

ALTER TABLE public.users
ADD COLUMN target_series_id uuid;

-- Add foreign key constraint
ALTER TABLE public.users
ADD CONSTRAINT users_target_series_id_fk
FOREIGN KEY (target_series_id) REFERENCES public.series(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX users_target_series_id_idx ON public.users(target_series_id);
