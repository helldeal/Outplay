-- Add Series S4 "Rift Makers" with LoL cards and boosters.
-- Idempotent migration.

WITH game_data(name, slug, "logoUrl") AS (
  VALUES
    ('League of Legends', 'league-of-legends', '/src/assets/games/league-of-legends.png')
)
INSERT INTO public.games (id, name, slug, "logoUrl")
SELECT
  (
    substr(md5('game:' || slug), 1, 8) || '-' ||
    substr(md5('game:' || slug), 9, 4) || '-' ||
    substr(md5('game:' || slug), 13, 4) || '-' ||
    substr(md5('game:' || slug), 17, 4) || '-' ||
    substr(md5('game:' || slug), 21, 12)
  )::uuid,
  name,
  slug,
  "logoUrl"
FROM game_data
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  "logoUrl" = EXCLUDED."logoUrl";

WITH team_data(name, slug, "logoUrl") AS (
  VALUES
    ('Fnatic', 'fnatic', '/src/assets/teams/old fnatic.svg'),
    ('CLG EU', 'clg-eu', '/src/assets/teams/CLG_EU.webp'),
    ('Gambit', 'gambit', '/src/assets/teams/gambit.png'),
    ('WE', 'we', '/src/assets/teams/team-we.png'),
    ('iG', 'ig', '/src/assets/teams/invictus-gaming.png'),
    ('EDG', 'edg', '/src/assets/teams/edg.png'),
    ('TPA', 'tpa', '/src/assets/teams/Taipei_Assassins_logo.png'),
    ('Samsung White', 'samsung-white', '/src/assets/teams/samsung-galaxy.png'),
    ('Samsung Blue', 'samsung-blue', '/src/assets/teams/samsung-galaxy.png'),
    ('KT Rolster', 'kt-rolster', '/src/assets/teams/kt-rolster.png'),
    ('Roccat', 'roccat', '/src/assets/teams/Team_ROCCAT_logo.svg.png'),
    ('Cloud9', 'cloud9', '/src/assets/teams/cloud9.png'),
    ('TSM', 'tsm', '/src/assets/teams/TSM_Logo.svg'),
    ('SKT T1', 'skt-t1', '/src/assets/teams/skt t1.webp'),
    ('Samsung Galaxy', 'samsung-galaxy', '/src/assets/teams/samsung-galaxy.png'),
    ('CLG', 'clg', '/src/assets/teams/CLG_EU.webp'),
    ('H2K', 'h2k', '/src/assets/teams/H2k-Gaming_logo.png'),
    ('Star Horn Royal Club', 'star-horn-royal-club', '/src/assets/teams/Star-horn-royal-club.png'),
    ('CJ Blaze', 'cj-blaze', '/src/assets/teams/CJ_Entus.webp'),
    ('Invictus Gaming', 'invictus-gaming', '/src/assets/teams/invictus-gaming.png'),
    ('Rox Tigers', 'rox-tigers', '/src/assets/teams/Rox tigers.webp'),
    ('Royal Never Give Up', 'royal-never-give-up', '/src/assets/teams/rng.png')
)
INSERT INTO public.teams (id, name, slug, "logoUrl")
SELECT
  (
    substr(md5('team:' || slug), 1, 8) || '-' ||
    substr(md5('team:' || slug), 9, 4) || '-' ||
    substr(md5('team:' || slug), 13, 4) || '-' ||
    substr(md5('team:' || slug), 17, 4) || '-' ||
    substr(md5('team:' || slug), 21, 12)
  )::uuid,
  name,
  slug,
  "logoUrl"
FROM team_data
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  "logoUrl" = EXCLUDED."logoUrl";

