-- OUTPLAY Supabase hardening
-- Run after: prisma migrate dev

-- 0) Compatibility patch for existing Supabase projects
DO $$
BEGIN
  CREATE TYPE public."OpeningType" AS ENUM ('SHOP', 'DAILY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS pc_balance integer NOT NULL DEFAULT 0;

ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS pc_value integer NOT NULL DEFAULT 0;

ALTER TABLE public.boosters
ADD COLUMN IF NOT EXISTS price_pc integer NOT NULL DEFAULT 0;

ALTER TABLE public.booster_openings
ADD COLUMN IF NOT EXISTS pc_gained integer NOT NULL DEFAULT 0;

ALTER TABLE public.booster_openings
ADD COLUMN IF NOT EXISTS type public."OpeningType" NOT NULL DEFAULT 'SHOP';

ALTER TABLE public.user_cards
ADD COLUMN IF NOT EXISTS obtained_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.cards
DROP COLUMN IF EXISTS number;

-- 1) Link public.users to auth.users (Discord Auth via Supabase Auth)
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_id_fkey;

ALTER TABLE public.users
ADD CONSTRAINT users_id_fkey
FOREIGN KEY (id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 2) Business rule: one LEGENDS card max per series
CREATE UNIQUE INDEX IF NOT EXISTS cards_one_legends_per_series_idx
ON public.cards (series_id)
WHERE rarity = 'LEGENDS';

-- 3) Booster drop rates are immutable after creation
CREATE OR REPLACE FUNCTION public.prevent_booster_drop_rates_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.drop_rates IS DISTINCT FROM OLD.drop_rates THEN
    RAISE EXCEPTION 'drop_rates is immutable and cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_booster_drop_rates_update ON public.boosters;
CREATE TRIGGER trg_prevent_booster_drop_rates_update
BEFORE UPDATE ON public.boosters
FOR EACH ROW
EXECUTE FUNCTION public.prevent_booster_drop_rates_update();

-- 4) RLS required tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booster_openings ENABLE ROW LEVEL SECURITY;

