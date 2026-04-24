-- Rebalance achievements difficulty and rewards
-- - Better name for LoL 100 achievement, PC reward only
-- - Larger intervals for Economy / Esport / Prestige
-- - Godpack used sparingly

-- Economy: Big Spender progression cleanup
UPDATE public.achievement_definitions
SET
  category = 'Economy',
  name = 'Big Spender I',
  description = 'Depense 20 000 PC dans la boutique.',
  target_value = 20000,
  reward_pc = 900,
  reward_booster_type = NULL,
  reward_title = NULL,
  leaderboard_points = 120
WHERE code = 'SPENDER_I';

UPDATE public.achievement_definitions
SET
  category = 'Economy',
  name = 'Big Spender II',
  description = 'Depense 60 000 PC dans la boutique.',
  target_value = 60000,
  reward_pc = 1600,
  reward_booster_type = NULL,
  reward_title = NULL,
  leaderboard_points = 260
WHERE code = 'ECO_SPENDER_I';

UPDATE public.achievement_definitions
SET
  category = 'Economy',
  name = 'Big Spender III',
  description = 'Depense 120 000 PC dans la boutique.',
  target_value = 120000,
  reward_pc = 2600,
  reward_booster_type = NULL,
  reward_title = 'Market Shark',
  leaderboard_points = 420
WHERE code = 'SPENDER_II';

UPDATE public.achievement_definitions
SET
  category = 'Economy',
  name = 'Big Spender IV',
  description = 'Depense 220 000 PC dans la boutique.',
  target_value = 220000,
  reward_pc = 0,
  reward_booster_type = 'PREMIUM'::public."BoosterType",
  reward_title = 'Investor',
  leaderboard_points = 640
WHERE code = 'ECO_SPENDER_II';

UPDATE public.achievement_definitions
SET
  category = 'Economy',
  name = 'Big Spender V',
  description = 'Depense 400 000 PC dans la boutique.',
  target_value = 400000,
  reward_pc = 4200,
  reward_booster_type = NULL,
  reward_title = 'High Roller',
  leaderboard_points = 920
WHERE code = 'ECO_SPENDER_V';

UPDATE public.achievement_definitions
SET
  category = 'Economy',
  name = 'Duplicate Magnet',
  description = 'Accumule 700 doublons recycles.',
  target_value = 700,
  reward_pc = 2200,
  reward_booster_type = NULL,
  reward_title = 'Recycling King',
  leaderboard_points = 760
WHERE code = 'ECO_DUPLICATE_MAGNET';

UPDATE public.achievement_definitions
SET
  category = 'Economy',
  name = 'Duplicate Magnet II',
  description = 'Accumule 1000 doublons recycles.',
  target_value = 1000,
  reward_pc = 0,
  reward_booster_type = 'GODPACK'::public."BoosterType",
  reward_title = 'Duplicate Emperor',
  leaderboard_points = 1180
WHERE code = 'ECO_DUPLICATE_MAGNET_II';

-- Esport (LoL): harder targets, PC-focused rewards, better naming for 100 cards
UPDATE public.achievement_definitions
SET
  category = 'Esport',
  name = 'LoL Scout',
  description = 'Obtiens 30 cartes League of Legends.',
  target_value = 30,
  reward_pc = 1200,
  reward_booster_type = NULL,
  reward_title = NULL,
  leaderboard_points = 300
WHERE code = 'LOL_SCOUT';

UPDATE public.achievement_definitions
SET
  category = 'Esport',
  name = 'LoL World Elite',
  description = 'Obtiens 8 cartes LoL World Class ou Legends.',
  target_value = 8,
  reward_pc = 2400,
  reward_booster_type = NULL,
  reward_title = NULL,
  leaderboard_points = 620
WHERE code = 'LOL_WORLD_ELITE';

UPDATE public.achievement_definitions
SET
  category = 'Esport',
  name = 'LoL Legendary Icon',
  description = 'Obtiens 2 cartes Legends de League of Legends.',
  target_value = 2,
  reward_pc = 3200,
  reward_booster_type = NULL,
  reward_title = 'Rift Icon',
  leaderboard_points = 980
WHERE code = 'LOL_LEGENDARY_ICON';

UPDATE public.achievement_definitions
SET
  category = 'Esport',
  name = 'LoL Dynasty',
  description = 'Obtiens 100 cartes League of Legends.',
  target_value = 100,
  reward_pc = 3600,
  reward_booster_type = NULL,
  reward_title = 'LoL Dynasty',
  leaderboard_points = 1220
WHERE code = 'LOL_ELITE_100';

