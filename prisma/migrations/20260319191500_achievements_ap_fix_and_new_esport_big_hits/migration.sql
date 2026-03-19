-- Delta migration: AP visibility fixes, leaderboard points rebalance,
-- esport achievements (Valorant/CoD/CS), and Big Hit III/IV.

ALTER TABLE public.achievement_definitions
ADD COLUMN IF NOT EXISTS leaderboard_points int NOT NULL DEFAULT 0;

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

    WHEN 's2_unique_cards' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.user_cards uc
      JOIN public.cards c ON c.id = uc.card_id
      JOIN public.series s ON s.id = c.series_id
      WHERE uc.user_id = p_user_id
        AND s.code = 'S2';

    WHEN 's2_completion_pct' THEN
      SELECT COALESCE(
        CASE
          WHEN COUNT(*) = 0 THEN 0
          ELSE (COUNT(uc.card_id)::numeric / COUNT(*)::numeric) * 100
        END,
        0
      )::numeric INTO v_value
      FROM public.cards c
      JOIN public.series s ON s.id = c.series_id
      LEFT JOIN public.user_cards uc
        ON uc.card_id = c.id
       AND uc.user_id = p_user_id
      WHERE s.code = 'S2';

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

    WHEN 'booster_opened_normal_count' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.booster_openings bo
      JOIN public.boosters b ON b.id = bo.booster_id
      WHERE bo.user_id = p_user_id
        AND b.type = 'NORMAL'::public."BoosterType";

    WHEN 'booster_opened_luck_count' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.booster_openings bo
      JOIN public.boosters b ON b.id = bo.booster_id
      WHERE bo.user_id = p_user_id
        AND b.type = 'LUCK'::public."BoosterType";

    WHEN 'booster_opened_premium_count' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.booster_openings bo
      JOIN public.boosters b ON b.id = bo.booster_id
      WHERE bo.user_id = p_user_id
        AND b.type = 'PREMIUM'::public."BoosterType";

    WHEN 'booster_opened_godpack_count' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.booster_openings bo
      JOIN public.boosters b ON b.id = bo.booster_id
      WHERE bo.user_id = p_user_id
        AND b.type = 'GODPACK'::public."BoosterType";

    WHEN 'shop_opened_count' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.booster_openings bo
      WHERE bo.user_id = p_user_id
        AND bo.type = 'SHOP'::public."OpeningType";

    WHEN 'streak_opened_count' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.booster_openings bo
      WHERE bo.user_id = p_user_id
        AND bo.type = 'STREAK'::public."OpeningType";

    WHEN 'achievement_opened_count' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.booster_openings bo
      WHERE bo.user_id = p_user_id
        AND bo.type = 'ACHIEVEMENT'::public."OpeningType";

    WHEN 'normal_has_champion_plus' THEN
      SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM public.booster_openings bo
        JOIN public.boosters b ON b.id = bo.booster_id
        JOIN LATERAL jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
            ELSE '[]'::jsonb
          END
        ) AS drawn(card_id) ON true
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
        JOIN LATERAL jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
            ELSE '[]'::jsonb
          END
        ) AS drawn(card_id) ON true
        JOIN public.cards c ON c.id = drawn.card_id
        WHERE bo.user_id = p_user_id
          AND b.type = 'NORMAL'::public."BoosterType"
          AND c.rarity IN ('WORLD_CLASS'::public."Rarity", 'LEGENDS'::public."Rarity")
      ) THEN 1 ELSE 0 END INTO v_value;

    WHEN 'any_has_legends' THEN
      SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM public.booster_openings bo
        JOIN LATERAL jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
            ELSE '[]'::jsonb
          END
        ) AS drawn(card_id) ON true
        JOIN public.cards c ON c.id = drawn.card_id
        WHERE bo.user_id = p_user_id
          AND c.rarity = 'LEGENDS'::public."Rarity"
      ) THEN 1 ELSE 0 END INTO v_value;

    WHEN 'normal_has_legends' THEN
      SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM public.booster_openings bo
        JOIN public.boosters b ON b.id = bo.booster_id
        JOIN LATERAL jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
            ELSE '[]'::jsonb
          END
        ) AS drawn(card_id) ON true
        JOIN public.cards c ON c.id = drawn.card_id
        WHERE bo.user_id = p_user_id
          AND b.type = 'NORMAL'::public."BoosterType"
          AND c.rarity = 'LEGENDS'::public."Rarity"
      ) THEN 1 ELSE 0 END INTO v_value;

    WHEN 'normal_champion_plus_drops_total' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.booster_openings bo
      JOIN public.boosters b ON b.id = bo.booster_id
      JOIN LATERAL jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
          ELSE '[]'::jsonb
        END
      ) AS drawn(card_id) ON true
      JOIN public.cards c ON c.id = drawn.card_id
      WHERE bo.user_id = p_user_id
        AND b.type = 'NORMAL'::public."BoosterType"
        AND c.rarity IN ('CHAMPION'::public."Rarity", 'WORLD_CLASS'::public."Rarity", 'LEGENDS'::public."Rarity");

    WHEN 'normal_world_class_plus_drops_total' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.booster_openings bo
      JOIN public.boosters b ON b.id = bo.booster_id
      JOIN LATERAL jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
          ELSE '[]'::jsonb
        END
      ) AS drawn(card_id) ON true
      JOIN public.cards c ON c.id = drawn.card_id
      WHERE bo.user_id = p_user_id
        AND b.type = 'NORMAL'::public."BoosterType"
        AND c.rarity IN ('WORLD_CLASS'::public."Rarity", 'LEGENDS'::public."Rarity");

    WHEN 'luck_world_class_plus_drops_total' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.booster_openings bo
      JOIN public.boosters b ON b.id = bo.booster_id
      JOIN LATERAL jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
          ELSE '[]'::jsonb
        END
      ) AS drawn(card_id) ON true
      JOIN public.cards c ON c.id = drawn.card_id
      WHERE bo.user_id = p_user_id
        AND b.type = 'LUCK'::public."BoosterType"
        AND c.rarity IN ('WORLD_CLASS'::public."Rarity", 'LEGENDS'::public."Rarity");

    WHEN 'premium_world_class_plus_drops_total' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.booster_openings bo
      JOIN public.boosters b ON b.id = bo.booster_id
      JOIN LATERAL jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
          ELSE '[]'::jsonb
        END
      ) AS drawn(card_id) ON true
      JOIN public.cards c ON c.id = drawn.card_id
      WHERE bo.user_id = p_user_id
        AND b.type = 'PREMIUM'::public."BoosterType"
        AND c.rarity IN ('WORLD_CLASS'::public."Rarity", 'LEGENDS'::public."Rarity");

    WHEN 'premium_legends_drops_total' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.booster_openings bo
      JOIN public.boosters b ON b.id = bo.booster_id
      JOIN LATERAL jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
          ELSE '[]'::jsonb
        END
      ) AS drawn(card_id) ON true
      JOIN public.cards c ON c.id = drawn.card_id
      WHERE bo.user_id = p_user_id
        AND b.type = 'PREMIUM'::public."BoosterType"
        AND c.rarity = 'LEGENDS'::public."Rarity";

    WHEN 'legends_drops_total' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.booster_openings bo
      JOIN LATERAL jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
          ELSE '[]'::jsonb
        END
      ) AS drawn(card_id) ON true
      JOIN public.cards c ON c.id = drawn.card_id
      WHERE bo.user_id = p_user_id
        AND c.rarity = 'LEGENDS'::public."Rarity";

    WHEN 'world_class_drops_total' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.booster_openings bo
      JOIN LATERAL jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
          ELSE '[]'::jsonb
        END
      ) AS drawn(card_id) ON true
      JOIN public.cards c ON c.id = drawn.card_id
      WHERE bo.user_id = p_user_id
        AND c.rarity = 'WORLD_CLASS'::public."Rarity";

    WHEN 'premium_has_five_normal_special' THEN
      SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM public.booster_openings bo
        JOIN public.boosters b ON b.id = bo.booster_id
        WHERE bo.user_id = p_user_id
          AND b.type = 'PREMIUM'::public."BoosterType"
          AND (
            SELECT COUNT(*)
            FROM jsonb_array_elements_text(
              CASE
                WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
                ELSE '[]'::jsonb
              END
            ) AS drawn(card_id)
            JOIN public.cards c ON c.id = drawn.card_id
            WHERE c.rarity = 'ROOKIE'::public."Rarity"
          ) = 5
      ) THEN 1 ELSE 0 END INTO v_value;

    WHEN 'top_opening_pc_gained' THEN
      SELECT COALESCE(MAX(bo.pc_gained), 0)::numeric INTO v_value
      FROM public.booster_openings bo
      WHERE bo.user_id = p_user_id;

    WHEN 'duplicate_cards_total' THEN
      SELECT COALESCE(SUM(bo.duplicate_cards), 0)::numeric INTO v_value
      FROM public.booster_openings bo
      WHERE bo.user_id = p_user_id;

    WHEN 'total_pc_earned' THEN
      SELECT COALESCE(u.total_pc_earned, 0)::numeric INTO v_value
      FROM public.users u
      WHERE u.id = p_user_id;

    WHEN 'total_pc_spent' THEN
      SELECT COALESCE(
        SUM(
          CASE
            WHEN bo.type = 'SHOP'::public."OpeningType" THEN COALESCE(b.price_pc, 0)
            ELSE 0
          END
        ),
        0
      )::numeric INTO v_value
      FROM public.booster_openings bo
      LEFT JOIN public.boosters b ON b.id = bo.booster_id
      WHERE bo.user_id = p_user_id;

    WHEN 'total_card_value' THEN
      SELECT COALESCE(SUM(c.pc_value), 0)::numeric INTO v_value
      FROM public.user_cards uc
      JOIN public.cards c ON c.id = uc.card_id
      WHERE uc.user_id = p_user_id;

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

    WHEN 'valorant_unique_cards' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.user_cards uc
      JOIN public.cards c ON c.id = uc.card_id
      JOIN public.games g ON g.id = c.game_id
      WHERE uc.user_id = p_user_id
        AND g.slug = 'valorant';

    WHEN 'cod_unique_cards' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.user_cards uc
      JOIN public.cards c ON c.id = uc.card_id
      JOIN public.games g ON g.id = c.game_id
      WHERE uc.user_id = p_user_id
        AND g.slug = 'call-of-duty';

    WHEN 'cs_unique_cards' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.user_cards uc
      JOIN public.cards c ON c.id = uc.card_id
      JOIN public.games g ON g.id = c.game_id
      WHERE uc.user_id = p_user_id
        AND g.slug IN ('counter-strike-2', 'counter-strike-global-offensive');

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

    WHEN 'distinct_games' THEN
      SELECT COUNT(DISTINCT c.game_id)::numeric INTO v_value
      FROM public.user_cards uc
      JOIN public.cards c ON c.id = uc.card_id
      WHERE uc.user_id = p_user_id;

    ELSE
      v_value := 0;
  END CASE;

  RETURN COALESCE(v_value, 0);
