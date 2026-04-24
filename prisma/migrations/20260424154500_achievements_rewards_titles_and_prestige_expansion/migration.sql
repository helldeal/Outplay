-- Achievements tuning:
-- - reward titles in English for recently added achievements
-- - economy spender naming progression and extra tier
-- - duplicate magnet reward adjustment + extra 1000 duplicates tier
-- - add LoL 100 cards achievement in Esport
-- - add many more Prestige achievements

UPDATE public.achievement_definitions
SET
  category = 'Economy',
  name = 'Big Spender I'
WHERE code = 'ECO_SPENDER_I';

UPDATE public.achievement_definitions
SET
  category = 'Economy',
  name = 'Big Spender III'
WHERE code = 'SPENDER_II';

UPDATE public.achievement_definitions
SET
  category = 'Economy',
  name = 'Big Spender IV',
  reward_title = 'Investor'
WHERE code = 'ECO_SPENDER_II';

UPDATE public.achievement_definitions
SET
  category = 'Economy',
  reward_booster_type = 'PREMIUM'::public."BoosterType",
  reward_title = 'Recycling King'
WHERE code = 'ECO_DUPLICATE_MAGNET';

UPDATE public.achievement_definitions
SET
  category = 'Esport',
  reward_title = 'Rift Icon'
WHERE code = 'LOL_LEGENDARY_ICON';

UPDATE public.achievement_definitions
SET
  reward_title = 'Completer Veteran'
WHERE code = 'COMPLETER_GRINDER';

UPDATE public.achievement_definitions
SET
  reward_title = 'Prestige Ascendant'
WHERE code = 'PRESTIGE_ASCENDANT';

UPDATE public.achievement_definitions
SET
  reward_title = 'Prestige Immortal'
WHERE code = 'PRESTIGE_IMMORTAL';

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
  ('ECO_SPENDER_V', 'Big Spender V', 'Economy', 'Depense 250 000 PC dans la boutique.', 'total_pc_spent', 250000, 0, 'GODPACK', 'High Roller', 860),
  ('ECO_DUPLICATE_MAGNET_II', 'Duplicate Magnet II', 'Economy', 'Accumule 1000 doublons recycles.', 'duplicate_cards_total', 1000, 0, 'GODPACK', 'Duplicate Emperor', 980),

  ('LOL_ELITE_100', 'LoL Elite 100', 'Esport', 'Obtiens 100 cartes League of Legends.', 'lol_unique_cards', 100, 0, 'GODPACK', 'LoL Icon', 980),

  ('PRESTIGE_COLLECTOR_I', 'Prestige Collector I', 'Prestige', 'Atteins 12 cartes prestige 1★.', 'prestige_cards_1star', 12, 1800, NULL, NULL, 340),
  ('PRESTIGE_COLLECTOR_II', 'Prestige Collector II', 'Prestige', 'Atteins 25 cartes prestige 1★.', 'prestige_cards_1star', 25, 0, 'PREMIUM', 'Prestige Collector', 520),
  ('PRESTIGE_COLLECTOR_III', 'Prestige Collector III', 'Prestige', 'Atteins 40 cartes prestige 1★.', 'prestige_cards_1star', 40, 0, 'GODPACK', 'Prestige Curator', 820),

  ('PRESTIGE_ASCENT_I', 'Prestige Ascent I', 'Prestige', 'Atteins 6 cartes prestige 2★.', 'prestige_cards_2star', 6, 2200, NULL, NULL, 420),
  ('PRESTIGE_ASCENT_II', 'Prestige Ascent II', 'Prestige', 'Atteins 10 cartes prestige 2★.', 'prestige_cards_2star', 10, 0, 'PREMIUM', 'Prestige Vanguard', 660),
  ('PRESTIGE_ASCENT_III', 'Prestige Ascent III', 'Prestige', 'Atteins 15 cartes prestige 2★.', 'prestige_cards_2star', 15, 0, 'GODPACK', 'Prestige Warlord', 980),

  ('PRESTIGE_CROWN_I', 'Prestige Crown I', 'Prestige', 'Atteins 3 cartes prestige 3★.', 'prestige_cards_3star', 3, 2600, NULL, NULL, 560),
  ('PRESTIGE_CROWN_II', 'Prestige Crown II', 'Prestige', 'Atteins 5 cartes prestige 3★.', 'prestige_cards_3star', 5, 0, 'GODPACK', 'Prestige Crowned', 980),
  ('PRESTIGE_CROWN_III', 'Prestige Crown III', 'Prestige', 'Atteins 8 cartes prestige 3★.', 'prestige_cards_3star', 8, 0, 'GODPACK', 'Prestige Eternal', 1320)
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