WITH nationality_data(name, code, "flagUrl") AS (
  VALUES
    ('République Tchèque', 'CZ', 'https://flagcdn.com/w80/cz.png'),
    ('Finlande', 'FI', 'https://flagcdn.com/w80/fi.png'),
    ('Allemagne', 'DE', 'https://flagcdn.com/w80/de.png'),
    ('Pays-Bas', 'NL', 'https://flagcdn.com/w80/nl.png'),
    ('Corée', 'KR', 'https://flagcdn.com/w80/kr.png'),
    ('Belgique', 'BE', 'https://flagcdn.com/w80/be.png'),
    ('Danemark', 'DK', 'https://flagcdn.com/w80/dk.png'),
    ('Russie', 'RU', 'https://flagcdn.com/w80/ru.png'),
    ('Ukraine', 'UA', 'https://flagcdn.com/w80/ua.png'),
    ('Chine', 'CN', 'https://flagcdn.com/w80/cn.png'),
    ('Taïwan', 'TW', 'https://flagcdn.com/w80/tw.png'),
    ('Pologne', 'PL', 'https://flagcdn.com/w80/pl.png'),
    ('USA', 'US', 'https://flagcdn.com/w80/us.png'),
    ('Canada', 'CA', 'https://flagcdn.com/w80/ca.png'),
    ('Grèce', 'GR', 'https://flagcdn.com/w80/gr.png'),
    ('Suède', 'SE', 'https://flagcdn.com/w80/se.png'),
    ('France', 'FR', 'https://flagcdn.com/w80/fr.png'),
    ('Espagne', 'ES', 'https://flagcdn.com/w80/es.png')
)
INSERT INTO public.nationalities (id, name, code, "flagUrl")
SELECT
  (
    substr(md5('nationality:' || code), 1, 8) || '-' ||
    substr(md5('nationality:' || code), 9, 4) || '-' ||
    substr(md5('nationality:' || code), 13, 4) || '-' ||
    substr(md5('nationality:' || code), 17, 4) || '-' ||
    substr(md5('nationality:' || code), 21, 12)
  )::uuid,
  name,
  code,
  "flagUrl"
FROM nationality_data
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  "flagUrl" = EXCLUDED."flagUrl";

WITH role_data(game_slug, role_name, role_slug, icon_url) AS (
  VALUES
    ('league-of-legends', 'Toplaner', 'toplaner', '/src/assets/roles/league-of-legends-toplaner.png'),
    ('league-of-legends', 'Jungler', 'jungler', '/src/assets/roles/league-of-legends-jungler.png'),
    ('league-of-legends', 'Midlaner', 'midlaner', '/src/assets/roles/league-of-legends-midlaner.png'),
    ('league-of-legends', 'ADC', 'adc', '/src/assets/roles/league-of-legends-adc.png'),
    ('league-of-legends', 'Support', 'support', '/src/assets/roles/league-of-legends-support.png')
)
INSERT INTO public.roles (id, name, slug, "iconUrl")
SELECT
  (
    substr(md5('role:' || game_slug || ':' || role_slug), 1, 8) || '-' ||
    substr(md5('role:' || game_slug || ':' || role_slug), 9, 4) || '-' ||
    substr(md5('role:' || game_slug || ':' || role_slug), 13, 4) || '-' ||
    substr(md5('role:' || game_slug || ':' || role_slug), 17, 4) || '-' ||
    substr(md5('role:' || game_slug || ':' || role_slug), 21, 12)
  )::uuid,
  role_name,
  game_slug || '-' || role_slug,
  icon_url
FROM role_data
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  "iconUrl" = EXCLUDED."iconUrl";

INSERT INTO public.series (id, name, slug, code, "coverImage")
VALUES (
  (
    substr(md5('series:S4'), 1, 8) || '-' ||
    substr(md5('series:S4'), 9, 4) || '-' ||
    substr(md5('series:S4'), 13, 4) || '-' ||
    substr(md5('series:S4'), 17, 4) || '-' ||
    substr(md5('series:S4'), 21, 12)
  )::uuid,
  'Rift Makers',
  'rift-makers',
  'S4',
  '/src/assets/series/rift-makers.webp'
)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  "coverImage" = EXCLUDED."coverImage";

