-- Achievements refresh:
-- - remove deprecated streak achievements
-- - add Economy, Esport LoL, Completeur and Prestige achievements
-- - extend achievement metrics with completer/prestige/lol advanced keys

DO $$
BEGIN
  IF to_regprocedure('public._achievement_metric_base_20260424(uuid,text)') IS NULL
     AND to_regprocedure('public._achievement_metric(uuid,text)') IS NOT NULL THEN
    ALTER FUNCTION public._achievement_metric(uuid, text)
      RENAME TO _achievement_metric_base_20260424;
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
    WHEN 'completer_opened_count' THEN
      SELECT COUNT(*)::numeric
      INTO v_value
      FROM public.booster_openings bo
      WHERE bo.user_id = p_user_id
        AND bo.type = 'COMPLETER'::public."OpeningType";

    WHEN 'prestige_cards_1star' THEN
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
        WHERE bo.user_id = p_user_id
        GROUP BY drawn.card_id
        HAVING COUNT(*) >= 2
      ) starred;

    WHEN 'prestige_cards_2star' THEN
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
        WHERE bo.user_id = p_user_id
        GROUP BY drawn.card_id
        HAVING COUNT(*) >= 5
      ) starred;

    WHEN 'prestige_cards_3star' THEN
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
        WHERE bo.user_id = p_user_id
        GROUP BY drawn.card_id
        HAVING COUNT(*) >= 10
      ) starred;

    WHEN 'lol_world_class_plus_cards' THEN
      SELECT COUNT(*)::numeric
      INTO v_value
      FROM public.user_cards uc
      JOIN public.cards c ON c.id = uc.card_id
      JOIN public.games g ON g.id = c.game_id
      WHERE uc.user_id = p_user_id
        AND g.slug = 'league-of-legends'
        AND c.rarity IN ('WORLD_CLASS'::public."Rarity", 'LEGENDS'::public."Rarity");

    WHEN 'lol_legends_cards' THEN
      SELECT COUNT(*)::numeric
      INTO v_value
      FROM public.user_cards uc
      JOIN public.cards c ON c.id = uc.card_id
      JOIN public.games g ON g.id = c.game_id
      WHERE uc.user_id = p_user_id
        AND g.slug = 'league-of-legends'
        AND c.rarity = 'LEGENDS'::public."Rarity";

    ELSE
      IF to_regprocedure('public._achievement_metric_base_20260424(uuid,text)') IS NOT NULL THEN
        SELECT public._achievement_metric_base_20260424(p_user_id, p_metric_key)
        INTO v_value;
      ELSE
        v_value := 0;
      END IF;
  END CASE;

  RETURN COALESCE(v_value, 0);
END;
$$;

DELETE FROM public.achievement_definitions
WHERE code IN ('STREAK_KEEPER', 'STREAK_MASTER');

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
  ('ECO_SPENDER_I', 'PC Spender I', 'Economie', 'Depense 25 000 PC dans la boutique.', 'total_pc_spent', 25000, 1800, NULL, NULL, 220),
  ('ECO_SPENDER_II', 'PC Spender II', 'Economie', 'Depense 100 000 PC dans la boutique.', 'total_pc_spent', 100000, 0, 'PREMIUM', 'Investisseur', 420),
  ('ECO_DUPLICATE_MAGNET', 'Duplicate Magnet', 'Economie', 'Accumule 500 doublons recycles.', 'duplicate_cards_total', 500, 0, 'GODPACK', 'Roi du Recyclage', 700),

  ('LOL_SCOUT', 'LoL Scout', 'Esport LoL', 'Obtiens 25 cartes League of Legends.', 'lol_unique_cards', 25, 0, 'LUCK', NULL, 260),
  ('LOL_WORLD_ELITE', 'LoL World Elite', 'Esport LoL', 'Obtiens 5 cartes LoL World Class ou Legends.', 'lol_world_class_plus_cards', 5, 2200, NULL, NULL, 520),
  ('LOL_LEGENDARY_ICON', 'LoL Legendary Icon', 'Esport LoL', 'Obtiens 1 carte Legends de League of Legends.', 'lol_legends_cards', 1, 0, 'PREMIUM', 'Icône de la Faille', 900),

  ('COMPLETER_FIRST', 'Completer First', 'Completeur', 'Utilise le Completeur de cartes une fois.', 'completer_opened_count', 1, 600, NULL, NULL, 120),
  ('COMPLETER_REGULAR', 'Completer Regular', 'Completeur', 'Utilise le Completeur de cartes 10 fois.', 'completer_opened_count', 10, 0, 'LUCK', NULL, 320),
  ('COMPLETER_GRINDER', 'Completer Grinder', 'Completeur', 'Utilise le Completeur de cartes 30 fois.', 'completer_opened_count', 30, 0, 'PREMIUM', 'Completeur Confirmé', 620),

  ('PRESTIGE_INITIATE', 'Prestige Initiate', 'Prestige', 'Atteins 5 cartes prestige 1★.', 'prestige_cards_1star', 5, 1400, NULL, NULL, 260),
  ('PRESTIGE_ASCENDANT', 'Prestige Ascendant', 'Prestige', 'Atteins 3 cartes prestige 2★.', 'prestige_cards_2star', 3, 0, 'PREMIUM', 'Ascendant Prestige', 560),
  ('PRESTIGE_IMMORTAL', 'Prestige Immortal', 'Prestige', 'Atteins 1 carte prestige 3★.', 'prestige_cards_3star', 1, 0, 'GODPACK', 'Immortel Prestige', 980)
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