END;
$$;

INSERT INTO public.achievement_definitions (
  code,
  name,
  category,
  description,
  metric_key,
  target_value,
  reward_pc,
  reward_booster_type,
  reward_title,
  leaderboard_points
)
VALUES
  ('VALORANT_SCOUT', 'Valorant Scout', 'Esport', 'Obtiens 10 cartes Valorant.', 'valorant_unique_cards', 10, 1200, NULL, NULL, 140),
  ('VALORANT_STAR', 'Valorant Star', 'Esport', 'Obtiens 35 cartes Valorant.', 'valorant_unique_cards', 35, 2600, NULL, 'Valorant Star', 360),
  ('COD_RECRUIT', 'CoD Recruit', 'Esport', 'Obtiens 10 cartes Call of Duty.', 'cod_unique_cards', 10, 1200, NULL, NULL, 140),
  ('COD_VETERAN', 'CoD Veteran', 'Esport', 'Obtiens 35 cartes Call of Duty.', 'cod_unique_cards', 35, 2600, NULL, 'CoD Veteran', 360),
  ('CS_ROOKIE', 'CS Rookie', 'Esport', 'Obtiens 10 cartes Counter-Strike.', 'cs_unique_cards', 10, 1200, NULL, NULL, 140),
  ('CS_LEGACY', 'CS Legacy', 'Esport', 'Obtiens 35 cartes Counter-Strike.', 'cs_unique_cards', 35, 2600, NULL, 'CS Legacy', 360),
  ('BIG_HIT_III', 'Big Hit III', 'Chance', 'Réalise une ouverture avec au moins 5000 PC gagnés.', 'top_opening_pc_gained', 5000, 4500, NULL, 'Big Hitter III', 720),
  ('BIG_HIT_IV', 'Big Hit IV', 'Chance', 'Réalise une ouverture avec au moins 10000 PC gagnés.', 'top_opening_pc_gained', 10000, 0, 'GODPACK', 'Big Hitter IV', 1400)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  metric_key = EXCLUDED.metric_key,
  target_value = EXCLUDED.target_value,
  reward_pc = EXCLUDED.reward_pc,
  reward_booster_type = EXCLUDED.reward_booster_type,
  reward_title = EXCLUDED.reward_title,
  leaderboard_points = EXCLUDED.leaderboard_points;