WITH card_input(id, name, rarity, game_slug, nationality_code, role_slug, team_slug) AS (
  VALUES
    ('S4-01', 'Shushei', 'ROOKIE', 'league-of-legends', 'CZ', 'midlaner', 'fnatic'),
    ('S4-02', 'Cyanide', 'ROOKIE', 'league-of-legends', 'FI', 'jungler', 'fnatic'),
    ('S4-03', 'nRated', 'ROOKIE', 'league-of-legends', 'DE', 'support', 'fnatic'),
    ('S4-04', 'Febiven', 'ROOKIE', 'league-of-legends', 'NL', 'midlaner', 'fnatic'),
    ('S4-05', 'Reignover', 'ROOKIE', 'league-of-legends', 'KR', 'jungler', 'fnatic'),
    ('S4-06', 'Krepo', 'ROOKIE', 'league-of-legends', 'BE', 'support', 'clg-eu'),
    ('S4-07', 'Froggen', 'ROOKIE', 'league-of-legends', 'DK', 'midlaner', 'clg-eu'),
    ('S4-08', 'Darien', 'ROOKIE', 'league-of-legends', 'RU', 'toplaner', 'gambit'),
    ('S4-09', 'Genja', 'ROOKIE', 'league-of-legends', 'RU', 'adc', 'gambit'),
    ('S4-10', 'Edward', 'ROOKIE', 'league-of-legends', 'UA', 'support', 'gambit'),
    ('S4-11', 'CaoMei', 'ROOKIE', 'league-of-legends', 'CN', 'midlaner', 'we'),
    ('S4-12', 'Zzitai', 'ROOKIE', 'league-of-legends', 'CN', 'toplaner', 'ig'),
    ('S4-13', 'Clearlove', 'ROOKIE', 'league-of-legends', 'CN', 'jungler', 'edg'),
    ('S4-14', 'Toyz', 'ROOKIE', 'league-of-legends', 'TW', 'midlaner', 'tpa'),
    ('S4-15', 'Stanley', 'ROOKIE', 'league-of-legends', 'TW', 'toplaner', 'tpa'),
    ('S4-16', 'Bebe', 'ROOKIE', 'league-of-legends', 'TW', 'adc', 'tpa'),
    ('S4-17', 'Lilballz', 'ROOKIE', 'league-of-legends', 'TW', 'jungler', 'tpa'),
    ('S4-18', 'Looper', 'ROOKIE', 'league-of-legends', 'KR', 'toplaner', 'samsung-white'),
    ('S4-19', 'Spirit', 'ROOKIE', 'league-of-legends', 'KR', 'jungler', 'samsung-blue'),
    ('S4-20', 'Acorn', 'ROOKIE', 'league-of-legends', 'KR', 'toplaner', 'samsung-blue'),
    ('S4-21', 'CoreJJ', 'ROOKIE', 'league-of-legends', 'KR', 'support', 'samsung-blue'),
    ('S4-22', 'Kakao', 'ROOKIE', 'league-of-legends', 'KR', 'jungler', 'kt-rolster'),
    ('S4-23', 'Woolite', 'ROOKIE', 'league-of-legends', 'PL', 'adc', 'roccat'),
    ('S4-24', 'Jankos', 'ROOKIE', 'league-of-legends', 'PL', 'jungler', 'roccat'),
    ('S4-25', 'LemonNation', 'ROOKIE', 'league-of-legends', 'US', 'support', 'cloud9'),
    ('S4-26', 'Balls', 'ROOKIE', 'league-of-legends', 'US', 'toplaner', 'cloud9'),
    ('S4-27', 'Meteos', 'ROOKIE', 'league-of-legends', 'US', 'jungler', 'cloud9'),
    ('S4-28', 'WildTurtle', 'ROOKIE', 'league-of-legends', 'CA', 'adc', 'tsm'),
    ('S4-29', 'Dyrus', 'ROOKIE', 'league-of-legends', 'US', 'toplaner', 'tsm'),
    ('S4-30', 'Lustboy', 'ROOKIE', 'league-of-legends', 'KR', 'support', 'tsm'),
    ('S4-31', 'Piglet', 'ROOKIE', 'league-of-legends', 'KR', 'adc', 'skt-t1'),
    ('S4-32', 'PoohManDu', 'ROOKIE', 'league-of-legends', 'KR', 'support', 'skt-t1'),
    ('S4-33', 'Alex Ich', 'CHALLENGER', 'league-of-legends', 'RU', 'midlaner', 'gambit'),
    ('S4-34', 'Diamond', 'CHALLENGER', 'league-of-legends', 'RU', 'jungler', 'gambit'),
    ('S4-35', 'WeiXiao', 'CHALLENGER', 'league-of-legends', 'CN', 'adc', 'we'),
    ('S4-36', 'Score', 'CHALLENGER', 'league-of-legends', 'KR', 'jungler', 'kt-rolster'),
    ('S4-37', 'Dandy', 'CHALLENGER', 'league-of-legends', 'KR', 'jungler', 'samsung-white'),
    ('S4-38', 'PawN', 'CHALLENGER', 'league-of-legends', 'KR', 'midlaner', 'samsung-white'),
    ('S4-39', 'Ambition', 'CHALLENGER', 'league-of-legends', 'KR', 'jungler', 'samsung-galaxy'),
    ('S4-40', 'Crown', 'CHALLENGER', 'league-of-legends', 'KR', 'midlaner', 'samsung-galaxy'),
    ('S4-41', 'Ruler', 'CHALLENGER', 'league-of-legends', 'KR', 'adc', 'samsung-galaxy'),
    ('S4-42', 'Doublelift', 'CHALLENGER', 'league-of-legends', 'US', 'adc', 'clg'),
    ('S4-43', 'Bjergsen', 'CHALLENGER', 'league-of-legends', 'DK', 'midlaner', 'tsm'),
    ('S4-44', 'Hai', 'CHALLENGER', 'league-of-legends', 'US', 'midlaner', 'cloud9'),
    ('S4-45', 'Sneaky', 'CHALLENGER', 'league-of-legends', 'US', 'adc', 'cloud9'),
    ('S4-46', 'Forg1ven', 'CHALLENGER', 'league-of-legends', 'GR', 'adc', 'h2k'),
    ('S4-47', 'Insec', 'CHALLENGER', 'league-of-legends', 'KR', 'jungler', 'star-horn-royal-club'),
    ('S4-48', 'MadLife', 'CHALLENGER', 'league-of-legends', 'KR', 'support', 'cj-blaze'),
    ('S4-49', 'Rekkles', 'CHALLENGER', 'league-of-legends', 'SE', 'adc', 'fnatic'),
    ('S4-50', 'Rush', 'CHALLENGER', 'league-of-legends', 'KR', 'jungler', 'cloud9'),
    ('S4-51', 'Impact', 'CHALLENGER', 'league-of-legends', 'KR', 'toplaner', 'skt-t1'),
    ('S4-52', 'sOAZ', 'CHALLENGER', 'league-of-legends', 'FR', 'toplaner', 'fnatic'),
    ('S4-53', 'xPeke', 'CHAMPION', 'league-of-legends', 'ES', 'midlaner', 'fnatic'),
    ('S4-54', 'YellOwStaR', 'CHAMPION', 'league-of-legends', 'FR', 'support', 'fnatic'),
    ('S4-55', 'Rookie', 'CHAMPION', 'league-of-legends', 'KR', 'midlaner', 'invictus-gaming'),
    ('S4-56', 'Gorilla', 'CHAMPION', 'league-of-legends', 'KR', 'support', 'rox-tigers'),
    ('S4-57', 'Pray', 'CHAMPION', 'league-of-legends', 'KR', 'adc', 'rox-tigers'),
    ('S4-58', 'Smeb', 'CHAMPION', 'league-of-legends', 'KR', 'toplaner', 'rox-tigers'),
    ('S4-59', 'Peanut', 'CHAMPION', 'league-of-legends', 'KR', 'jungler', 'rox-tigers'),
    ('S4-60', 'Huni', 'CHAMPION', 'league-of-legends', 'KR', 'toplaner', 'skt-t1'),
    ('S4-61', 'Duke', 'CHAMPION', 'league-of-legends', 'KR', 'toplaner', 'skt-t1'),
    ('S4-62', 'MaRin', 'CHAMPION', 'league-of-legends', 'KR', 'toplaner', 'skt-t1'),
    ('S4-63', 'Bengi', 'WORLD_CLASS', 'league-of-legends', 'KR', 'jungler', 'skt-t1'),
    ('S4-64', 'Mata', 'WORLD_CLASS', 'league-of-legends', 'KR', 'support', 'samsung-white'),
    ('S4-65', 'Imp', 'WORLD_CLASS', 'league-of-legends', 'KR', 'adc', 'samsung-white'),
    ('S4-66', 'Uzi', 'WORLD_CLASS', 'league-of-legends', 'CN', 'adc', 'royal-never-give-up'),
    ('S4-67', 'Deft', 'WORLD_CLASS', 'league-of-legends', 'KR', 'adc', 'kt-rolster'),
    ('S4-68', 'Bang', 'WORLD_CLASS', 'league-of-legends', 'KR', 'adc', 'skt-t1'),
    ('S4-69', 'Wolf', 'WORLD_CLASS', 'league-of-legends', 'KR', 'support', 'skt-t1'),
    ('S4-70', 'Faker', 'LEGENDS', 'league-of-legends', 'KR', 'midlaner', 'skt-t1')
),
resolved AS (
  SELECT
    ci.id,
    ci.name,
    ci.rarity::public."Rarity" AS rarity,
    '/src/assets/cards/S4/' || ci.id || '.webp' AS "imageUrl",
    s.id AS series_id,
    g.id AS game_id,
    t.id AS team_id,
    n.id AS nationality_id,
    r.id AS role_id
  FROM card_input ci
  JOIN public.series s ON s.code = 'S4'
  JOIN public.games g ON g.slug = ci.game_slug
  LEFT JOIN public.teams t ON t.slug = ci.team_slug
  JOIN public.nationalities n ON n.code = ci.nationality_code
  LEFT JOIN public.roles r ON r.slug = 'league-of-legends-' || ci.role_slug
)
INSERT INTO public.cards (
  id,
  name,
  rarity,
  pc_value,
  "imageUrl",
  "animationUrl",
  series_id,
  game_id,
  team_id,
  nationality_id,
  role_id
)
SELECT
  id,
  name,
  rarity,
  CASE rarity
    WHEN 'ROOKIE'::public."Rarity" THEN 100
    WHEN 'CHALLENGER'::public."Rarity" THEN 250
    WHEN 'CHAMPION'::public."Rarity" THEN 800
    WHEN 'WORLD_CLASS'::public."Rarity" THEN 2500
    WHEN 'LEGENDS'::public."Rarity" THEN 10000
  END AS pc_value,
  "imageUrl",
  NULL,
  series_id,
  game_id,
  team_id,
  nationality_id,
  role_id
