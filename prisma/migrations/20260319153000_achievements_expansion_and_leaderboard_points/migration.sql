-- Achievements expansion (target: 100), reward rebalance, localized descriptions,
-- and leaderboard scoring that includes achievement points.

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

WITH definitions (
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
) AS (
  VALUES
    ('FIRST_CARD', 'First Card', 'Collection', 'Obtiens ta première carte.', 'unique_cards', 1, 600, NULL, NULL, 20),
    ('COLLECTOR_I', 'Collector I', 'Collection', 'Obtiens 10 cartes uniques.', 'unique_cards', 10, 700, NULL, NULL, 30),
    ('COLLECTOR_II', 'Collector II', 'Collection', 'Obtiens 25 cartes uniques.', 'unique_cards', 25, 900, NULL, NULL, 45),
    ('COLLECTOR_III', 'Collector III', 'Collection', 'Obtiens 50 cartes uniques.', 'unique_cards', 50, 1300, NULL, NULL, 70),
    ('COLLECTOR_IV', 'Collector IV', 'Collection', 'Obtiens 100 cartes uniques.', 'unique_cards', 100, 0, 'PREMIUM', NULL, 120),
    ('COLLECTOR_V', 'Collector V', 'Collection', 'Obtiens 150 cartes uniques.', 'unique_cards', 150, 1800, NULL, NULL, 180),
    ('COLLECTOR_VI', 'Collector VI', 'Collection', 'Obtiens 220 cartes uniques.', 'unique_cards', 220, 2600, NULL, NULL, 260),
    ('COLLECTION_MASTER', 'Collection Master', 'Collection', 'Obtiens 300 cartes uniques.', 'unique_cards', 300, 0, 'GODPACK', 'Collection Master', 420),
    ('COMPLETIONIST', 'Completionist', 'Collection', 'Complète une série entière.', 'completed_series_count', 1, 1800, NULL, NULL, 120),
    ('COMPLETIONIST_II', 'Completionist II', 'Collection', 'Complète 2 séries entières.', 'completed_series_count', 2, 2600, NULL, NULL, 220),
    ('COMPLETIONIST_III', 'Completionist III', 'Collection', 'Complète 3 séries entières.', 'completed_series_count', 3, 0, 'PREMIUM', 'Series Expert', 360),
    ('ARCHIVIST', 'Archivist', 'Collection', 'Complète 4 séries entières.', 'completed_series_count', 4, 0, 'GODPACK', NULL, 520),
    ('ARCHIVIST_PLUS', 'Archivist Plus', 'Collection', 'Complète 6 séries entières.', 'completed_series_count', 6, 3500, NULL, 'Archive Lord', 760),
    ('VALUE_COLLECTOR_II', 'Value Collector', 'Collection', 'Atteins 75 000 de valeur totale de collection.', 'total_card_value', 75000, 2200, NULL, NULL, 260),
    ('CARD_CONNOISSEUR', 'Card Connoisseur', 'Collection', 'Atteins 180 000 de valeur totale de collection.', 'total_card_value', 180000, 0, 'GODPACK', 'Connoisseur', 600),

    ('CHALLENGER_RISING', 'Challenger Rising', 'Rarete', 'Obtiens 10 cartes Challenger.', 'rarity_challenger', 10, 600, NULL, NULL, 35),
    ('CHALLENGER_ELITE', 'Challenger Elite', 'Rarete', 'Obtiens 50 cartes Challenger.', 'rarity_challenger', 50, 1200, NULL, NULL, 90),
    ('CHALLENGER_MASTER', 'Challenger Master', 'Rarete', 'Obtiens 120 cartes Challenger.', 'rarity_challenger', 120, 2200, NULL, NULL, 170),
    ('CHAMPION_RISING', 'Champion Rising', 'Rarete', 'Obtiens 5 cartes Champion.', 'rarity_champion', 5, 700, NULL, NULL, 45),
    ('CHAMPION_ELITE', 'Champion Elite', 'Rarete', 'Obtiens 25 cartes Champion.', 'rarity_champion', 25, 1800, NULL, NULL, 140),
    ('CHAMPION_MASTER', 'Champion Master', 'Rarete', 'Obtiens 60 cartes Champion.', 'rarity_champion', 60, 0, 'PREMIUM', NULL, 260),
    ('WORLD_CLASS', 'World Class', 'Rarete', 'Obtiens 5 cartes World Class.', 'rarity_world_class', 5, 1000, NULL, NULL, 90),
    ('WORLD_CLASS_ELITE', 'World Class Elite', 'Rarete', 'Obtiens 20 cartes World Class.', 'rarity_world_class', 20, 0, 'PREMIUM', NULL, 220),
    ('WORLD_CLASS_MASTER', 'World Class Master', 'Rarete', 'Obtiens 40 cartes World Class.', 'rarity_world_class', 40, 2800, NULL, 'World Class Master', 420),
    ('LEGEND_HUNTER', 'Legend Hunter', 'Rarete', 'Obtiens 1 carte Legends.', 'rarity_legends', 1, 2500, NULL, NULL, 220),
    ('LEGEND_COLLECTOR', 'Legend Collector', 'Rarete', 'Obtiens 3 cartes Legends.', 'rarity_legends', 3, 0, 'PREMIUM', NULL, 420),
    ('LEGEND_ARCHIVE', 'Legend Archive', 'Rarete', 'Obtiens 10 cartes Legends.', 'rarity_legends', 10, 3500, NULL, 'Legend Hunter', 760),
    ('LEGEND_DYNASTY', 'Legend Dynasty', 'Rarete', 'Obtiens 20 cartes Legends.', 'rarity_legends', 20, 0, 'GODPACK', 'Legend Dynasty', 1100),
    ('LEGEND_MYTH', 'Legend Myth', 'Rarete', 'Obtiens 35 cartes Legends.', 'rarity_legends', 35, 6000, NULL, 'Mythic Collector', 1600),
    ('LEGEND_DROPPER_I', 'Legend Dropper', 'Rarete', 'Drop 5 cartes Legends au total.', 'legends_drops_total', 5, 2200, NULL, NULL, 360),
    ('WORLD_CLASS_DROPPER_I', 'World Class Dropper', 'Rarete', 'Drop 20 cartes World Class au total.', 'world_class_drops_total', 20, 1800, NULL, NULL, 240),

    ('PACK_OPENER_I', 'Pack Opener I', 'Booster', 'Ouvre 10 boosters.', 'booster_opened_count', 10, 600, NULL, NULL, 30),
    ('PACK_OPENER_II', 'Pack Opener II', 'Booster', 'Ouvre 50 boosters.', 'booster_opened_count', 50, 900, NULL, NULL, 60),
    ('PACK_OPENER_III', 'Pack Opener III', 'Booster', 'Ouvre 100 boosters.', 'booster_opened_count', 100, 1300, NULL, NULL, 100),
    ('PACK_OPENER_IV', 'Pack Opener IV', 'Booster', 'Ouvre 300 boosters.', 'booster_opened_count', 300, 2200, NULL, NULL, 180),
    ('PACK_OPENER_V', 'Pack Opener V', 'Booster', 'Ouvre 600 boosters.', 'booster_opened_count', 600, 0, 'PREMIUM', NULL, 320),
    ('PACK_OPENER_VI', 'Pack Opener VI', 'Booster', 'Ouvre 1000 boosters.', 'booster_opened_count', 1000, 4000, NULL, 'Pack Titan', 520),
    ('PACK_OPENER_VII', 'Pack Opener VII', 'Booster', 'Ouvre 2000 boosters.', 'booster_opened_count', 2000, 0, 'GODPACK', 'Pack Emperor', 900),
    ('PACK_MANIAC', 'Pack Maniac', 'Booster', 'Ouvre 3000 boosters.', 'booster_opened_count', 3000, 7000, NULL, 'Pack Maniac', 1400),
    ('NORMAL_STARTER', 'Normal Starter', 'Booster', 'Ouvre ton premier booster Normal.', 'booster_opened_normal_count', 1, 0, 'NORMAL', NULL, 20),
    ('LUCK_STARTER', 'Luck Starter', 'Booster', 'Ouvre ton premier booster Luck.', 'booster_opened_luck_count', 1, 0, 'LUCK', NULL, 30),
    ('PREMIUM_STARTER', 'Premium Starter', 'Booster', 'Ouvre ton premier booster Premium.', 'booster_opened_premium_count', 1, 0, 'PREMIUM', NULL, 40),
    ('GODPACK_STARTER', 'Godpack Starter', 'Booster', 'Ouvre ton premier Godpack.', 'booster_opened_godpack_count', 1, 0, 'GODPACK', NULL, 80),
    ('NORMAL_GRINDER_I', 'Normal Grinder', 'Booster', 'Ouvre 100 boosters Normal.', 'booster_opened_normal_count', 100, 1400, NULL, NULL, 120),
    ('LUCK_GRINDER_I', 'Luck Grinder', 'Booster', 'Ouvre 50 boosters Luck.', 'booster_opened_luck_count', 50, 1700, NULL, NULL, 180),
    ('PREMIUM_GRINDER_I', 'Premium Grinder', 'Booster', 'Ouvre 25 boosters Premium.', 'booster_opened_premium_count', 25, 0, 'PREMIUM', NULL, 240),
    ('GODPACK_GRINDER_I', 'Godpack Grinder', 'Booster', 'Ouvre 8 Godpacks.', 'booster_opened_godpack_count', 8, 0, 'GODPACK', 'Godpack Grinder', 460),
    ('SHOPPER_I', 'Shopper I', 'Booster', 'Ouvre 25 boosters achetés en boutique.', 'shop_opened_count', 25, 1200, NULL, NULL, 110),
    ('SHOPPER_II', 'Shopper II', 'Booster', 'Ouvre 120 boosters achetés en boutique.', 'shop_opened_count', 120, 2600, NULL, 'Shop Specialist', 300),
    ('STREAK_OPENINGS_I', 'Streak Openings', 'Booster', 'Ouvre 20 boosters de récompense de streak.', 'streak_opened_count', 20, 1600, NULL, NULL, 180),
    ('ACHIEVEMENT_OPENINGS_I', 'Achievement Openings', 'Booster', 'Ouvre 20 boosters gagnés via achievements.', 'achievement_opened_count', 20, 2000, NULL, NULL, 220),

    ('LUCKY_PULL', 'Lucky Pull', 'Chance', 'Drop au moins une Champion+ dans un booster Normal.', 'normal_has_champion_plus', 1, 1200, NULL, NULL, 130),
    ('INSANE_LUCK', 'Insane Luck', 'Chance', 'Drop au moins une World Class+ dans un booster Normal.', 'normal_has_world_class', 1, 1800, NULL, NULL, 230),
    ('LEGENDARY_MOMENT', 'Legendary Moment', 'Chance', 'Drop au moins une Legends.', 'any_has_legends', 1, 2500, NULL, NULL, 320),
    ('GOD_OF_LUCK', 'God of Luck', 'Chance', 'Drop une Legends dans un booster Normal.', 'normal_has_legends', 1, 0, 'GODPACK', 'God of Luck', 760),
    ('NORMAL_HOT_HAND', 'Normal Hot Hand', 'Chance', 'Drop 3 cartes Champion+ depuis des boosters Normal.', 'normal_champion_plus_drops_total', 3, 1500, NULL, NULL, 180),
    ('NORMAL_MIRACLE', 'Normal Miracle', 'Chance', 'Drop 2 cartes World Class+ depuis des boosters Normal.', 'normal_world_class_plus_drops_total', 2, 2400, NULL, NULL, 340),
    ('LUCK_WORLD_CLASS_I', 'Luck World Class', 'Chance', 'Drop 4 cartes World Class+ depuis des boosters Luck.', 'luck_world_class_plus_drops_total', 4, 1700, NULL, NULL, 220),
    ('LUCK_WORLD_CLASS_II', 'Luck World Class II', 'Chance', 'Drop 12 cartes World Class+ depuis des boosters Luck.', 'luck_world_class_plus_drops_total', 12, 0, 'PREMIUM', NULL, 420),
    ('PREMIUM_WORLD_CLASS_I', 'Premium World Class', 'Chance', 'Drop 6 cartes World Class+ depuis des boosters Premium.', 'premium_world_class_plus_drops_total', 6, 2300, NULL, NULL, 320),
    ('PREMIUM_LEGEND_I', 'Premium Legend', 'Chance', 'Drop 3 cartes Legends depuis des boosters Premium.', 'premium_legends_drops_total', 3, 0, 'GODPACK', 'Premium Sniper', 760),
    ('SPECIAL_KAIRYYUU', 'Special Kairyuu', 'Chance', 'Drop 5 normales dans un booster premium.', 'premium_has_five_normal_special', 1, 1800, NULL, 'Kairyuu', 280),
    ('BIG_HIT_I', 'Big Hit I', 'Chance', 'Réalise une ouverture avec au moins 900 PC gagnés.', 'top_opening_pc_gained', 900, 1200, NULL, NULL, 140),
    ('BIG_HIT_II', 'Big Hit II', 'Chance', 'Réalise une ouverture avec au moins 1700 PC gagnés.', 'top_opening_pc_gained', 1700, 2600, NULL, 'Big Hitter', 300),

    ('FIRST_DUPLICATE', 'First Duplicate', 'Economy', 'Obtiens ton premier doublon.', 'duplicate_cards_total', 1, 500, NULL, NULL, 25),
    ('SCRAP_DEALER', 'Scrap Dealer', 'Economy', 'Accumule 10 doublons.', 'duplicate_cards_total', 10, 900, NULL, NULL, 60),
    ('SCRAP_BARON', 'Scrap Baron', 'Economy', 'Accumule 60 doublons.', 'duplicate_cards_total', 60, 1700, NULL, NULL, 180),
    ('SCRAP_EMPEROR', 'Scrap Emperor', 'Economy', 'Accumule 220 doublons.', 'duplicate_cards_total', 220, 2800, NULL, 'Scrap Emperor', 360),
    ('PC_COLLECTOR', 'PC Collector', 'Economy', 'Cumule 10 000 PC gagnés.', 'total_pc_earned', 10000, 1200, NULL, NULL, 90),
    ('PC_INVESTOR', 'PC Investor', 'Economy', 'Cumule 50 000 PC gagnés.', 'total_pc_earned', 50000, 2200, NULL, NULL, 220),
    ('PC_TYCOON', 'PC Tycoon', 'Economy', 'Cumule 200 000 PC gagnés.', 'total_pc_earned', 200000, 0, 'PREMIUM', NULL, 420),
    ('PC_MAGNATE', 'PC Magnate', 'Economy', 'Cumule 500 000 PC gagnés.', 'total_pc_earned', 500000, 5000, NULL, 'PC Magnate', 760),
    ('SPENDER_I', 'Big Spender I', 'Economy', 'Dépense 10 000 PC en boutique.', 'total_pc_spent', 10000, 1000, NULL, NULL, 100),
    ('SPENDER_II', 'Big Spender II', 'Economy', 'Dépense 60 000 PC en boutique.', 'total_pc_spent', 60000, 2200, NULL, NULL, 260),
    ('VALUE_TRADER', 'Value Trader', 'Economy', 'Atteins 260 000 de valeur totale de collection.', 'total_card_value', 260000, 0, 'GODPACK', 'Value Trader', 620),

    ('DAILY_PLAYER', 'Daily Player', 'Activite', 'Ouvre 7 boosters quotidiens.', 'daily_opened_count', 7, 900, NULL, NULL, 70),
    ('DEDICATED_FAN', 'Dedicated Fan', 'Activite', 'Ouvre 30 boosters quotidiens.', 'daily_opened_count', 30, 1800, NULL, NULL, 170),
    ('DAILY_MASTER', 'Daily Master', 'Activite', 'Ouvre 90 boosters quotidiens.', 'daily_opened_count', 90, 3000, NULL, 'Daily Master', 340),
    ('LOYAL_COLLECTOR', 'Loyal Collector', 'Activite', 'Atteins 7 jours de streak de connexion.', 'login_streak_current_day', 7, 1100, NULL, NULL, 100),
    ('STREAK_KEEPER', 'Streak Keeper', 'Activite', 'Atteins 14 jours de streak de connexion.', 'login_streak_current_day', 14, 1900, NULL, NULL, 220),
    ('STREAK_MASTER', 'Streak Master', 'Activite', 'Atteins 30 jours de streak de connexion.', 'login_streak_current_day', 30, 0, 'PREMIUM', 'Streak Master', 420),
    ('ESPORT_ADDICT', 'Esport Addict', 'Activite', 'Atteins 30 jours de connexion cumulés.', 'login_total_days', 30, 1400, NULL, NULL, 130),
    ('EVERGREEN', 'Evergreen', 'Activite', 'Atteins 120 jours de connexion cumulés.', 'login_total_days', 120, 3000, NULL, NULL, 360),
    ('ANCIENT_ONE', 'Ancient One', 'Activite', 'Atteins 365 jours de connexion cumulés.', 'login_total_days', 365, 0, 'GODPACK', 'Ancient One', 820),

    ('SERIES_STARTER', 'Series Starter', 'Serie', 'Atteins 25% de complétion sur une série.', 'max_series_completion_pct', 25, 1000, NULL, NULL, 90),
    ('SERIES_CHALLENGER', 'Series Challenger', 'Serie', 'Atteins 50% de complétion sur une série.', 'max_series_completion_pct', 50, 1800, NULL, NULL, 200),
    ('SERIES_CHAMPION', 'Series Champion', 'Serie', 'Atteins 75% de complétion sur une série.', 'max_series_completion_pct', 75, 2800, NULL, NULL, 320),
    ('SERIES_LEGEND', 'Series Legend', 'Serie', 'Atteins 100% de complétion sur une série.', 'max_series_completion_pct', 100, 0, 'GODPACK', 'Series Legend', 640),
    ('SERIES_MASTER', 'Series Master', 'Serie', 'Complète 5 séries entières.', 'completed_series_count', 5, 3200, NULL, 'Series Master', 520),
    ('SERIES_GRANDMASTER', 'Series Grandmaster', 'Serie', 'Complète 8 séries entières.', 'completed_series_count', 8, 0, 'GODPACK', 'Series Grandmaster', 1000),
    ('SERIES_S2_EXPLORER', 'S2 Explorer', 'Serie', 'Obtiens 25 cartes de la série S2.', 's2_unique_cards', 25, 1400, NULL, NULL, 160),
    ('SERIES_S2_COLLECTOR', 'S2 Collector', 'Serie', 'Atteins 80% de complétion de la série S2.', 's2_completion_pct', 80, 2600, NULL, 'S2 Collector', 380),

    ('LEC_COLLECTOR', 'LEC Collector', 'Esport', 'Obtiens 10 cartes League of Legends.', 'lol_unique_cards', 10, 900, NULL, NULL, 80),
    ('LOL_ELITE', 'LoL Elite', 'Esport', 'Obtiens 40 cartes League of Legends.', 'lol_unique_cards', 40, 2200, NULL, 'LoL Elite', 260),
    ('GLOBAL_TALENT', 'Global Talent', 'Esport', 'Obtiens 10 nationalités différentes.', 'distinct_nationalities', 10, 900, NULL, NULL, 90),
    ('GLOBAL_SCOUT', 'Global Scout', 'Esport', 'Obtiens 20 nationalités différentes.', 'distinct_nationalities', 20, 1800, NULL, NULL, 220),
    ('TEAM_BUILDER', 'Team Builder', 'Esport', 'Obtiens 10 équipes différentes.', 'distinct_teams', 10, 1000, NULL, NULL, 110),
    ('TEAM_ARCHITECT', 'Team Architect', 'Esport', 'Obtiens 25 équipes différentes.', 'distinct_teams', 25, 2600, NULL, 'Team Architect', 300),
    ('ROLE_MASTER', 'Role Master', 'Esport', 'Obtiens 5 rôles différents.', 'distinct_roles', 5, 900, NULL, NULL, 90),
    ('GAME_EXPLORER', 'Game Explorer', 'Esport', 'Obtiens des cartes de 6 jeux différents.', 'distinct_games', 6, 1800, NULL, 'Game Explorer', 240)
)
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
SELECT
  d.code,
  d.name,
  d.category,
  d.description,
  d.metric_key,
  d.target_value::numeric,
  d.reward_pc,
  d.reward_booster_type::public."BoosterType",
  d.reward_title,
  d.leaderboard_points
