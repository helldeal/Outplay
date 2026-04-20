-- Add COMPLETER value to OpeningType enum.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'OpeningType'
      AND e.enumlabel = 'COMPLETER'
  ) THEN
    ALTER TYPE public."OpeningType" ADD VALUE 'COMPLETER';
  END IF;
END
$$;
