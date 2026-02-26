-- Fix null id insertions in booster_openings from RPC.
-- Ensure UUID generation is always available and applied on insert.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.generate_uuid()
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_uuid uuid;
BEGIN
  BEGIN
    EXECUTE 'SELECT gen_random_uuid()' INTO v_uuid;
  EXCEPTION
    WHEN undefined_function THEN
      EXECUTE 'SELECT extensions.gen_random_uuid()' INTO v_uuid;
  END;

  RETURN v_uuid;
END;
$$;

ALTER TABLE public.booster_openings
ALTER COLUMN id SET DEFAULT public.generate_uuid();

CREATE OR REPLACE FUNCTION public.booster_openings_set_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := public.generate_uuid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booster_openings_set_id ON public.booster_openings;
CREATE TRIGGER trg_booster_openings_set_id
BEFORE INSERT ON public.booster_openings
FOR EACH ROW
EXECUTE FUNCTION public.booster_openings_set_id();