FROM definitions d
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

CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  total_cards int,
  weighted_score int,
  achievements_unlocked int
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH achievements AS (
    SELECT
      ua.user_id,
      COUNT(*)::int AS unlocked_count,
      COALESCE(SUM(ad.leaderboard_points), 0)::int AS leaderboard_points
    FROM public.user_achievements ua
    JOIN public.achievement_definitions ad ON ad.id = ua.achievement_id
    GROUP BY ua.user_id
  )
  SELECT
    u.id AS user_id,
    COALESCE(u.username, concat('Player-', left(u.id::text, 6))) AS username,
    u.avatar_url,
    COUNT(uc.card_id)::int AS total_cards,
    (
      COALESCE(SUM(c.pc_value), 0)::int
      + COALESCE(a.leaderboard_points, 0)
    )::int AS weighted_score,
    COALESCE(a.unlocked_count, 0)::int AS achievements_unlocked
  FROM public.users u
  LEFT JOIN public.user_cards uc ON uc.user_id = u.id
  LEFT JOIN public.cards c ON c.id = uc.card_id
  LEFT JOIN achievements a ON a.user_id = u.id
  GROUP BY u.id, u.username, u.avatar_url, a.unlocked_count, a.leaderboard_points
  ORDER BY weighted_score DESC, total_cards DESC, achievements_unlocked DESC, username ASC;
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;