-- 5) Policies: user can only access own records
DROP POLICY IF EXISTS users_select_own ON public.users;
CREATE POLICY users_select_own
ON public.users
FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS users_insert_own ON public.users;
CREATE POLICY users_insert_own
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS user_cards_select_own ON public.user_cards;
CREATE POLICY user_cards_select_own
ON public.user_cards
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_cards_insert_own ON public.user_cards;
CREATE POLICY user_cards_insert_own
ON public.user_cards
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_cards_update_own ON public.user_cards;
CREATE POLICY user_cards_update_own
ON public.user_cards
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS booster_openings_select_own ON public.booster_openings;
CREATE POLICY booster_openings_select_own
ON public.booster_openings
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS booster_openings_insert_own ON public.booster_openings;
CREATE POLICY booster_openings_insert_own
ON public.booster_openings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 6) Server-side opening logic (economy + duplicates conversion)
-- IMPORTANT: keep economic randomness server-side only.
CREATE OR REPLACE FUNCTION public._resolve_booster_opening(
  p_booster_id uuid,
  p_user_id uuid,
  p_opening_type public."OpeningType",
  p_charge_price boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booster RECORD;
  v_opening_id uuid;
  v_cards text[] := ARRAY[]::text[];
  v_draw_count int := 5;
  v_total_pc_gained int := 0;
  v_roll numeric;
  v_pick_rarity text;
  v_card_id text;
  v_card_value int;
  v_already_owned boolean;
  v_charged_pc int := 0;
  i int;
  p_legends numeric;
  p_world_class numeric;
  p_champion numeric;
  p_challenger numeric;
BEGIN
  SELECT id, series_id, type, price_pc, is_daily_only, drop_rates
  INTO v_booster
  FROM public.boosters
  WHERE id = p_booster_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booster not found';
  END IF;

  IF p_opening_type = 'SHOP' AND v_booster.is_daily_only THEN
    RAISE EXCEPTION 'Daily-only booster cannot be opened from shop';
  END IF;

  IF p_charge_price AND v_booster.price_pc > 0 THEN
    UPDATE public.users
    SET pc_balance = pc_balance - v_booster.price_pc
    WHERE id = p_user_id
      AND pc_balance >= v_booster.price_pc;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient PC balance';
    END IF;

    v_charged_pc := v_booster.price_pc;
  END IF;

  p_legends := COALESCE((v_booster.drop_rates ->> 'LEGENDS')::numeric, 0);
  p_world_class := COALESCE((v_booster.drop_rates ->> 'WORLD_CLASS')::numeric, 0);
  p_champion := COALESCE((v_booster.drop_rates ->> 'CHAMPION')::numeric, 0);
  p_challenger := COALESCE((v_booster.drop_rates ->> 'CHALLENGER')::numeric, 0);

  FOR i IN 1..v_draw_count LOOP
    v_roll := random() * 100;

    IF v_roll < p_legends THEN
      v_pick_rarity := 'LEGENDS';
    ELSIF v_roll < p_legends + p_world_class THEN
      v_pick_rarity := 'WORLD_CLASS';
    ELSIF v_roll < p_legends + p_world_class + p_champion THEN
      v_pick_rarity := 'CHAMPION';
    ELSIF v_roll < p_legends + p_world_class + p_champion + p_challenger THEN
      v_pick_rarity := 'CHALLENGER';
    ELSE
      v_pick_rarity := 'ROOKIE';
    END IF;

    SELECT c.id, c.pc_value
    INTO v_card_id, v_card_value
    FROM public.cards c
    WHERE c.series_id = v_booster.series_id
      AND c.rarity = v_pick_rarity::public."Rarity"
    ORDER BY random()
    LIMIT 1;

    IF v_card_id IS NULL THEN
      SELECT c.id, c.pc_value
      INTO v_card_id, v_card_value
      FROM public.cards c
      WHERE c.series_id = v_booster.series_id
      ORDER BY random()
      LIMIT 1;
    END IF;

    v_cards := array_append(v_cards, v_card_id);

    SELECT EXISTS (
      SELECT 1
      FROM public.user_cards uc
      WHERE uc.user_id = p_user_id
        AND uc.card_id = v_card_id
    )
    INTO v_already_owned;

    IF v_already_owned THEN
      v_total_pc_gained := v_total_pc_gained + COALESCE(v_card_value, 0);
    ELSE
      INSERT INTO public.user_cards (user_id, card_id, obtained_at)
      VALUES (p_user_id, v_card_id, now());
    END IF;
  END LOOP;

  IF v_total_pc_gained > 0 THEN
    UPDATE public.users
    SET pc_balance = pc_balance + v_total_pc_gained
    WHERE id = p_user_id;
  END IF;

  INSERT INTO public.booster_openings (
    user_id,
    booster_id,
    series_id,
    cards,
    pc_gained,
    type,
    created_at
  )
  VALUES (
    p_user_id,
    v_booster.id,
    v_booster.series_id,
    to_jsonb(v_cards),
    v_total_pc_gained,
    p_opening_type,
    now()
  )
  RETURNING id INTO v_opening_id;

  RETURN jsonb_build_object(
    'openingId', v_opening_id,
    'boosterId', v_booster.id,
    'seriesId', v_booster.series_id,
    'cards', to_jsonb(v_cards),
    'pcGained', v_total_pc_gained,
    'chargedPc', v_charged_pc,
    'type', p_opening_type
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.open_booster(
  p_booster_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated user';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'You can only open boosters for yourself';
  END IF;

  RETURN public._resolve_booster_opening(
    p_booster_id,
    p_user_id,
    'SHOP'::public."OpeningType",
    true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.open_daily_booster(
  p_series_code text,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booster_id uuid;
  v_today_daily_exists boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated user';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'You can only open boosters for yourself';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.booster_openings bo
    WHERE bo.user_id = p_user_id
      AND bo.type = 'DAILY'::public."OpeningType"
      AND (bo.created_at AT TIME ZONE 'UTC')::date = (now() AT TIME ZONE 'UTC')::date
  )
  INTO v_today_daily_exists;

  IF v_today_daily_exists THEN
    RAISE EXCEPTION 'Daily booster already opened today';
  END IF;

  IF random() < 0.01 THEN
    SELECT b.id
    INTO v_booster_id
    FROM public.boosters b
    JOIN public.series s ON s.id = b.series_id
    WHERE s.code = p_series_code
      AND b.type = 'GODPACK'::public."BoosterType"
    LIMIT 1;
  ELSE
    SELECT b.id
    INTO v_booster_id
    FROM public.boosters b
    JOIN public.series s ON s.id = b.series_id
    WHERE s.code = p_series_code
      AND b.type = 'NORMAL'::public."BoosterType"
    LIMIT 1;
  END IF;

  IF v_booster_id IS NULL THEN
    RAISE EXCEPTION 'No daily-eligible booster found for series %', p_series_code;
  END IF;

  RETURN public._resolve_booster_opening(
    v_booster_id,
    p_user_id,
    'DAILY'::public."OpeningType",
    false
  );
END;
$$;

REVOKE ALL ON FUNCTION public._resolve_booster_opening(uuid, uuid, public."OpeningType", boolean) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.open_booster(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.open_daily_booster(text, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.open_booster(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_daily_booster(text, uuid) TO authenticated;

-- 7) Optional helper: create storage bucket for assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;