UPDATE public.achievement_definitions
SET leaderboard_points =
  CASE
    WHEN leaderboard_points <= 0 THEN 0
    ELSE LEAST(5000, GREATEST(20, ROUND(leaderboard_points * 1.75)::int))
  END;

DROP FUNCTION IF EXISTS public.get_achievements_progress(uuid);

CREATE OR REPLACE FUNCTION public.get_achievements_progress(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  achievement_id uuid,
  code text,
  name text,
  category text,
  description text,
  metric_key text,
  target_value numeric,
  current_value numeric,
  progress_pct int,
  leaderboard_points int,
  unlocked boolean,
  unlocked_at timestamptz,
  reward_label text,
  reward_pc int,
  reward_booster_type public."BoosterType",
  reward_title text,
  reward_claimed boolean,
  can_claim_reward boolean,
  seen boolean
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
    ad.metric_key,
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
    ad.leaderboard_points,
    (ua.achievement_id IS NOT NULL) AS unlocked,
    ua.unlocked_at,
    public._build_achievement_reward_label(ad.reward_pc, ad.reward_booster_type, ad.reward_title) AS reward_label,
    ad.reward_pc,
    ad.reward_booster_type,
    ad.reward_title,
    (ua.reward_granted_at IS NOT NULL) AS reward_claimed,
    (ua.achievement_id IS NOT NULL AND ua.reward_granted_at IS NULL) AS can_claim_reward,
    (ua.seen_at IS NOT NULL) AS seen
  FROM public.achievement_definitions ad
  LEFT JOIN public.user_achievements ua
    ON ua.achievement_id = ad.id
   AND ua.user_id = p_user_id
  CROSS JOIN LATERAL (
    SELECT public._achievement_metric(p_user_id, ad.metric_key) AS current_value
  ) metrics
  ORDER BY ad.category ASC, ad.name ASC, ad.code ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_achievements_progress(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.get_public_profile_recent_achievements(uuid, int);

CREATE OR REPLACE FUNCTION public.get_public_profile_recent_achievements(
  p_user_id uuid,
  p_limit int DEFAULT 8
)
RETURNS TABLE (
  unlocked_at timestamptz,
  code text,
  name text,
  category text,
  leaderboard_points int,
  reward_title text,
  reward_pc int,
  reward_booster_type public."BoosterType"
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    ua.unlocked_at,
    ad.code,
    ad.name,
    ad.category,
    ad.leaderboard_points,
    ad.reward_title,
    ad.reward_pc,
    ad.reward_booster_type
  FROM public.user_achievements ua
  JOIN public.achievement_definitions ad ON ad.id = ua.achievement_id
  WHERE ua.user_id = p_user_id
  ORDER BY ua.unlocked_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 8), 30));
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_recent_achievements(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_recent_achievements(uuid, int) TO authenticated;