DROP FUNCTION IF EXISTS public.get_public_profile_overview(uuid);

CREATE OR REPLACE FUNCTION public.get_public_profile_overview(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  title text,
  leaderboard_position int,
  total_cards int,
  weighted_score int,
  achievements_unlocked int,
  total_openings int,
  normal_openings int,
  luck_openings int,
  premium_openings int,
  godpack_openings int,
  avg_pc_gained numeric,
  duplicate_rate numeric,
  big_pull_rate numeric,
  legends_owned int,
  world_class_owned int,
  champion_owned int,
  best_card_id text,
  best_card_name text,
  best_card_rarity public."Rarity",
  best_card_pc_value int,
  signature_card_id text,
  signature_card_name text,
  signature_card_rarity public."Rarity",
  signature_card_pc_value int,
  signature_card_image_url text,
  favorite_game text,
  pc_balance int,
  total_pc_earned bigint,
  total_pc_spent bigint,
  global_avg_big_pull_rate numeric,
  global_avg_duplicate_rate numeric,
  global_avg_pc_spent numeric,
  top_drop_cards jsonb
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH base_user AS (
    SELECT
      u.id,
      COALESCE(NULLIF(trim(u.username), ''), concat('Player-', left(u.id::text, 6))) AS username,
      u.avatar_url,
      NULLIF(trim(u.title), '') AS title,
      u.signature_card_id,
      u.pc_balance,
      u.total_pc_earned
    FROM public.users u
    WHERE u.id = p_user_id
  ),
  user_openings AS (
    SELECT
      bo.id,
      bo.user_id,
      bo.type AS opening_type,
      bo.cards,
      bo.pc_gained,
      bo.duplicate_cards,
      b.type AS booster_type,
      b.price_pc
    FROM public.booster_openings bo
    LEFT JOIN public.boosters b ON b.id = bo.booster_id
    WHERE bo.user_id = p_user_id
  ),
  opening_stats AS (
    SELECT
      COUNT(*)::int AS total_openings,
      COUNT(*) FILTER (WHERE o.booster_type = 'NORMAL')::int AS normal_openings,
      COUNT(*) FILTER (WHERE o.booster_type = 'LUCK')::int AS luck_openings,
      COUNT(*) FILTER (WHERE o.booster_type = 'PREMIUM')::int AS premium_openings,
      COUNT(*) FILTER (WHERE o.booster_type = 'GODPACK')::int AS godpack_openings,
      COALESCE(AVG(o.pc_gained::numeric), 0::numeric) AS avg_pc_gained,
      COALESCE(
        SUM(
          CASE
            WHEN o.opening_type = 'SHOP'::public."OpeningType" THEN COALESCE(o.price_pc, 0)
            ELSE 0
          END
        ),
        0
      )::bigint AS total_pc_spent,
      COALESCE(SUM(o.duplicate_cards), 0)::numeric AS duplicate_cards_total
    FROM user_openings o
  ),
  user_drop_cards AS (
    SELECT
      c.id,
      c.name,
      c.rarity,
      c.pc_value,
      c."imageUrl"
    FROM user_openings o
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE
        WHEN jsonb_typeof(o.cards::jsonb) = 'array' THEN o.cards::jsonb
        ELSE '[]'::jsonb
      END
    ) AS opened(card_id)
    JOIN public.cards c ON c.id = opened.card_id
  ),
  user_drop_stats AS (
    SELECT
      COUNT(*)::numeric AS total_drop_cards,
      COUNT(*) FILTER (
        WHERE udc.rarity IN ('LEGENDS'::public."Rarity", 'WORLD_CLASS'::public."Rarity")
      )::numeric AS big_pull_cards
    FROM user_drop_cards udc
  ),
  top_drop_cards_json AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'card_id', grouped.card_id,
          'card_name', grouped.card_name,
          'card_rarity', grouped.card_rarity,
          'card_image_url', grouped.card_image_url,
          'drops_count', grouped.drops_count
        )
        ORDER BY grouped.drops_count DESC, grouped.card_id ASC
      ),
      '[]'::jsonb
    ) AS value
    FROM (
      SELECT
        udc.id AS card_id,
        udc.name AS card_name,
        udc.rarity AS card_rarity,
        udc."imageUrl" AS card_image_url,
        COUNT(*)::bigint AS drops_count
      FROM user_drop_cards udc
      GROUP BY udc.id, udc.name, udc.rarity, udc."imageUrl"
      ORDER BY
        drops_count DESC,
        CASE udc.rarity
          WHEN 'LEGENDS'::public."Rarity" THEN 5
          WHEN 'WORLD_CLASS'::public."Rarity" THEN 4
          WHEN 'CHAMPION'::public."Rarity" THEN 3
          WHEN 'CHALLENGER'::public."Rarity" THEN 2
          WHEN 'ROOKIE'::public."Rarity" THEN 1
          ELSE 0
        END DESC,
        udc.id ASC
      LIMIT 5
    ) grouped
  ),
  card_stats AS (
    SELECT
      COUNT(*)::int AS total_cards,
      COALESCE(SUM(c.pc_value), 0)::int AS card_score,
      COUNT(*) FILTER (WHERE c.rarity = 'LEGENDS')::int AS legends_owned,
      COUNT(*) FILTER (WHERE c.rarity = 'WORLD_CLASS')::int AS world_class_owned,
      COUNT(*) FILTER (WHERE c.rarity = 'CHAMPION')::int AS champion_owned
    FROM public.user_cards uc
    JOIN public.cards c ON c.id = uc.card_id
    WHERE uc.user_id = p_user_id
  ),
  achievements_stats AS (
    SELECT COUNT(*)::int AS achievements_unlocked
    FROM public.user_achievements ua
    WHERE ua.user_id = p_user_id
  ),
  achievement_points AS (
    SELECT COALESCE(SUM(ad.leaderboard_points), 0)::int AS leaderboard_points
    FROM public.user_achievements ua
    JOIN public.achievement_definitions ad ON ad.id = ua.achievement_id
    WHERE ua.user_id = p_user_id
  ),
  best_card AS (
    SELECT
      c.id,
      c.name,
      c.rarity,
      c.pc_value
    FROM public.user_cards uc
    JOIN public.cards c ON c.id = uc.card_id
    WHERE uc.user_id = p_user_id
    ORDER BY c.pc_value DESC, uc.obtained_at DESC
    LIMIT 1
  ),
  signature_card AS (
    SELECT
      c.id,
      c.name,
      c.rarity,
      c.pc_value,
      c."imageUrl"
    FROM base_user bu
    JOIN public.cards c ON c.id = bu.signature_card_id
    JOIN public.user_cards uc
      ON uc.user_id = bu.id
     AND uc.card_id = c.id
    LIMIT 1
  ),
  favorite_game AS (
    SELECT
      g.name,
      COUNT(*)::int AS card_count
    FROM public.user_cards uc
    JOIN public.cards c ON c.id = uc.card_id
    JOIN public.games g ON g.id = c.game_id
    WHERE uc.user_id = p_user_id
    GROUP BY g.name
    ORDER BY card_count DESC, g.name ASC
    LIMIT 1
  ),
  leaderboard_ranks AS (
    SELECT
      ranked.user_id,
      ranked.leaderboard_position
    FROM (
      SELECT
        u.id AS user_id,
        DENSE_RANK() OVER (
          ORDER BY
            (
              COALESCE(SUM(c.pc_value), 0)
              + COALESCE(ap.achievement_points, 0)
            ) DESC,
            COUNT(uc.card_id) DESC,
            COALESCE(NULLIF(trim(u.username), ''), concat('Player-', left(u.id::text, 6))) ASC
        )::int AS leaderboard_position
      FROM public.users u
      LEFT JOIN public.user_cards uc ON uc.user_id = u.id
      LEFT JOIN public.cards c ON c.id = uc.card_id
      LEFT JOIN (
        SELECT
          ua.user_id,
          COALESCE(SUM(ad.leaderboard_points), 0)::int AS achievement_points
        FROM public.user_achievements ua
        JOIN public.achievement_definitions ad ON ad.id = ua.achievement_id
        GROUP BY ua.user_id
      ) ap ON ap.user_id = u.id
      GROUP BY u.id, u.username, ap.achievement_points
    ) ranked
    WHERE ranked.user_id = p_user_id
  ),
  all_user_base AS (
    SELECT
      u.id AS user_id,
      bo.id AS opening_id,
      bo.type AS opening_type,
      bo.cards,
      bo.duplicate_cards,
      b.price_pc,
      b.type AS booster_type
    FROM public.users u
    LEFT JOIN public.booster_openings bo ON bo.user_id = u.id
    LEFT JOIN public.boosters b ON b.id = bo.booster_id
  ),
  all_user_opening_stats AS (
    SELECT
      aub.user_id,
      COUNT(aub.opening_id)::numeric AS total_openings,
      COALESCE(SUM(aub.duplicate_cards), 0)::numeric AS duplicate_cards_total,
      COALESCE(
        SUM(
          CASE
            WHEN aub.opening_type = 'SHOP'::public."OpeningType" THEN COALESCE(aub.price_pc, 0)
            ELSE 0
          END
        ),
        0
      )::numeric AS total_pc_spent
    FROM all_user_base aub
    GROUP BY aub.user_id
  ),
  all_user_drop_stats AS (
    SELECT
      aub.user_id,
      COUNT(*)::numeric AS total_drop_cards,
      COUNT(*) FILTER (
        WHERE c.rarity IN ('LEGENDS'::public."Rarity", 'WORLD_CLASS'::public."Rarity")
      )::numeric AS big_pull_cards
    FROM all_user_base aub
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE
        WHEN aub.cards IS NULL THEN '[]'::jsonb
        WHEN jsonb_typeof(aub.cards::jsonb) = 'array' THEN aub.cards::jsonb
        ELSE '[]'::jsonb
      END
    ) AS opened(card_id)
    JOIN public.cards c ON c.id = opened.card_id
    GROUP BY aub.user_id
  ),
  all_user_rates AS (
    SELECT
      aou.user_id,
      CASE
        WHEN COALESCE(aud.total_drop_cards, 0) = 0 THEN 0::numeric
        ELSE (COALESCE(aud.big_pull_cards, 0) * 100.0) / aud.total_drop_cards
      END AS big_pull_rate,
      CASE
        WHEN COALESCE(aud.total_drop_cards, 0) = 0 THEN 0::numeric
        ELSE (COALESCE(aou.duplicate_cards_total, 0) * 100.0) / aud.total_drop_cards
      END AS duplicate_rate,
      aou.total_pc_spent,
      COALESCE(aud.total_drop_cards, 0) AS total_drop_cards,
      aou.total_openings
    FROM all_user_opening_stats aou
    LEFT JOIN all_user_drop_stats aud ON aud.user_id = aou.user_id
  ),
  global_averages AS (
    SELECT
      COALESCE(AVG(big_pull_rate) FILTER (WHERE total_drop_cards > 0), 0::numeric) AS avg_big_pull_rate,
      COALESCE(AVG(duplicate_rate) FILTER (WHERE total_drop_cards > 0), 0::numeric) AS avg_duplicate_rate,
      COALESCE(AVG(total_pc_spent) FILTER (WHERE total_openings > 0), 0::numeric) AS avg_pc_spent
    FROM all_user_rates
  )
  SELECT
    bu.id AS user_id,
    bu.username,
    bu.avatar_url,
    bu.title,
    lr.leaderboard_position,
    COALESCE(cs.total_cards, 0) AS total_cards,
    (
      COALESCE(cs.card_score, 0)
      + COALESCE(ap.leaderboard_points, 0)
    ) AS weighted_score,
    COALESCE(ach.achievements_unlocked, 0) AS achievements_unlocked,
    COALESCE(os.total_openings, 0) AS total_openings,
    COALESCE(os.normal_openings, 0) AS normal_openings,
    COALESCE(os.luck_openings, 0) AS luck_openings,
    COALESCE(os.premium_openings, 0) AS premium_openings,
    COALESCE(os.godpack_openings, 0) AS godpack_openings,
    COALESCE(os.avg_pc_gained, 0::numeric) AS avg_pc_gained,
    CASE
      WHEN COALESCE(uds.total_drop_cards, 0) = 0 THEN 0::numeric
      ELSE (COALESCE(os.duplicate_cards_total, 0) * 100.0) / uds.total_drop_cards
    END AS duplicate_rate,
    CASE
      WHEN COALESCE(uds.total_drop_cards, 0) = 0 THEN 0::numeric
      ELSE (COALESCE(uds.big_pull_cards, 0) * 100.0) / uds.total_drop_cards
    END AS big_pull_rate,
    COALESCE(cs.legends_owned, 0) AS legends_owned,
    COALESCE(cs.world_class_owned, 0) AS world_class_owned,
    COALESCE(cs.champion_owned, 0) AS champion_owned,
    bc.id AS best_card_id,
    bc.name AS best_card_name,
    bc.rarity AS best_card_rarity,
    bc.pc_value AS best_card_pc_value,
    sc.id AS signature_card_id,
    sc.name AS signature_card_name,
    sc.rarity AS signature_card_rarity,
    sc.pc_value AS signature_card_pc_value,
    sc."imageUrl" AS signature_card_image_url,
    fg.name AS favorite_game,
    bu.pc_balance,
    bu.total_pc_earned,
    COALESCE(os.total_pc_spent, 0)::bigint AS total_pc_spent,
    ga.avg_big_pull_rate AS global_avg_big_pull_rate,
    ga.avg_duplicate_rate AS global_avg_duplicate_rate,
    ga.avg_pc_spent AS global_avg_pc_spent,
    tdj.value AS top_drop_cards
  FROM base_user bu
  LEFT JOIN opening_stats os ON true
  LEFT JOIN user_drop_stats uds ON true
  LEFT JOIN card_stats cs ON true
  LEFT JOIN achievements_stats ach ON true
  LEFT JOIN achievement_points ap ON true
  LEFT JOIN best_card bc ON true
  LEFT JOIN signature_card sc ON true
  LEFT JOIN favorite_game fg ON true
  LEFT JOIN leaderboard_ranks lr ON true
  LEFT JOIN global_averages ga ON true
  LEFT JOIN top_drop_cards_json tdj ON true;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_overview(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_overview(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.get_leaderboard_matrix_players(uuid);

CREATE OR REPLACE FUNCTION public.get_leaderboard_matrix_players(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  leaderboard_position int,
  weighted_score int,
  duplicate_rate numeric,
  big_pull_rate numeric,
  avg_pc_gained numeric,
  avg_pc_spent numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH achievement_points AS (
    SELECT
      ua.user_id,
      COALESCE(SUM(ad.leaderboard_points), 0)::int AS achievement_points,
      COUNT(*)::int AS unlocked_count
    FROM public.user_achievements ua
    JOIN public.achievement_definitions ad ON ad.id = ua.achievement_id
    GROUP BY ua.user_id
  ),
  ranked AS (
    SELECT
      u.id AS user_id,
      COALESCE(NULLIF(trim(u.username), ''), concat('Player-', left(u.id::text, 6))) AS username,
      u.avatar_url,
      (
        COALESCE(SUM(c.pc_value), 0)::int
        + COALESCE(ap.achievement_points, 0)
      )::int AS weighted_score,
      COUNT(uc.card_id)::int AS total_cards,
      COALESCE(ap.unlocked_count, 0)::int AS achievements_unlocked,
      ROW_NUMBER() OVER (
        ORDER BY
          (
            COALESCE(SUM(c.pc_value), 0)::int
            + COALESCE(ap.achievement_points, 0)
          ) DESC,
          COUNT(uc.card_id) DESC,
          COALESCE(ap.unlocked_count, 0) DESC,
          COALESCE(NULLIF(trim(u.username), ''), concat('Player-', left(u.id::text, 6))) ASC
      )::int AS leaderboard_position
    FROM public.users u
    LEFT JOIN public.user_cards uc ON uc.user_id = u.id
    LEFT JOIN public.cards c ON c.id = uc.card_id
    LEFT JOIN achievement_points ap ON ap.user_id = u.id
    GROUP BY u.id, u.username, u.avatar_url, ap.achievement_points, ap.unlocked_count
  ),
  selected_users AS (
    SELECT r.user_id
    FROM ranked r
    WHERE r.leaderboard_position <= 10

    UNION

    SELECT r.user_id
    FROM ranked r
    WHERE r.user_id = p_user_id
      AND r.leaderboard_position > 10
  ),
  opening_base AS (
    SELECT
      su.user_id,
      bo.id AS opening_id,
      bo.type AS opening_type,
      bo.cards,
      bo.pc_gained,
      bo.duplicate_cards,
      b.price_pc
    FROM selected_users su
    LEFT JOIN public.booster_openings bo ON bo.user_id = su.user_id
    LEFT JOIN public.boosters b ON b.id = bo.booster_id
  ),
  opening_stats AS (
    SELECT
      ob.user_id,
      COUNT(ob.opening_id)::numeric AS total_openings,
      COALESCE(AVG(ob.pc_gained::numeric), 0::numeric) AS avg_pc_gained,
      CASE
        WHEN COUNT(ob.opening_id) = 0 THEN 0::numeric
        ELSE COALESCE(
          SUM(
            CASE
              WHEN ob.opening_type = 'SHOP'::public."OpeningType" THEN COALESCE(ob.price_pc, 0)
              ELSE 0
            END
          ),
          0
        )::numeric / COUNT(ob.opening_id)::numeric
      END AS avg_pc_spent,
      COALESCE(SUM(ob.duplicate_cards), 0)::numeric AS duplicate_cards_total
    FROM opening_base ob
    GROUP BY ob.user_id
  ),
  drop_stats AS (
    SELECT
      ob.user_id,
      COUNT(*)::numeric AS total_drop_cards,
      COUNT(*) FILTER (
        WHERE c.rarity IN ('LEGENDS'::public."Rarity", 'WORLD_CLASS'::public."Rarity")
      )::numeric AS big_pull_cards
    FROM opening_base ob
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE
        WHEN ob.cards IS NULL THEN '[]'::jsonb
        WHEN jsonb_typeof(ob.cards::jsonb) = 'array' THEN ob.cards::jsonb
        ELSE '[]'::jsonb
      END
    ) AS opened(card_id)
    JOIN public.cards c ON c.id = opened.card_id
    GROUP BY ob.user_id
  )
  SELECT
    r.user_id,
    r.username,
    r.avatar_url,
    r.leaderboard_position,
    r.weighted_score,
    CASE
      WHEN COALESCE(ds.total_drop_cards, 0) = 0 THEN 0::numeric
      ELSE (COALESCE(os.duplicate_cards_total, 0) * 100.0) / ds.total_drop_cards
    END AS duplicate_rate,
    CASE
      WHEN COALESCE(ds.total_drop_cards, 0) = 0 THEN 0::numeric
      ELSE (COALESCE(ds.big_pull_cards, 0) * 100.0) / ds.total_drop_cards
    END AS big_pull_rate,
    COALESCE(os.avg_pc_gained, 0::numeric) AS avg_pc_gained,
    COALESCE(os.avg_pc_spent, 0::numeric) AS avg_pc_spent
  FROM ranked r
  JOIN selected_users su ON su.user_id = r.user_id
  LEFT JOIN opening_stats os ON os.user_id = r.user_id
  LEFT JOIN drop_stats ds ON ds.user_id = r.user_id
  ORDER BY r.leaderboard_position ASC;
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard_matrix_players(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_matrix_players(uuid) TO authenticated;
