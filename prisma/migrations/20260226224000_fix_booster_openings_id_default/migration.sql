-- Fix null id insertions in booster_openings from RPC.
-- Ensure UUID generation is always available and applied on insert.

DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;
END
$$;

CREATE OR REPLACE FUNCTION public.generate_uuid()
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_uuid uuid;
  v_hash text;
BEGIN
  BEGIN
    EXECUTE 'SELECT gen_random_uuid()' INTO v_uuid;
  EXCEPTION
    WHEN undefined_function THEN
      BEGIN
        EXECUTE 'SELECT uuid_generate_v4()' INTO v_uuid;
      EXCEPTION
        WHEN undefined_function THEN
          v_hash := md5(random()::text || clock_timestamp()::text || random()::text);
          v_uuid := (
            substr(v_hash, 1, 8) || '-' ||
            substr(v_hash, 9, 4) || '-' ||
            '4' || substr(v_hash, 14, 3) || '-' ||
            substr('89ab', floor(random() * 4)::int + 1, 1) || substr(v_hash, 18, 3) || '-' ||
            substr(v_hash, 21, 12)
          )::uuid;
      END;
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
