-- Prestige tuning v2:
-- - Duplicate Magnet back to 500
-- - Increase Prestige targets further
-- - Add Prestige achievements by rarity
-- - Extend achievement metric function with prestige rarity keys

DO $$
BEGIN
  IF to_regprocedure('public._achievement_metric_base_20260424b(uuid,text)') IS NULL
     AND to_regprocedure('public._achievement_metric(uuid,text)') IS NOT NULL THEN
    ALTER FUNCTION public._achievement_metric(uuid, text)
      RENAME TO _achievement_metric_base_20260424b;
  END IF;
END
$$;

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
    WHEN 'prestige_champion_1star' THEN
      SELECT COUNT(*)::numeric
      INTO v_value
      FROM (
        SELECT drawn.card_id
        FROM public.booster_openings bo
        JOIN LATERAL jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
            ELSE '[]'::jsonb
          END
        ) AS drawn(card_id) ON true
        JOIN public.cards c ON c.id::text = drawn.card_id
        WHERE bo.user_id = p_user_id
          AND c.rarity = 'CHAMPION'::public."Rarity"
        GROUP BY drawn.card_id
        HAVING COUNT(*) >= 2
      ) starred;

    WHEN 'prestige_world_class_1star' THEN
      SELECT COUNT(*)::numeric
      INTO v_value
      FROM (
        SELECT drawn.card_id
        FROM public.booster_openings bo
        JOIN LATERAL jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
            ELSE '[]'::jsonb
          END
        ) AS drawn(card_id) ON true
        JOIN public.cards c ON c.id::text = drawn.card_id
        WHERE bo.user_id = p_user_id
          AND c.rarity = 'WORLD_CLASS'::public."Rarity"
        GROUP BY drawn.card_id
        HAVING COUNT(*) >= 2
      ) starred;

    WHEN 'prestige_legends_1star' THEN
      SELECT COUNT(*)::numeric
      INTO v_value
      FROM (
        SELECT drawn.card_id
        FROM public.booster_openings bo
        JOIN LATERAL jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
            ELSE '[]'::jsonb
          END
        ) AS drawn(card_id) ON true
        JOIN public.cards c ON c.id::text = drawn.card_id
        WHERE bo.user_id = p_user_id
          AND c.rarity = 'LEGENDS'::public."Rarity"
        GROUP BY drawn.card_id
        HAVING COUNT(*) >= 2
      ) starred;

    WHEN 'prestige_champion_2star' THEN
      SELECT COUNT(*)::numeric
      INTO v_value
      FROM (
        SELECT drawn.card_id
        FROM public.booster_openings bo
        JOIN LATERAL jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
            ELSE '[]'::jsonb
          END
        ) AS drawn(card_id) ON true
        JOIN public.cards c ON c.id::text = drawn.card_id
        WHERE bo.user_id = p_user_id
          AND c.rarity = 'CHAMPION'::public."Rarity"
        GROUP BY drawn.card_id
        HAVING COUNT(*) >= 5
      ) starred;

    WHEN 'prestige_world_class_2star' THEN
      SELECT COUNT(*)::numeric
      INTO v_value
      FROM (
        SELECT drawn.card_id
        FROM public.booster_openings bo
        JOIN LATERAL jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
            ELSE '[]'::jsonb
          END
        ) AS drawn(card_id) ON true
        JOIN public.cards c ON c.id::text = drawn.card_id
        WHERE bo.user_id = p_user_id
          AND c.rarity = 'WORLD_CLASS'::public."Rarity"
        GROUP BY drawn.card_id
        HAVING COUNT(*) >= 5
      ) starred;

    WHEN 'prestige_legends_2star' THEN
      SELECT COUNT(*)::numeric
      INTO v_value
      FROM (
        SELECT drawn.card_id
        FROM public.booster_openings bo
        JOIN LATERAL jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(bo.cards::jsonb) = 'array' THEN bo.cards::jsonb
            ELSE '[]'::jsonb
          END
        ) AS drawn(card_id) ON true
        JOIN public.cards c ON c.id::text = drawn.card_id
        WHERE bo.user_id = p_user_id
          AND c.rarity = 'LEGENDS'::public."Rarity"
        GROUP BY drawn.card_id
        HAVING COUNT(*) >= 5
      ) starred;

    ELSE
      IF to_regprocedure('public._achievement_metric_base_20260424b(uuid,text)') IS NOT NULL THEN
        SELECT public._achievement_metric_base_20260424b(p_user_id, p_metric_key)
        INTO v_value;
      ELSIF to_regprocedure('public._achievement_metric_base_20260424(uuid,text)') IS NOT NULL THEN
        SELECT public._achievement_metric_base_20260424(p_user_id, p_metric_key)
        INTO v_value;
      ELSE
        v_value := 0;
      END IF;
  END CASE;

  RETURN COALESCE(v_value, 0);
END;
$$;

UPDATE public.achievement_definitions
SET
  target_value = 500,
  description = 'Accumule 500 doublons recycles.',
  reward_pc = 1800,
  reward_booster_type = NULL,
  reward_title = 'Recycling King',
  leaderboard_points = 620
