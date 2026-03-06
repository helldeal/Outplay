-- Achievements system: progress tracking, auto rewards, notifications and overview RPCs.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE n.nspname = 'public'
      AND t.typname = 'OpeningType'
      AND e.enumlabel = 'ACHIEVEMENT'
  ) THEN
    ALTER TYPE public."OpeningType" ADD VALUE 'ACHIEVEMENT';
  END IF;
END
$$;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS total_pc_earned bigint NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS title text;

ALTER TABLE public.booster_openings
ADD COLUMN IF NOT EXISTS duplicate_cards int NOT NULL DEFAULT 0;

ALTER TABLE public.login_streaks
ADD COLUMN IF NOT EXISTS total_claimed_days int NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.achievement_definitions (
  id uuid PRIMARY KEY DEFAULT public.generate_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  metric_key text NOT NULL,
  target_value numeric NOT NULL,
  reward_pc int NOT NULL DEFAULT 0,
  reward_booster_type public."BoosterType",
  reward_title text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  reward_granted_at timestamptz,
  notified_at timestamptz,
  seen_at timestamptz,
  reward_opening_id uuid,
  PRIMARY KEY (user_id, achievement_id),
  CONSTRAINT user_achievements_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE,
  CONSTRAINT user_achievements_achievement_id_fkey
    FOREIGN KEY (achievement_id)
    REFERENCES public.achievement_definitions(id)
    ON DELETE CASCADE,
  CONSTRAINT user_achievements_reward_opening_id_fkey
    FOREIGN KEY (reward_opening_id)
    REFERENCES public.booster_openings(id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS user_achievements_user_id_unlocked_idx
ON public.user_achievements (user_id, unlocked_at DESC);

CREATE INDEX IF NOT EXISTS user_achievements_user_id_notified_idx
ON public.user_achievements (user_id, notified_at);

ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS achievement_definitions_select_all ON public.achievement_definitions;
  DROP POLICY IF EXISTS user_achievements_select_own ON public.user_achievements;
  DROP POLICY IF EXISTS user_achievements_insert_own ON public.user_achievements;
  DROP POLICY IF EXISTS user_achievements_update_own ON public.user_achievements;

  CREATE POLICY achievement_definitions_select_all
  ON public.achievement_definitions
  FOR SELECT
  TO anon, authenticated
  USING (true);

  IF to_regprocedure('auth.uid()') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY user_achievements_select_own
      ON public.user_achievements
      FOR SELECT
      USING (auth.uid() = user_id);

      CREATE POLICY user_achievements_insert_own
      ON public.user_achievements
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);

      CREATE POLICY user_achievements_update_own
      ON public.user_achievements
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    $sql$;
  ELSE
    EXECUTE $sql$
      CREATE POLICY user_achievements_select_own
      ON public.user_achievements
      FOR SELECT
      USING (true);

      CREATE POLICY user_achievements_insert_own
      ON public.user_achievements
      FOR INSERT
      WITH CHECK (true);

      CREATE POLICY user_achievements_update_own
      ON public.user_achievements
      FOR UPDATE
      USING (true)
      WITH CHECK (true);
    $sql$;
  END IF;
END
$$;

GRANT SELECT ON public.achievement_definitions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_achievements TO authenticated;

INSERT INTO public.achievement_definitions (
  code, name, category, description, metric_key, target_value, reward_pc, reward_booster_type, reward_title
)
VALUES
  ('FIRST_CARD', 'First Card', 'Collection', 'Obtenir ta premiere carte', 'unique_cards', 1, 500, NULL, NULL),
  ('COLLECTOR_I', 'Collector I', 'Collection', 'Obtenir 10 cartes uniques', 'unique_cards', 10, 0, 'NORMAL', NULL),
  ('COLLECTOR_II', 'Collector II', 'Collection', 'Obtenir 25 cartes uniques', 'unique_cards', 25, 0, 'LUCK', NULL),
  ('COLLECTOR_III', 'Collector III', 'Collection', 'Obtenir 50 cartes uniques', 'unique_cards', 50, 1500, NULL, NULL),
  ('COLLECTOR_IV', 'Collector IV', 'Collection', 'Obtenir 100 cartes uniques', 'unique_cards', 100, 0, 'PREMIUM', NULL),
  ('COMPLETIONIST', 'Completionist', 'Collection', 'Completer une serie entiere', 'completed_series_count', 1, 3000, 'PREMIUM', NULL),
  ('ARCHIVIST', 'Archivist', 'Collection', 'Completer 3 series', 'completed_series_count', 3, 0, 'GODPACK', NULL),

  ('CHALLENGER_RISING', 'Challenger Rising', 'Rarete', 'Obtenir 10 Challenger', 'rarity_challenger', 10, 0, 'NORMAL', NULL),
  ('CHALLENGER_ELITE', 'Challenger Elite', 'Rarete', 'Obtenir 50 Challenger', 'rarity_challenger', 50, 0, 'LUCK', NULL),
  ('CHAMPION_RISING', 'Champion Rising', 'Rarete', 'Obtenir 5 Champion', 'rarity_champion', 5, 0, 'NORMAL', NULL),
  ('CHAMPION_ELITE', 'Champion Elite', 'Rarete', 'Obtenir 25 Champion', 'rarity_champion', 25, 0, 'PREMIUM', NULL),
  ('WORLD_CLASS', 'World Class', 'Rarete', 'Obtenir 5 World Class', 'rarity_world_class', 5, 0, 'LUCK', NULL),
  ('WORLD_CLASS_ELITE', 'World Class Elite', 'Rarete', 'Obtenir 20 World Class', 'rarity_world_class', 20, 0, 'PREMIUM', NULL),
  ('LEGEND_HUNTER', 'Legend Hunter', 'Rarete', 'Drop 1 Legends', 'rarity_legends', 1, 2000, 'PREMIUM', NULL),
  ('LEGEND_COLLECTOR', 'Legend Collector', 'Rarete', 'Drop 3 Legends', 'rarity_legends', 3, 0, 'GODPACK', NULL),
  ('LEGEND_ARCHIVE', 'Legend Archive', 'Rarete', 'Drop 10 Legends', 'rarity_legends', 10, 0, NULL, 'Legend Hunter'),

  ('PACK_OPENER_I', 'Pack Opener I', 'Booster', 'Ouvrir 10 boosters', 'booster_opened_count', 10, 500, NULL, NULL),
  ('PACK_OPENER_II', 'Pack Opener II', 'Booster', 'Ouvrir 50 boosters', 'booster_opened_count', 50, 0, 'NORMAL', NULL),
  ('PACK_OPENER_III', 'Pack Opener III', 'Booster', 'Ouvrir 100 boosters', 'booster_opened_count', 100, 0, 'LUCK', NULL),
  ('PACK_OPENER_IV', 'Pack Opener IV', 'Booster', 'Ouvrir 300 boosters', 'booster_opened_count', 300, 0, 'PREMIUM', NULL),
  ('PACK_MANIAC', 'Pack Maniac', 'Booster', 'Ouvrir 1000 boosters', 'booster_opened_count', 1000, 0, 'GODPACK', NULL),

  ('LUCKY_PULL', 'Lucky Pull', 'Chance', 'Drop Champion+ dans un booster Normal', 'normal_has_champion_plus', 1, 1000, NULL, NULL),
  ('INSANE_LUCK', 'Insane Luck', 'Chance', 'Drop World Class dans un booster Normal', 'normal_has_world_class', 1, 0, 'LUCK', NULL),
  ('LEGENDARY_MOMENT', 'Legendary Moment', 'Chance', 'Drop Legends', 'any_has_legends', 1, 0, 'PREMIUM', NULL),
  ('GOD_OF_LUCK', 'God of Luck', 'Chance', 'Drop Legends dans un booster Normal', 'normal_has_legends', 1, 0, 'GODPACK', NULL),

  ('FIRST_DUPLICATE', 'First Duplicate', 'Economy', 'Obtenir ton premier doublon', 'duplicate_cards_total', 1, 300, NULL, NULL),
  ('SCRAP_DEALER', 'Scrap Dealer', 'Economy', 'Recycler 10 cartes', 'duplicate_cards_total', 10, 0, 'NORMAL', NULL),
  ('PC_COLLECTOR', 'PC Collector', 'Economy', 'Accumuler 10 000 PC', 'total_pc_earned', 10000, 0, 'LUCK', NULL),
  ('PC_INVESTOR', 'PC Investor', 'Economy', 'Accumuler 50 000 PC', 'total_pc_earned', 50000, 0, 'PREMIUM', NULL),
  ('PC_TYCOON', 'PC Tycoon', 'Economy', 'Accumuler 200 000 PC', 'total_pc_earned', 200000, 0, 'GODPACK', NULL),

  ('DAILY_PLAYER', 'Daily Player', 'Activite', 'Ouvrir 7 daily boosters', 'daily_opened_count', 7, 0, 'LUCK', NULL),
  ('DEDICATED_FAN', 'Dedicated Fan', 'Activite', 'Ouvrir 30 daily boosters', 'daily_opened_count', 30, 0, 'PREMIUM', NULL),
  ('LOYAL_COLLECTOR', 'Loyal Collector', 'Activite', 'Connexion 7 jours consecutifs', 'login_streak_current_day', 7, 0, 'LUCK', NULL),
  ('ESPORT_ADDICT', 'Esport Addict', 'Activite', 'Connexion 30 jours', 'login_total_days', 30, 0, 'GODPACK', NULL),

  ('SERIES_STARTER', 'Series Starter', 'Serie', 'Completer 25% d''une serie', 'max_series_completion_pct', 25, 1000, NULL, NULL),
  ('SERIES_CHALLENGER', 'Series Challenger', 'Serie', 'Completer 50% d''une serie', 'max_series_completion_pct', 50, 0, 'LUCK', NULL),
  ('SERIES_CHAMPION', 'Series Champion', 'Serie', 'Completer 75% d''une serie', 'max_series_completion_pct', 75, 0, 'PREMIUM', NULL),
  ('SERIES_LEGEND', 'Series Legend', 'Serie', 'Completer 100% d''une serie', 'max_series_completion_pct', 100, 0, 'GODPACK', NULL),

  ('LEC_COLLECTOR', 'LEC Collector', 'Esport', 'Obtenir 10 joueurs League of Legends', 'lol_unique_cards', 10, 0, 'NORMAL', NULL),
  ('GLOBAL_TALENT', 'Global Talent', 'Esport', 'Obtenir 10 nationalites differentes', 'distinct_nationalities', 10, 0, 'LUCK', NULL),
  ('TEAM_BUILDER', 'Team Builder', 'Esport', 'Obtenir 10 equipes differentes', 'distinct_teams', 10, 1000, NULL, NULL),
  ('ROLE_MASTER', 'Role Master', 'Esport', 'Obtenir 5 roles differents', 'distinct_roles', 5, 0, 'NORMAL', NULL)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  metric_key = EXCLUDED.metric_key,
  target_value = EXCLUDED.target_value,
  reward_pc = EXCLUDED.reward_pc,
  reward_booster_type = EXCLUDED.reward_booster_type,
  reward_title = EXCLUDED.reward_title;

CREATE OR REPLACE FUNCTION public._achievement_metric(
  p_user_id uuid,
  p_metric_key text
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value numeric := 0;
BEGIN
  CASE p_metric_key
    WHEN 'unique_cards' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.user_cards uc
      WHERE uc.user_id = p_user_id;

    WHEN 'completed_series_count' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM (
        SELECT c.series_id
        FROM public.cards c
        LEFT JOIN public.user_cards uc
          ON uc.card_id = c.id
         AND uc.user_id = p_user_id
        GROUP BY c.series_id
        HAVING COUNT(*) = COUNT(uc.card_id)
      ) done;

    WHEN 'max_series_completion_pct' THEN
      SELECT COALESCE(MAX(pct), 0)::numeric INTO v_value
      FROM (
        SELECT
          CASE WHEN COUNT(*) = 0 THEN 0
            ELSE (COUNT(uc.card_id)::numeric / COUNT(*)::numeric) * 100
          END AS pct
        FROM public.cards c
        LEFT JOIN public.user_cards uc
          ON uc.card_id = c.id
         AND uc.user_id = p_user_id
        GROUP BY c.series_id
      ) ratios;

    WHEN 'rarity_challenger' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.user_cards uc
      JOIN public.cards c ON c.id = uc.card_id
      WHERE uc.user_id = p_user_id
        AND c.rarity = 'CHALLENGER'::public."Rarity";

    WHEN 'rarity_champion' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.user_cards uc
      JOIN public.cards c ON c.id = uc.card_id
      WHERE uc.user_id = p_user_id
        AND c.rarity = 'CHAMPION'::public."Rarity";

    WHEN 'rarity_world_class' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.user_cards uc
      JOIN public.cards c ON c.id = uc.card_id
      WHERE uc.user_id = p_user_id
        AND c.rarity = 'WORLD_CLASS'::public."Rarity";

    WHEN 'rarity_legends' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.user_cards uc
      JOIN public.cards c ON c.id = uc.card_id
      WHERE uc.user_id = p_user_id
        AND c.rarity = 'LEGENDS'::public."Rarity";

    WHEN 'booster_opened_count' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.booster_openings bo
      WHERE bo.user_id = p_user_id;

    WHEN 'normal_has_champion_plus' THEN
      SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM public.booster_openings bo
        JOIN public.boosters b ON b.id = bo.booster_id
        JOIN LATERAL jsonb_array_elements_text(bo.cards) AS drawn(card_id) ON true
        JOIN public.cards c ON c.id = drawn.card_id
        WHERE bo.user_id = p_user_id
          AND b.type = 'NORMAL'::public."BoosterType"
          AND c.rarity IN (
            'CHAMPION'::public."Rarity",
            'WORLD_CLASS'::public."Rarity",
            'LEGENDS'::public."Rarity"
          )
      ) THEN 1 ELSE 0 END INTO v_value;

    WHEN 'normal_has_world_class' THEN
      SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM public.booster_openings bo
        JOIN public.boosters b ON b.id = bo.booster_id
        JOIN LATERAL jsonb_array_elements_text(bo.cards) AS drawn(card_id) ON true
        JOIN public.cards c ON c.id = drawn.card_id
        WHERE bo.user_id = p_user_id
          AND b.type = 'NORMAL'::public."BoosterType"
          AND c.rarity IN (
            'WORLD_CLASS'::public."Rarity",
            'LEGENDS'::public."Rarity"
          )
      ) THEN 1 ELSE 0 END INTO v_value;

    WHEN 'any_has_legends' THEN
      SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM public.booster_openings bo
        JOIN LATERAL jsonb_array_elements_text(bo.cards) AS drawn(card_id) ON true
        JOIN public.cards c ON c.id = drawn.card_id
        WHERE bo.user_id = p_user_id
          AND c.rarity = 'LEGENDS'::public."Rarity"
      ) THEN 1 ELSE 0 END INTO v_value;

    WHEN 'normal_has_legends' THEN
      SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM public.booster_openings bo
        JOIN public.boosters b ON b.id = bo.booster_id
        JOIN LATERAL jsonb_array_elements_text(bo.cards) AS drawn(card_id) ON true
        JOIN public.cards c ON c.id = drawn.card_id
        WHERE bo.user_id = p_user_id
          AND b.type = 'NORMAL'::public."BoosterType"
          AND c.rarity = 'LEGENDS'::public."Rarity"
      ) THEN 1 ELSE 0 END INTO v_value;

    WHEN 'duplicate_cards_total' THEN
      SELECT COALESCE(SUM(bo.duplicate_cards), 0)::numeric INTO v_value
      FROM public.booster_openings bo
      WHERE bo.user_id = p_user_id;

    WHEN 'total_pc_earned' THEN
      SELECT COALESCE(u.total_pc_earned, 0)::numeric INTO v_value
      FROM public.users u
      WHERE u.id = p_user_id;

    WHEN 'daily_opened_count' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.booster_openings bo
      WHERE bo.user_id = p_user_id
        AND bo.type = 'DAILY'::public."OpeningType";

    WHEN 'login_streak_current_day' THEN
      SELECT COALESCE(ls.current_day, 0)::numeric INTO v_value
      FROM public.login_streaks ls
      WHERE ls.user_id = p_user_id;

    WHEN 'login_total_days' THEN
      SELECT COALESCE(ls.total_claimed_days, 0)::numeric INTO v_value
      FROM public.login_streaks ls
      WHERE ls.user_id = p_user_id;

    WHEN 'lol_unique_cards' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.user_cards uc
      JOIN public.cards c ON c.id = uc.card_id
      JOIN public.games g ON g.id = c.game_id
      WHERE uc.user_id = p_user_id
        AND g.slug = 'league-of-legends';

    WHEN 'distinct_nationalities' THEN
      SELECT COUNT(DISTINCT c.nationality_id)::numeric INTO v_value
      FROM public.user_cards uc
      JOIN public.cards c ON c.id = uc.card_id
      WHERE uc.user_id = p_user_id;

    WHEN 'distinct_teams' THEN
      SELECT COUNT(DISTINCT c.team_id)::numeric INTO v_value
      FROM public.user_cards uc
      JOIN public.cards c ON c.id = uc.card_id
      WHERE uc.user_id = p_user_id
        AND c.team_id IS NOT NULL;

    WHEN 'distinct_roles' THEN
      SELECT COUNT(DISTINCT c.role_id)::numeric INTO v_value
      FROM public.user_cards uc
      JOIN public.cards c ON c.id = uc.card_id
      WHERE uc.user_id = p_user_id
        AND c.role_id IS NOT NULL;

    ELSE
      v_value := 0;
  END CASE;

  RETURN COALESCE(v_value, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public._get_daily_target_series_code()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT s.code
  FROM public.boosters b
  JOIN public.series s ON s.id = b.series_id
  WHERE b.is_daily_only = true
  ORDER BY b.created_at ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public._resolve_reward_booster_id(
  p_booster_type public."BoosterType"
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_series_code text;
  v_booster_id uuid;
BEGIN
  v_series_code := public._get_daily_target_series_code();

  IF v_series_code IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT b.id
  INTO v_booster_id
  FROM public.boosters b
  JOIN public.series s ON s.id = b.series_id
  WHERE s.code = v_series_code
    AND b.type = p_booster_type
    AND (
      p_booster_type = 'GODPACK'::public."BoosterType"
      OR b.is_daily_only = false
    )
  LIMIT 1;

  RETURN v_booster_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.evaluate_achievements(
  p_user_id uuid
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unlocked_total int := 0;
  v_unlocked_in_pass int;
  v_new_achievement_id uuid;
  v_opening jsonb;
  v_opening_id uuid;
  v_booster_id uuid;
  v_metric numeric;
  v_reward_pc int;
  v_guard int;
  v_def RECORD;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO public.login_streaks (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  FOR v_guard IN 1..6 LOOP
    v_unlocked_in_pass := 0;

    FOR v_def IN
      SELECT ad.*
      FROM public.achievement_definitions ad
      LEFT JOIN public.user_achievements ua
        ON ua.achievement_id = ad.id
       AND ua.user_id = p_user_id
      WHERE ua.achievement_id IS NULL
      ORDER BY ad.created_at ASC
    LOOP
      v_metric := public._achievement_metric(p_user_id, v_def.metric_key);

      IF v_metric < v_def.target_value THEN
        CONTINUE;
      END IF;

      INSERT INTO public.user_achievements (
        user_id,
        achievement_id,
        unlocked_at
      )
      VALUES (p_user_id, v_def.id, now())
      ON CONFLICT (user_id, achievement_id) DO NOTHING
      RETURNING achievement_id INTO v_new_achievement_id;

      IF v_new_achievement_id IS NULL THEN
        CONTINUE;
      END IF;

      v_unlocked_in_pass := v_unlocked_in_pass + 1;
      v_unlocked_total := v_unlocked_total + 1;
      v_opening_id := NULL;

      v_reward_pc := COALESCE(v_def.reward_pc, 0);
      IF v_reward_pc > 0 THEN
        UPDATE public.users
        SET
          pc_balance = pc_balance + v_reward_pc,
          total_pc_earned = total_pc_earned + v_reward_pc
        WHERE id = p_user_id;
      END IF;

      IF v_def.reward_booster_type IS NOT NULL THEN
        v_booster_id := public._resolve_reward_booster_id(v_def.reward_booster_type);

        IF v_booster_id IS NOT NULL THEN
          v_opening := public._resolve_booster_opening(
            v_booster_id,
            p_user_id,
            'ACHIEVEMENT'::public."OpeningType",
            false
          );

          IF v_opening IS NOT NULL AND (v_opening ->> 'openingId') IS NOT NULL THEN
            v_opening_id := (v_opening ->> 'openingId')::uuid;
          END IF;
        END IF;
      END IF;

      IF v_def.reward_title IS NOT NULL THEN
        UPDATE public.users
        SET title = v_def.reward_title
        WHERE id = p_user_id;
      END IF;

      UPDATE public.user_achievements ua
      SET
        reward_granted_at = now(),
        reward_opening_id = v_opening_id
      WHERE ua.user_id = p_user_id
        AND ua.achievement_id = v_def.id;

      v_new_achievement_id := NULL;
    END LOOP;

    EXIT WHEN v_unlocked_in_pass = 0;
  END LOOP;

  RETURN v_unlocked_total;
END;
$$;

-- Replace streak claim internals to increment cumulative login days and trigger achievements.
CREATE OR REPLACE FUNCTION public._claim_login_streak_reward_internal(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_streak public.login_streaks%ROWTYPE;
  v_next_day int;
  v_reward_type text;
  v_reward_pc int;
  v_reward_booster_type public."BoosterType";
  v_daily_series_code text;
  v_reward_booster_id uuid;
  v_opening jsonb := NULL;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated user';
  END IF;

  INSERT INTO public.login_streaks (user_id, current_day)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT *
  INTO v_streak
  FROM public.login_streaks ls
  WHERE ls.user_id = p_user_id
  FOR UPDATE;

  IF v_streak.last_claim_date = v_today THEN
    RAISE EXCEPTION 'Login streak reward already claimed today';
  END IF;

  v_next_day := public._compute_login_streak_next_day(
    v_streak.current_day,
    v_streak.last_claim_date,
    v_today
  );

  SELECT reward_type, reward_pc, reward_booster_type
  INTO v_reward_type, v_reward_pc, v_reward_booster_type
  FROM public._login_streak_reward_for_day(v_next_day);

  IF v_reward_type = 'PC' THEN
    UPDATE public.users
    SET
      pc_balance = pc_balance + v_reward_pc,
      total_pc_earned = total_pc_earned + v_reward_pc
    WHERE id = p_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'User profile not found for %', p_user_id;
    END IF;
  ELSE
    SELECT s.code
    INTO v_daily_series_code
    FROM public.boosters b
    JOIN public.series s ON s.id = b.series_id
    WHERE b.is_daily_only = true
    ORDER BY b.created_at ASC
    LIMIT 1;

    IF v_daily_series_code IS NULL THEN
      RAISE EXCEPTION 'No daily target series found for streak booster rewards';
    END IF;

    SELECT b.id
    INTO v_reward_booster_id
    FROM public.boosters b
    JOIN public.series s ON s.id = b.series_id
    WHERE s.code = v_daily_series_code
      AND b.type = v_reward_booster_type
      AND b.is_daily_only = false
    LIMIT 1;

    IF v_reward_booster_id IS NULL THEN
      RAISE EXCEPTION
        'No % booster found for daily target series %',
        v_reward_booster_type,
        v_daily_series_code;
    END IF;

    v_opening := public._resolve_booster_opening(
      v_reward_booster_id,
      p_user_id,
      'STREAK'::public."OpeningType",
      false
    );
  END IF;

  UPDATE public.login_streaks
  SET
    current_day = v_next_day,
    last_claim_date = v_today,
    total_claimed_days = total_claimed_days + 1,
    updated_at = now()
  WHERE user_id = p_user_id;

  PERFORM public.evaluate_achievements(p_user_id);

  RETURN jsonb_build_object(
    'day', v_next_day,
    'rewardType', v_reward_type,
    'pcGained', v_reward_pc,
    'boosterType', v_reward_booster_type,
    'opening', v_opening
  );
END;
$$;

-- Replace booster resolver to persist duplicate count, track total PC earned and evaluate achievements.
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
  v_duplicate_cards int := 0;
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

  IF p_opening_type = 'SHOP'::public."OpeningType" AND v_booster.is_daily_only THEN
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
      v_duplicate_cards := v_duplicate_cards + 1;
    ELSE
      INSERT INTO public.user_cards (user_id, card_id, obtained_at)
      VALUES (p_user_id, v_card_id, now());
    END IF;
  END LOOP;

  IF v_total_pc_gained > 0 THEN
    UPDATE public.users
    SET
      pc_balance = pc_balance + v_total_pc_gained,
      total_pc_earned = total_pc_earned + v_total_pc_gained
    WHERE id = p_user_id;
  END IF;

  INSERT INTO public.booster_openings (
    user_id,
    booster_id,
    series_id,
    cards,
    pc_gained,
    type,
    duplicate_cards,
    created_at
  )
  VALUES (
    p_user_id,
    v_booster.id,
    v_booster.series_id,
    to_jsonb(v_cards),
    v_total_pc_gained,
    p_opening_type,
    v_duplicate_cards,
    now()
  )
  RETURNING id INTO v_opening_id;

  PERFORM public.evaluate_achievements(p_user_id);

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

CREATE OR REPLACE FUNCTION public._build_achievement_reward_label(
  p_reward_pc int,
  p_reward_booster_type public."BoosterType",
  p_reward_title text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF COALESCE(p_reward_pc, 0) > 0 AND p_reward_booster_type IS NOT NULL THEN
    RETURN p_reward_booster_type::text || ' Booster + ' || p_reward_pc::text || ' PC';
  END IF;

  IF p_reward_booster_type IS NOT NULL THEN
    RETURN p_reward_booster_type::text || ' Booster';
  END IF;

  IF COALESCE(p_reward_pc, 0) > 0 THEN
    RETURN p_reward_pc::text || ' PC';
  END IF;

  IF p_reward_title IS NOT NULL THEN
    RETURN 'Titre: ' || p_reward_title;
  END IF;

  RETURN 'Reward';
END;
$$;

DO $$
BEGIN
  IF to_regprocedure('auth.uid()') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.get_achievements_progress(
        p_user_id uuid DEFAULT auth.uid()
      )
      RETURNS TABLE (
        achievement_id uuid,
        code text,
        name text,
        category text,
        description text,
        target_value numeric,
        current_value numeric,
        progress_pct int,
        unlocked boolean,
        unlocked_at timestamptz,
        reward_label text,
        reward_pc int,
        reward_booster_type public."BoosterType",
        reward_title text,
        seen boolean
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $fn$
      BEGIN
        IF p_user_id IS NULL THEN
          RAISE EXCEPTION 'Unauthenticated user';
        END IF;

        IF auth.uid() IS DISTINCT FROM p_user_id THEN
          RAISE EXCEPTION 'You can only access your own achievements';
        END IF;

        PERFORM public.evaluate_achievements(p_user_id);

        RETURN QUERY
        SELECT
          ad.id AS achievement_id,
          ad.code,
          ad.name,
          ad.category,
          ad.description,
          ad.target_value,
          metrics.current_value,
          LEAST(
            100,
            FLOOR(
              CASE
                WHEN ad.target_value <= 0 THEN 0
                ELSE (metrics.current_value / ad.target_value) * 100
              END
            )::int
          ) AS progress_pct,
          (ua.achievement_id IS NOT NULL) AS unlocked,
          ua.unlocked_at,
          public._build_achievement_reward_label(ad.reward_pc, ad.reward_booster_type, ad.reward_title) AS reward_label,
          ad.reward_pc,
          ad.reward_booster_type,
          ad.reward_title,
          (ua.seen_at IS NOT NULL) AS seen
        FROM public.achievement_definitions ad
        LEFT JOIN public.user_achievements ua
          ON ua.achievement_id = ad.id
         AND ua.user_id = p_user_id
        CROSS JOIN LATERAL (
          SELECT public._achievement_metric(p_user_id, ad.metric_key) AS current_value
        ) metrics
        ORDER BY ad.category ASC, ad.created_at ASC;
      END;
      $fn$;
    $sql$;

    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.get_achievement_unseen_count(
        p_user_id uuid DEFAULT auth.uid()
      )
      RETURNS int
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $fn$
      DECLARE
        v_count int;
      BEGIN
        IF p_user_id IS NULL THEN
          RAISE EXCEPTION 'Unauthenticated user';
        END IF;

        IF auth.uid() IS DISTINCT FROM p_user_id THEN
          RAISE EXCEPTION 'You can only access your own achievements';
        END IF;

        PERFORM public.evaluate_achievements(p_user_id);

        SELECT COUNT(*)::int
        INTO v_count
        FROM public.user_achievements ua
        WHERE ua.user_id = p_user_id
          AND ua.seen_at IS NULL;

        RETURN COALESCE(v_count, 0);
      END;
      $fn$;
    $sql$;

    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.pull_achievement_notifications(
        p_user_id uuid DEFAULT auth.uid(),
        p_limit int DEFAULT 6
      )
      RETURNS TABLE (
        code text,
        name text,
        category text,
        unlocked_at timestamptz,
        reward_label text
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $fn$
      BEGIN
        IF p_user_id IS NULL THEN
          RAISE EXCEPTION 'Unauthenticated user';
        END IF;

        IF auth.uid() IS DISTINCT FROM p_user_id THEN
          RAISE EXCEPTION 'You can only access your own achievements';
        END IF;

        PERFORM public.evaluate_achievements(p_user_id);

        RETURN QUERY
        WITH picked AS (
          SELECT ua.user_id, ua.achievement_id
          FROM public.user_achievements ua
          WHERE ua.user_id = p_user_id
            AND ua.notified_at IS NULL
          ORDER BY ua.unlocked_at DESC
          LIMIT GREATEST(1, LEAST(p_limit, 20))
        ), marked AS (
          UPDATE public.user_achievements ua
          SET notified_at = now()
          FROM picked
          WHERE ua.user_id = picked.user_id
            AND ua.achievement_id = picked.achievement_id
          RETURNING ua.achievement_id, ua.unlocked_at
        )
        SELECT
          ad.code,
          ad.name,
          ad.category,
          m.unlocked_at,
          public._build_achievement_reward_label(ad.reward_pc, ad.reward_booster_type, ad.reward_title) AS reward_label
        FROM marked m
        JOIN public.achievement_definitions ad ON ad.id = m.achievement_id
        ORDER BY m.unlocked_at ASC;
      END;
      $fn$;
    $sql$;

    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.mark_achievements_seen(
        p_user_id uuid DEFAULT auth.uid()
      )
      RETURNS int
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $fn$
      DECLARE
        v_updated int := 0;
      BEGIN
        IF p_user_id IS NULL THEN
          RAISE EXCEPTION 'Unauthenticated user';
        END IF;

        IF auth.uid() IS DISTINCT FROM p_user_id THEN
          RAISE EXCEPTION 'You can only access your own achievements';
        END IF;

        UPDATE public.user_achievements ua
        SET seen_at = now()
        WHERE ua.user_id = p_user_id
          AND ua.seen_at IS NULL;

        GET DIAGNOSTICS v_updated = ROW_COUNT;
        RETURN v_updated;
      END;
      $fn$;
    $sql$;
  ELSE
    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.get_achievements_progress(
        p_user_id uuid
      )
      RETURNS TABLE (
        achievement_id uuid,
        code text,
        name text,
        category text,
        description text,
        target_value numeric,
        current_value numeric,
        progress_pct int,
        unlocked boolean,
        unlocked_at timestamptz,
        reward_label text,
        reward_pc int,
        reward_booster_type public."BoosterType",
        reward_title text,
        seen boolean
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $fn$
      BEGIN
        PERFORM public.evaluate_achievements(p_user_id);

        RETURN QUERY
        SELECT
          ad.id AS achievement_id,
          ad.code,
          ad.name,
          ad.category,
          ad.description,
          ad.target_value,
          metrics.current_value,
          LEAST(
            100,
            FLOOR(
              CASE
                WHEN ad.target_value <= 0 THEN 0
                ELSE (metrics.current_value / ad.target_value) * 100
              END
            )::int
          ) AS progress_pct,
          (ua.achievement_id IS NOT NULL) AS unlocked,
          ua.unlocked_at,
          public._build_achievement_reward_label(ad.reward_pc, ad.reward_booster_type, ad.reward_title) AS reward_label,
          ad.reward_pc,
          ad.reward_booster_type,
          ad.reward_title,
          (ua.seen_at IS NOT NULL) AS seen
        FROM public.achievement_definitions ad
        LEFT JOIN public.user_achievements ua
          ON ua.achievement_id = ad.id
         AND ua.user_id = p_user_id
        CROSS JOIN LATERAL (
          SELECT public._achievement_metric(p_user_id, ad.metric_key) AS current_value
        ) metrics
        ORDER BY ad.category ASC, ad.created_at ASC;
      END;
      $fn$;
    $sql$;

    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.get_achievement_unseen_count(
        p_user_id uuid
      )
      RETURNS int
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $fn$
      DECLARE
        v_count int;
      BEGIN
        PERFORM public.evaluate_achievements(p_user_id);

        SELECT COUNT(*)::int
        INTO v_count
        FROM public.user_achievements ua
        WHERE ua.user_id = p_user_id
          AND ua.seen_at IS NULL;

        RETURN COALESCE(v_count, 0);
      END;
      $fn$;
    $sql$;

    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.pull_achievement_notifications(
        p_user_id uuid,
        p_limit int DEFAULT 6
      )
      RETURNS TABLE (
        code text,
        name text,
        category text,
        unlocked_at timestamptz,
        reward_label text
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $fn$
      BEGIN
        PERFORM public.evaluate_achievements(p_user_id);

        RETURN QUERY
        WITH picked AS (
          SELECT ua.user_id, ua.achievement_id
          FROM public.user_achievements ua
          WHERE ua.user_id = p_user_id
            AND ua.notified_at IS NULL
          ORDER BY ua.unlocked_at DESC
          LIMIT GREATEST(1, LEAST(p_limit, 20))
        ), marked AS (
          UPDATE public.user_achievements ua
          SET notified_at = now()
          FROM picked
          WHERE ua.user_id = picked.user_id
            AND ua.achievement_id = picked.achievement_id
          RETURNING ua.achievement_id, ua.unlocked_at
        )
        SELECT
          ad.code,
          ad.name,
          ad.category,
          m.unlocked_at,
          public._build_achievement_reward_label(ad.reward_pc, ad.reward_booster_type, ad.reward_title) AS reward_label
        FROM marked m
        JOIN public.achievement_definitions ad ON ad.id = m.achievement_id
        ORDER BY m.unlocked_at ASC;
      END;
      $fn$;
    $sql$;

    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.mark_achievements_seen(
        p_user_id uuid
      )
      RETURNS int
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $fn$
      DECLARE
        v_updated int := 0;
      BEGIN
        UPDATE public.user_achievements ua
        SET seen_at = now()
        WHERE ua.user_id = p_user_id
          AND ua.seen_at IS NULL;

        GET DIAGNOSTICS v_updated = ROW_COUNT;
        RETURN v_updated;
      END;
      $fn$;
    $sql$;
  END IF;
END
$$;

GRANT EXECUTE ON FUNCTION public.evaluate_achievements(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_achievements_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_achievement_unseen_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pull_achievement_notifications(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_achievements_seen(uuid) TO authenticated;