FROM resolved
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  rarity = EXCLUDED.rarity,
  pc_value = EXCLUDED.pc_value,
  "imageUrl" = EXCLUDED."imageUrl",
  "animationUrl" = EXCLUDED."animationUrl",
  series_id = EXCLUDED.series_id,
  game_id = EXCLUDED.game_id,
  team_id = EXCLUDED.team_id,
  nationality_id = EXCLUDED.nationality_id,
  role_id = EXCLUDED.role_id;

WITH s4 AS (
  SELECT id AS series_id FROM public.series WHERE code = 'S4'
),
booster_input(name, type, price_pc, image_url, is_daily_only, drop_rates) AS (
  VALUES
    (
      'S4 Normal Booster',
      'NORMAL',
      1600,
      '/src/assets/series/rift-makers.webp',
      false,
      '{"ROOKIE":80,"CHALLENGER":14,"CHAMPION":4.5,"WORLD_CLASS":1.45,"LEGENDS":0.05}'::jsonb
    ),
    (
      'S4 Luck Booster',
      'LUCK',
      2700,
      '/src/assets/series/rift-makers.webp',
      false,
      '{"ROOKIE":60,"CHALLENGER":24,"CHAMPION":11,"WORLD_CLASS":4.8,"LEGENDS":0.2}'::jsonb
    ),
    (
      'S4 Premium Booster',
      'PREMIUM',
      4650,
      '/src/assets/series/rift-makers.webp',
      false,
      '{"ROOKIE":40,"CHALLENGER":27,"CHAMPION":20,"WORLD_CLASS":12.2,"LEGENDS":0.8}'::jsonb
    ),
    (
      'S4 Godpack Booster',
      'GODPACK',
      0,
      NULL,
      true,
      '{"ROOKIE":0,"CHALLENGER":30,"CHAMPION":28,"WORLD_CLASS":40,"LEGENDS":2}'::jsonb
    )
)
INSERT INTO public.boosters (
  id,
  name,
  type,
  price_pc,
  image_url,
  is_daily_only,
  drop_rates,
  series_id
)
SELECT
  (
    substr(md5('booster:S4:' || bi.type), 1, 8) || '-' ||
    substr(md5('booster:S4:' || bi.type), 9, 4) || '-' ||
    substr(md5('booster:S4:' || bi.type), 13, 4) || '-' ||
    substr(md5('booster:S4:' || bi.type), 17, 4) || '-' ||
    substr(md5('booster:S4:' || bi.type), 21, 12)
  )::uuid,
  bi.name,
  bi.type::public."BoosterType",
  bi.price_pc,
  bi.image_url,
  bi.is_daily_only,
  bi.drop_rates,
  s4.series_id
FROM booster_input bi
CROSS JOIN s4
ON CONFLICT (series_id, type) DO UPDATE
SET
  name = EXCLUDED.name,
  price_pc = EXCLUDED.price_pc,
  image_url = EXCLUDED.image_url,
  is_daily_only = EXCLUDED.is_daily_only,
  drop_rates = EXCLUDED.drop_rates;