WHERE code = 'ECO_DUPLICATE_MAGNET';

UPDATE public.achievement_definitions
SET
  target_value = 15,
  description = 'Atteins 15 cartes prestige 1★.',
  reward_pc = 1600,
  reward_booster_type = NULL,
  leaderboard_points = 320
WHERE code = 'PRESTIGE_INITIATE';

UPDATE public.achievement_definitions
SET
  target_value = 30,
  description = 'Atteins 30 cartes prestige 1★.',
  reward_pc = 2100,
  reward_booster_type = NULL,
  leaderboard_points = 460
WHERE code = 'PRESTIGE_COLLECTOR_I';

UPDATE public.achievement_definitions
SET
  target_value = 50,
  description = 'Atteins 50 cartes prestige 1★.',
  reward_pc = 0,
  reward_booster_type = 'PREMIUM'::public."BoosterType",
  leaderboard_points = 700
WHERE code = 'PRESTIGE_COLLECTOR_II';

UPDATE public.achievement_definitions
SET
  target_value = 80,
  description = 'Atteins 80 cartes prestige 1★.',
  reward_pc = 3600,
  reward_booster_type = NULL,
  leaderboard_points = 980
WHERE code = 'PRESTIGE_COLLECTOR_III';

UPDATE public.achievement_definitions
SET
  target_value = 8,
  description = 'Atteins 8 cartes prestige 2★.',
  reward_pc = 2200,
  reward_booster_type = NULL,
  leaderboard_points = 520
WHERE code = 'PRESTIGE_ASCENDANT';

UPDATE public.achievement_definitions
SET
  target_value = 14,
  description = 'Atteins 14 cartes prestige 2★.',
  reward_pc = 2800,
  reward_booster_type = NULL,
  leaderboard_points = 700
WHERE code = 'PRESTIGE_ASCENT_I';

UPDATE public.achievement_definitions
SET
  target_value = 22,
  description = 'Atteins 22 cartes prestige 2★.',
  reward_pc = 0,
  reward_booster_type = 'PREMIUM'::public."BoosterType",
  leaderboard_points = 940
WHERE code = 'PRESTIGE_ASCENT_II';

UPDATE public.achievement_definitions
SET
  target_value = 35,
  description = 'Atteins 35 cartes prestige 2★.',
  reward_pc = 4200,
  reward_booster_type = NULL,
  leaderboard_points = 1240
WHERE code = 'PRESTIGE_ASCENT_III';

UPDATE public.achievement_definitions
SET
  target_value = 3,
  description = 'Atteins 3 cartes prestige 3★.',
  reward_pc = 2600,
  reward_booster_type = NULL,
  leaderboard_points = 820
WHERE code = 'PRESTIGE_IMMORTAL';

UPDATE public.achievement_definitions
SET
  target_value = 6,
  description = 'Atteins 6 cartes prestige 3★.',
  reward_pc = 3200,
  reward_booster_type = NULL,
  leaderboard_points = 980
WHERE code = 'PRESTIGE_CROWN_I';

UPDATE public.achievement_definitions
SET
  target_value = 10,
  description = 'Atteins 10 cartes prestige 3★.',
  reward_pc = 0,
  reward_booster_type = 'PREMIUM'::public."BoosterType",
  leaderboard_points = 1260
WHERE code = 'PRESTIGE_CROWN_II';

UPDATE public.achievement_definitions
SET
  target_value = 15,
  description = 'Atteins 15 cartes prestige 3★.',
  reward_pc = 0,
  reward_booster_type = 'GODPACK'::public."BoosterType",
  leaderboard_points = 1700
WHERE code = 'PRESTIGE_CROWN_III';

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
  ('PRESTIGE_CHAMPION_FORGE', 'Champion Forge', 'Prestige', 'Atteins 20 cartes Champion en prestige 1★.', 'prestige_champion_1star', 20, 1800, NULL, NULL, 420),
  ('PRESTIGE_WORLD_CLASS_FORGE', 'World Class Forge', 'Prestige', 'Atteins 8 cartes World Class en prestige 1★.', 'prestige_world_class_1star', 8, 2400, NULL, NULL, 620),
  ('PRESTIGE_LEGENDS_FORGE', 'Legends Forge', 'Prestige', 'Atteins 3 cartes Legends en prestige 1★.', 'prestige_legends_1star', 3, 0, 'PREMIUM', 'Legends Forger', 860),

  ('PRESTIGE_CHAMPION_ASCENT', 'Champion Ascent', 'Prestige', 'Atteins 8 cartes Champion en prestige 2★.', 'prestige_champion_2star', 8, 2600, NULL, NULL, 700),
  ('PRESTIGE_WORLD_CLASS_ASCENT', 'World Class Ascent', 'Prestige', 'Atteins 4 cartes World Class en prestige 2★.', 'prestige_world_class_2star', 4, 3200, NULL, 'World Class Ascendant', 940),
  ('PRESTIGE_LEGENDS_ASCENT', 'Legends Ascent', 'Prestige', 'Atteins 2 cartes Legends en prestige 2★.', 'prestige_legends_2star', 2, 0, 'PREMIUM', 'Legends Ascendant', 1220)
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