-- Prestige: bigger intervals, smoother scaling, only one very late Godpack
UPDATE public.achievement_definitions
SET
  category = 'Prestige',
  name = 'Prestige Initiate',
  description = 'Atteins 10 cartes prestige 1★.',
  target_value = 10,
  reward_pc = 1400,
  reward_booster_type = NULL,
  reward_title = NULL,
  leaderboard_points = 280
WHERE code = 'PRESTIGE_INITIATE';

UPDATE public.achievement_definitions
SET
  category = 'Prestige',
  name = 'Prestige Collector I',
  description = 'Atteins 20 cartes prestige 1★.',
  target_value = 20,
  reward_pc = 1900,
  reward_booster_type = NULL,
  reward_title = NULL,
  leaderboard_points = 400
WHERE code = 'PRESTIGE_COLLECTOR_I';

UPDATE public.achievement_definitions
SET
  category = 'Prestige',
  name = 'Prestige Collector II',
  description = 'Atteins 35 cartes prestige 1★.',
  target_value = 35,
  reward_pc = 0,
  reward_booster_type = 'PREMIUM'::public."BoosterType",
  reward_title = 'Prestige Collector',
  leaderboard_points = 620
WHERE code = 'PRESTIGE_COLLECTOR_II';

UPDATE public.achievement_definitions
SET
  category = 'Prestige',
  name = 'Prestige Collector III',
  description = 'Atteins 55 cartes prestige 1★.',
  target_value = 55,
  reward_pc = 3200,
  reward_booster_type = NULL,
  reward_title = 'Prestige Curator',
  leaderboard_points = 860
WHERE code = 'PRESTIGE_COLLECTOR_III';

UPDATE public.achievement_definitions
SET
  category = 'Prestige',
  name = 'Prestige Ascendant',
  description = 'Atteins 5 cartes prestige 2★.',
  target_value = 5,
  reward_pc = 1800,
  reward_booster_type = NULL,
  reward_title = 'Prestige Ascendant',
  leaderboard_points = 420
WHERE code = 'PRESTIGE_ASCENDANT';

UPDATE public.achievement_definitions
SET
  category = 'Prestige',
  name = 'Prestige Ascent I',
  description = 'Atteins 9 cartes prestige 2★.',
  target_value = 9,
  reward_pc = 2400,
  reward_booster_type = NULL,
  reward_title = NULL,
  leaderboard_points = 560
WHERE code = 'PRESTIGE_ASCENT_I';

UPDATE public.achievement_definitions
SET
  category = 'Prestige',
  name = 'Prestige Ascent II',
  description = 'Atteins 15 cartes prestige 2★.',
  target_value = 15,
  reward_pc = 0,
  reward_booster_type = 'PREMIUM'::public."BoosterType",
  reward_title = 'Prestige Vanguard',
  leaderboard_points = 760
WHERE code = 'PRESTIGE_ASCENT_II';

UPDATE public.achievement_definitions
SET
  category = 'Prestige',
  name = 'Prestige Ascent III',
  description = 'Atteins 24 cartes prestige 2★.',
  target_value = 24,
  reward_pc = 3400,
  reward_booster_type = NULL,
  reward_title = 'Prestige Warlord',
  leaderboard_points = 980
WHERE code = 'PRESTIGE_ASCENT_III';

UPDATE public.achievement_definitions
SET
  category = 'Prestige',
  name = 'Prestige Immortal',
  description = 'Atteins 2 cartes prestige 3★.',
  target_value = 2,
  reward_pc = 2200,
  reward_booster_type = NULL,
  reward_title = 'Prestige Immortal',
  leaderboard_points = 720
WHERE code = 'PRESTIGE_IMMORTAL';

UPDATE public.achievement_definitions
SET
  category = 'Prestige',
  name = 'Prestige Crown I',
  description = 'Atteins 4 cartes prestige 3★.',
  target_value = 4,
  reward_pc = 2800,
  reward_booster_type = NULL,
  reward_title = NULL,
  leaderboard_points = 860
WHERE code = 'PRESTIGE_CROWN_I';

UPDATE public.achievement_definitions
SET
  category = 'Prestige',
  name = 'Prestige Crown II',
  description = 'Atteins 7 cartes prestige 3★.',
  target_value = 7,
  reward_pc = 0,
  reward_booster_type = 'PREMIUM'::public."BoosterType",
  reward_title = 'Prestige Crowned',
  leaderboard_points = 1120
WHERE code = 'PRESTIGE_CROWN_II';

UPDATE public.achievement_definitions
SET
  category = 'Prestige',
  name = 'Prestige Crown III',
  description = 'Atteins 11 cartes prestige 3★.',
  target_value = 11,
  reward_pc = 0,
  reward_booster_type = 'GODPACK'::public."BoosterType",
  reward_title = 'Prestige Eternal',
  leaderboard_points = 1500
WHERE code = 'PRESTIGE_CROWN_III';
