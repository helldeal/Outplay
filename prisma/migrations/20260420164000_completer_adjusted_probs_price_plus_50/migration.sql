-- Card completer pricing fix:
-- - Re-normalize probabilities on remaining rarities only
-- - Apply +50% margin
-- - When only one rarity remains, adjusted probability is 100%

CREATE OR REPLACE FUNCTION public.get_card_completer_offer(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user_id uuid;
  v_premium_booster RECORD;
  v_missing_count int := 0;
  v_missing_rookie int := 0;
  v_missing_challenger int := 0;
  v_missing_champion int := 0;
  v_missing_world_class int := 0;
  v_missing_legends int := 0;

  v_raw_prob_rookie numeric := 0;
  v_raw_prob_challenger numeric := 0;
  v_raw_prob_champion numeric := 0;
  v_raw_prob_world_class numeric := 0;
  v_raw_prob_legends numeric := 0;

  v_adj_prob_rookie numeric := 0;
  v_adj_prob_challenger numeric := 0;
  v_adj_prob_champion numeric := 0;
  v_adj_prob_world_class numeric := 0;
  v_adj_prob_legends numeric := 0;

  v_available_probability_mass numeric := 0;
  v_average_probability numeric := 0;
  v_rarity_count_for_avg int := 0;
  v_dynamic_price numeric := 0;
  v_final_price int := 0;
  v_missing_card_ids text[] := ARRAY[]::text[];
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated user';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'You can only request your own card completer offer';
  END IF;

  v_target_user_id := p_user_id;

  SELECT b.id, b.series_id, b.price_pc, b.drop_rates
  INTO v_premium_booster
  FROM public.boosters b
  JOIN public.users u ON u.id = v_target_user_id
  WHERE b.type = 'PREMIUM'::public."BoosterType"
    AND b.is_daily_only = false
    AND (u.target_series_id IS NULL OR b.series_id = u.target_series_id)
  ORDER BY
    CASE WHEN u.target_series_id IS NOT NULL AND b.series_id = u.target_series_id THEN 0 ELSE 1 END,
    b.created_at ASC
  LIMIT 1;

  IF v_premium_booster.id IS NULL THEN
    SELECT b.id, b.series_id, b.price_pc, b.drop_rates
    INTO v_premium_booster
    FROM public.boosters b
    WHERE b.type = 'PREMIUM'::public."BoosterType"
      AND b.is_daily_only = false
    ORDER BY b.created_at ASC
    LIMIT 1;
  END IF;

  IF v_premium_booster.id IS NULL THEN
    RAISE EXCEPTION 'No premium booster found for completer pricing';
  END IF;

  WITH missing AS (
    SELECT c.id, c.rarity
    FROM public.cards c
    LEFT JOIN public.user_cards uc
      ON uc.card_id = c.id
     AND uc.user_id = v_target_user_id
    WHERE uc.card_id IS NULL
  )
  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE rarity = 'ROOKIE'::public."Rarity")::int,
    COUNT(*) FILTER (WHERE rarity = 'CHALLENGER'::public."Rarity")::int,
    COUNT(*) FILTER (WHERE rarity = 'CHAMPION'::public."Rarity")::int,
    COUNT(*) FILTER (WHERE rarity = 'WORLD_CLASS'::public."Rarity")::int,
    COUNT(*) FILTER (WHERE rarity = 'LEGENDS'::public."Rarity")::int,
    COALESCE(array_agg(id ORDER BY id DESC), ARRAY[]::text[])
  INTO
    v_missing_count,
    v_missing_rookie,
    v_missing_challenger,
    v_missing_champion,
    v_missing_world_class,
    v_missing_legends,
    v_missing_card_ids
  FROM missing;

  v_raw_prob_legends := COALESCE((v_premium_booster.drop_rates ->> 'LEGENDS')::numeric, 0) / 100.0;
  v_raw_prob_world_class := COALESCE((v_premium_booster.drop_rates ->> 'WORLD_CLASS')::numeric, 0) / 100.0;
  v_raw_prob_champion := COALESCE((v_premium_booster.drop_rates ->> 'CHAMPION')::numeric, 0) / 100.0;
  v_raw_prob_challenger := COALESCE((v_premium_booster.drop_rates ->> 'CHALLENGER')::numeric, 0) / 100.0;
  v_raw_prob_rookie := GREATEST(
    0,
    1.0 - (v_raw_prob_legends + v_raw_prob_world_class + v_raw_prob_champion + v_raw_prob_challenger)
  );

  IF v_missing_count > 0 THEN
    v_available_probability_mass :=
      (CASE WHEN v_missing_legends > 0 THEN v_raw_prob_legends ELSE 0 END) +
      (CASE WHEN v_missing_world_class > 0 THEN v_raw_prob_world_class ELSE 0 END) +
      (CASE WHEN v_missing_champion > 0 THEN v_raw_prob_champion ELSE 0 END) +
      (CASE WHEN v_missing_challenger > 0 THEN v_raw_prob_challenger ELSE 0 END) +
      (CASE WHEN v_missing_rookie > 0 THEN v_raw_prob_rookie ELSE 0 END);

    IF v_available_probability_mass > 0 THEN
      v_adj_prob_legends := CASE WHEN v_missing_legends > 0 THEN v_raw_prob_legends / v_available_probability_mass ELSE 0 END;
      v_adj_prob_world_class := CASE WHEN v_missing_world_class > 0 THEN v_raw_prob_world_class / v_available_probability_mass ELSE 0 END;
      v_adj_prob_champion := CASE WHEN v_missing_champion > 0 THEN v_raw_prob_champion / v_available_probability_mass ELSE 0 END;
      v_adj_prob_challenger := CASE WHEN v_missing_challenger > 0 THEN v_raw_prob_challenger / v_available_probability_mass ELSE 0 END;
      v_adj_prob_rookie := CASE WHEN v_missing_rookie > 0 THEN v_raw_prob_rookie / v_available_probability_mass ELSE 0 END;
    ELSE
      v_adj_prob_legends := CASE WHEN v_missing_legends > 0 THEN (v_missing_legends::numeric / v_missing_count::numeric) ELSE 0 END;
      v_adj_prob_world_class := CASE WHEN v_missing_world_class > 0 THEN (v_missing_world_class::numeric / v_missing_count::numeric) ELSE 0 END;
      v_adj_prob_champion := CASE WHEN v_missing_champion > 0 THEN (v_missing_champion::numeric / v_missing_count::numeric) ELSE 0 END;
      v_adj_prob_challenger := CASE WHEN v_missing_challenger > 0 THEN (v_missing_challenger::numeric / v_missing_count::numeric) ELSE 0 END;
      v_adj_prob_rookie := CASE WHEN v_missing_rookie > 0 THEN (v_missing_rookie::numeric / v_missing_count::numeric) ELSE 0 END;
    END IF;

    v_rarity_count_for_avg :=
      (CASE WHEN v_missing_legends > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN v_missing_world_class > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN v_missing_champion > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN v_missing_challenger > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN v_missing_rookie > 0 THEN 1 ELSE 0 END);

    IF v_rarity_count_for_avg > 0 THEN
      v_average_probability := (
        (CASE WHEN v_missing_legends > 0 THEN v_adj_prob_legends ELSE 0 END) +
        (CASE WHEN v_missing_world_class > 0 THEN v_adj_prob_world_class ELSE 0 END) +
        (CASE WHEN v_missing_champion > 0 THEN v_adj_prob_champion ELSE 0 END) +
        (CASE WHEN v_missing_challenger > 0 THEN v_adj_prob_challenger ELSE 0 END) +
        (CASE WHEN v_missing_rookie > 0 THEN v_adj_prob_rookie ELSE 0 END)
      ) / v_rarity_count_for_avg::numeric;
    ELSE
      v_average_probability := 0;
    END IF;

    v_dynamic_price :=
      v_premium_booster.price_pc::numeric
      * (1 + (1 - LEAST(1, GREATEST(0, v_average_probability))))
      * 1.50;

    v_final_price := GREATEST(1, CEIL(v_dynamic_price))::int;
  ELSE
    v_average_probability := 0;
    v_final_price := 0;
  END IF;

  RETURN jsonb_build_object(
    'canPurchase', v_missing_count > 0,
    'pricePc', v_final_price,
    'missingCount', v_missing_count,
    'missingCardIds', v_missing_card_ids,
    'basePremiumBoosterId', v_premium_booster.id,
    'basePremiumPricePc', v_premium_booster.price_pc,
    'premiumDropRates', jsonb_build_object(
      'LEGENDS', ROUND(v_adj_prob_legends * 100, 4),
      'WORLD_CLASS', ROUND(v_adj_prob_world_class * 100, 4),
      'CHAMPION', ROUND(v_adj_prob_champion * 100, 4),
      'CHALLENGER', ROUND(v_adj_prob_challenger * 100, 4),
      'ROOKIE', ROUND(v_adj_prob_rookie * 100, 4)
    ),
    'missingByRarity', jsonb_build_object(
      'LEGENDS', v_missing_legends,
      'WORLD_CLASS', v_missing_world_class,
      'CHAMPION', v_missing_champion,
      'CHALLENGER', v_missing_challenger,
      'ROOKIE', v_missing_rookie
    ),
    'effectiveHitChancePercent', ROUND(v_average_probability * 100, 4),
    'averageProbabilityPercent', ROUND(v_average_probability * 100, 4)
  );
END;
$$;
