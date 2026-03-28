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

    WHEN 'referrals_count' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM public.users u
      WHERE u.referred_by_user_id = p_user_id;

    WHEN 'premium_openings_with_3_world_class_plus' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM (
        SELECT bo.id
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
          AND c.rarity IN ('WORLD_CLASS'::public."Rarity", 'LEGENDS'::public."Rarity")
        GROUP BY bo.id
        HAVING COUNT(*) >= 3
      ) qualified;

    WHEN 'premium_openings_with_2_legends_plus' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM (
        SELECT bo.id
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
          AND c.rarity = 'LEGENDS'::public."Rarity"
        GROUP BY bo.id
        HAVING COUNT(*) >= 2
      ) qualified;

    WHEN 'luck_openings_with_2_world_class_plus' THEN
      SELECT COUNT(*)::numeric INTO v_value
      FROM (
        SELECT bo.id
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
          AND c.rarity IN ('WORLD_CLASS'::public."Rarity", 'LEGENDS'::public."Rarity")
        GROUP BY bo.id
        HAVING COUNT(*) >= 2
      ) qualified;

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
  ('REFERRAL_2', 'Parrain Connecté', 'Social', '2 filleuls utilisent ton code de parrainage.', 'referrals_count', 2, 0, 'LUCK', 'Parrain Connecté', 260),
  ('REFERRAL_5', 'Parrain Confirmé', 'Social', '5 filleuls utilisent ton code de parrainage.', 'referrals_count', 5, 0, 'PREMIUM', 'Parrain Confirmé', 520),
  ('REFERRAL_10', 'Parrain Légendaire', 'Social', '10 filleuls utilisent ton code de parrainage.', 'referrals_count', 10, 0, 'GODPACK', 'Parrain Légendaire', 980),

  ('LUCK_ENGINE_I', 'Luck Engine I', 'Chance', 'Obtiens 10 drops World Class+ dans des boosters Luck.', 'luck_world_class_plus_drops_total', 10, 1800, NULL, NULL, 320),
  ('LUCK_ENGINE_II', 'Luck Engine II', 'Chance', 'Obtiens 30 drops World Class+ dans des boosters Luck.', 'luck_world_class_plus_drops_total', 30, 0, 'PREMIUM', 'Luck Engine', 640),
  ('PREMIUM_ENGINE_I', 'Premium Engine I', 'Chance', 'Obtiens 12 drops World Class+ dans des boosters Premium.', 'premium_world_class_plus_drops_total', 12, 2200, NULL, NULL, 380),
  ('PREMIUM_ENGINE_II', 'Premium Engine II', 'Chance', 'Obtiens 35 drops World Class+ dans des boosters Premium.', 'premium_world_class_plus_drops_total', 35, 0, 'PREMIUM', 'Premium Engine', 760),

  ('PREMIUM_TRIPLE_WORLD_CLASS', 'Premium Triple World Class', 'Chance', 'Fais une ouverture Premium avec au moins 3 cartes World Class+.', 'premium_openings_with_3_world_class_plus', 1, 0, 'PREMIUM', 'Triple Threat', 1150),
  ('PREMIUM_DOUBLE_LEGENDS', 'Premium Double Legends', 'Chance', 'Fais une ouverture Premium avec au moins 2 Legends.', 'premium_openings_with_2_legends_plus', 1, 0, 'PREMIUM', 'Double Legends', 1450),
  ('LUCK_DOUBLE_WORLD_CLASS', 'Luck Double World Class', 'Chance', 'Fais une ouverture Luck avec au moins 2 cartes World Class+.', 'luck_openings_with_2_world_class_plus', 1, 0, 'PREMIUM', 'Lucky Double', 900)
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