-- Add Series S3 "French Touch" with game-specific roles and card set.
-- Idempotent migration (safe in CI / repeated deploys).

WITH game_data(name, slug, "logoUrl") AS (
  VALUES
    ('Counter-Strike 2', 'counter-strike-2', '/src/assets/games/counter-strike.png'),
    ('Counter-Strike: Global Offensive', 'counter-strike-global-offensive', '/src/assets/games/csgo.png'),
    ('League of Legends', 'league-of-legends', '/src/assets/games/league-of-legends.png'),
    ('Rocket League', 'rocket-league', '/src/assets/games/rocket-league.png'),
    ('Trackmania', 'trackmania', '/src/assets/games/trackmania.png'),
    ('Street Fighter', 'street-fighter', '/src/assets/games/street-fighter.png'),
    ('Valorant', 'valorant', '/src/assets/games/valorant.png'),
    ('Teamfight Tactics', 'teamfight-tactics', '/src/assets/games/teamfight-tactics.png'),
    ('Fortnite', 'fortnite', '/src/assets/games/fortnite.webp'),
    ('Super Smash Bros.', 'smash', '/src/assets/games/smash.png'),
    ('Rainbow Six Siege', 'rainbow-six-siege', '/src/assets/games/r6.png'),
    ('Call of Duty', 'call-of-duty', '/src/assets/games/cod.png'),
    ('FIFA', 'fifa', '/src/assets/games/fifa.jpg'),
    ('SoulCalibur', 'soulcalibur', '/src/assets/games/soulcalibur.png'),
    ('Dragon Ball FighterZ', 'dragon-ball-fighterz', '/src/assets/games/dragon-ball-fighterz.png'),
    ('StarCraft II', 'starcraft-ii', '/src/assets/games/sc2.webp'),
    ('Age of Empires', 'age-of-empires', '/src/assets/games/age-of-empires.png'),
    ('Dota 2', 'dota-2', '/src/assets/games/dota2.png')
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
    ('3DMAX', '3dmax', '/src/assets/teams/3dmax.png'),
    ('GamersFirst', 'gamersfirst', '/src/assets/teams/gamersfirst.png'),
    ('Team Heretics', 'team-heretics', '/src/assets/teams/team-heretics.png'),
    ('Gentle Mates', 'gentle-mates', '/src/assets/teams/gentlemates.png'),
    ('Aegis', 'aegis', '/src/assets/teams/aegis.png'),
    ('G2 Esports', 'g2-esports', '/src/assets/teams/g2-esports.webp'),
    ('Mandatory', 'mandatory', '/src/assets/teams/mandatory.png'),
    ('GiantX', 'giantx', '/src/assets/teams/giantx.png'),
    ('Ici Japon Corp. Esport.', 'ici-japon-corp-esport', '/src/assets/teams/ici-japon-corp-esport.png'),
    ('KC', 'kc', '/src/assets/teams/karmine-corp.png'),
    ('KCB', 'kcb', '/src/assets/teams/karmine-corp.png'),
    ('VeryGames', 'verygames', '/src/assets/teams/verygames.png'),
    ('le stream esport', 'le-stream-esport', '/src/assets/teams/le-stream-esport.png'),
    ('MCES', 'mces', '/src/assets/teams/mces.png'),
    ('BMS', 'bms', '/src/assets/teams/bms.png'),
    ('Vitality', 'vitality', '/src/assets/teams/vitality.png'),
    ('Cloud9', 'cloud9', '/src/assets/teams/cloud9.png'),
    ('Team BDS', 'team-bds', '/src/assets/teams/team-bds.png'),
    ('NY Subliners', 'ny-subliners', '/src/assets/teams/ny-subliners.webp'),
    ('Red Bull', 'red-bull', '/src/assets/teams/red-bull.png'),
    ('Fnatic', 'fnatic', '/src/assets/teams/fnatic.png'),
    ('FCN', 'fcn', '/src/assets/teams/fcn.png'),
    ('EnvyUs', 'envyus', '/src/assets/teams/envyus.webp'),
    ('Solary', 'solary', '/src/assets/teams/solary.png'),
    ('Team Liquid', 'team-liquid', '/src/assets/teams/team-liquid.png'),
    ('EG', 'eg', '/src/assets/teams/evil-geniuses.png'),
    ('OG', 'og', '/src/assets/teams/og.png')
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
    ('France', 'FR', 'https://flagcdn.com/w80/fr.png'),
    ('Belgique', 'BE', 'https://flagcdn.com/w80/be.png'),
    ('Maroc', 'MA', 'https://flagcdn.com/w80/ma.png'),
    ('Canada', 'CA', 'https://flagcdn.com/w80/ca.png')
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
    ('counter-strike-2', 'Rifler', 'rifler', '/src/assets/roles/counter-strike-2-rifler.webp'),
    ('counter-strike-2', 'AWPer', 'awper', '/src/assets/roles/counter-strike-2-awper.webp'),
    ('counter-strike-2', 'IGL', 'igl', '/src/assets/roles/counter-strike-2-igl.webp'),
    ('counter-strike-2', 'Support', 'support', '/src/assets/roles/counter-strike-2-support.webp'),
    ('counter-strike-global-offensive', 'Rifler', 'rifler', '/src/assets/roles/counter-strike-2-rifler.webp'),
    ('counter-strike-global-offensive', 'AWPer', 'awper', '/src/assets/roles/counter-strike-2-awper.webp'),
    ('counter-strike-global-offensive', 'IGL', 'igl', '/src/assets/roles/counter-strike-2-igl.webp'),
    ('counter-strike-global-offensive', 'Support', 'support', '/src/assets/roles/counter-strike-2-support.webp'),
    ('counter-strike-global-offensive', 'Lurker', 'lurker', '/src/assets/roles/counter-strike-2-lurker.webp'),

    ('league-of-legends', 'Toplaner', 'toplaner', '/src/assets/roles/league-of-legends-toplaner.png'),
    ('league-of-legends', 'Jungler', 'jungler', '/src/assets/roles/league-of-legends-jungler.png'),
    ('league-of-legends', 'Midlaner', 'midlaner', '/src/assets/roles/league-of-legends-midlaner.png'),
    ('league-of-legends', 'ADC', 'adc', '/src/assets/roles/league-of-legends-adc.png'),
    ('league-of-legends', 'Support', 'support', '/src/assets/roles/league-of-legends-support.png'),

    ('trackmania', 'Driver', 'driver', '/src/assets/roles/tm-driver.png'),

    ('rocket-league', 'Fennec', 'fennec', '/src/assets/roles/fennec.png'),
    ('rocket-league', 'Octane', 'octane', '/src/assets/roles/octane.webp'),
    ('rocket-league', 'Batmobile', 'batmobile', '/src/assets/roles/batmobile.webp'),

    ('street-fighter', 'Dhalsim', 'dhalsim', '/src/assets/roles/dhalsim.png'),
    ('street-fighter', 'Mai', 'mai', '/src/assets/roles/mai.png'),
    ('street-fighter', 'Rose', 'rose', '/src/assets/roles/rose.webp'),

    ('valorant', 'Initiator', 'initiator', '/src/assets/roles/valorant-initiator.webp'),
    ('valorant', 'IGL', 'igl', '/src/assets/roles/valorant-igl.webp'),
    ('valorant', 'Duelist', 'duelist', '/src/assets/roles/valorant-duelist.webp'),

    ('teamfight-tactics', 'Invocateur', 'invocateur', '/src/assets/roles/invocateur.png'),
    ('fortnite', 'bambi', 'bambi', '/src/assets/roles/bambi.png'),

    ('smash', 'Lucina', 'lucina', '/src/assets/roles/lucina.png'),
    ('smash', 'Steve', 'steve', '/src/assets/roles/steve.png'),
    ('smash', 'Palutena', 'palutena', '/src/assets/roles/palutena.png'),
    ('smash', 'Wario', 'wario', '/src/assets/roles/wario.webp'),

    ('rainbow-six-siege', 'Support', 'support', '/src/assets/roles/counter-strike-2-support.webp'),
    ('rainbow-six-siege', 'Fragger', 'fragger', '/src/assets/roles/counter-strike-2-fragger.webp'),

    ('call-of-duty', 'SMG', 'smg', '/src/assets/roles/call-of-duty-smg.webp'),
    ('call-of-duty', 'French Monster', 'french-monster', '/src/assets/roles/french-monster.webp'),

    ('soulcalibur', 'Chun-Li', 'chun-li', '/src/assets/roles/chun-li.png'),
    ('dragon-ball-fighterz', 'gogeta', 'gogeta', '/src/assets/roles/gogeta.png'),

    ('starcraft-ii', 'Terran', 'terran', '/src/assets/roles/terran.png'),
    ('starcraft-ii', 'Zerg', 'zerg', '/src/assets/roles/zerg.png'),

    ('dota-2', 'Offlane', 'offlane', '/src/assets/roles/offlane.png')
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
    substr(md5('series:S3'), 1, 8) || '-' ||
    substr(md5('series:S3'), 9, 4) || '-' ||
    substr(md5('series:S3'), 13, 4) || '-' ||
    substr(md5('series:S3'), 17, 4) || '-' ||
    substr(md5('series:S3'), 21, 12)
  )::uuid,
  'French Touch',
  'french-touch',
  'S3',
  '/src/assets/series/french-touch.avif'
)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  "coverImage" = EXCLUDED."coverImage";

WITH card_input(id, name, rarity, game_slug, nationality_code, role_slug, team_slug) AS (
  VALUES
    ('S3-01', 'Graviti', 'ROOKIE', 'counter-strike-2', 'FR', 'rifler', '3dmax'),
    ('S3-02', 'Gwen', 'ROOKIE', 'trackmania', 'FR', 'driver', 'gamersfirst'),
    ('S3-03', 'Stend', 'ROOKIE', 'league-of-legends', 'FR', 'support', 'team-heretics'),
    ('S3-04', 'Yujin', 'ROOKIE', 'rocket-league', 'FR', 'fennec', 'gentle-mates'),
    ('S3-05', 'Mister Crimson', 'ROOKIE', 'street-fighter', 'FR', 'dhalsim', 'aegis'),
    ('S3-06', 'Akita', 'ROOKIE', 'valorant', 'FR', 'initiator', 'g2-esports'),
    ('S3-07', 'HyP', 'ROOKIE', 'valorant', 'FR', 'igl', 'mandatory'),
    ('S3-08', 'Takas', 'ROOKIE', 'valorant', 'FR', 'duelist', 'gentle-mates'),
    ('S3-09', 'Isma', 'ROOKIE', 'league-of-legends', 'FR', 'jungler', 'giantx'),
    ('S3-10', 'Badlulu', 'ROOKIE', 'league-of-legends', 'FR', 'toplaner', 'ici-japon-corp-esport'),
    ('S3-11', 'Canbizz', 'ROOKIE', 'teamfight-tactics', 'FR', 'invocateur', 'kc'),
    ('S3-12', 'Kamiloo', 'ROOKIE', 'league-of-legends', 'FR', 'midlaner', 'kcb'),
    ('S3-13', 'Podasai', 'ROOKIE', 'fortnite', 'FR', 'bambi', 'gentle-mates'),
    ('S3-14', '3XA', 'ROOKIE', 'league-of-legends', 'FR', 'adc', 'kcb'),
    ('S3-15', 'Sheo', 'ROOKIE', 'league-of-legends', 'FR', 'jungler', 'team-heretics'),
    ('S3-16', 'Otaaq', 'ROOKIE', 'trackmania', 'FR', 'driver', 'kc'),
    ('S3-17', 'Juicy', 'ROOKIE', 'rocket-league', 'FR', 'fennec', 'gentle-mates'),
    ('S3-18', 'Leon', 'ROOKIE', 'smash', 'FR', 'lucina', 'solary'),
    ('S3-19', 'Mawkzy', 'ROOKIE', 'rocket-league', 'FR', 'fennec', NULL),
    ('S3-20', 'Itachi', 'ROOKIE', 'rocket-league', 'MA', 'fennec', 'gentle-mates'),
    ('S3-21', 'Maka', 'ROOKIE', 'counter-strike-2', 'FR', 'awper', '3dmax'),
    ('S3-22', 'Lucky', 'ROOKIE', 'counter-strike-2', 'FR', 'rifler', '3dmax'),
    ('S3-23', 'Ex6TenZ', 'ROOKIE', 'counter-strike-global-offensive', 'BE', 'igl', 'verygames'),
    ('S3-24', 'Skite', 'ROOKIE', 'fortnite', 'FR', 'bambi', 'le-stream-esport'),
    ('S3-25', 'Nayte', 'ROOKIE', 'fortnite', 'FR', 'bambi', 'le-stream-esport'),
    ('S3-26', 'Andilex', 'ROOKIE', 'fortnite', 'FR', 'bambi', 'mces'),
    ('S3-27', 'Crêpe Salée', 'ROOKIE', 'smash', 'FR', 'steve', 'bms'),
    ('S3-28', 'Kilzyou', 'ROOKIE', 'street-fighter', 'FR', 'mai', 'kc'),
    ('S3-29', 'Atow', 'ROOKIE', 'rocket-league', 'BE', 'fennec', 'kc'),
    ('S3-30', 'Radosin', 'ROOKIE', 'rocket-league', 'FR', 'fennec', 'vitality'),
    ('S3-31', 'Vetheo', 'ROOKIE', 'league-of-legends', 'FR', 'midlaner', 'vitality'),
    ('S3-32', 'Wawa', 'ROOKIE', 'dragon-ball-fighterz', 'FR', 'gogeta', 'bms'),
    ('S3-33', 'Double', 'CHALLENGER', 'teamfight-tactics', 'FR', 'invocateur', 'kc'),
    ('S3-34', 'Brid', 'CHALLENGER', 'rainbow-six-siege', 'FR', 'support', 'team-bds'),
    ('S3-35', 'Nisqy', 'CHALLENGER', 'league-of-legends', 'BE', 'midlaner', 'cloud9'),
    ('S3-36', 'Caliste', 'CHALLENGER', 'league-of-legends', 'FR', 'adc', 'kc'),
    ('S3-37', 'Targamas', 'CHALLENGER', 'league-of-legends', 'BE', 'support', 'g2-esports'),
    ('S3-38', 'Adam', 'CHALLENGER', 'league-of-legends', 'FR', 'toplaner', 'team-bds'),
    ('S3-39', 'Saken', 'CHALLENGER', 'league-of-legends', 'FR', 'midlaner', 'kc'),
    ('S3-40', 'Hans Sama', 'CHALLENGER', 'league-of-legends', 'FR', 'adc', 'g2-esports'),
    ('S3-41', 'Hydra', 'CHALLENGER', 'call-of-duty', 'FR', 'smg', 'ny-subliners'),
    ('S3-42', 'Raflow', 'CHALLENGER', 'smash', 'FR', 'palutena', 'bms'),
    ('S3-43', 'Luffy', 'CHALLENGER', 'street-fighter', 'FR', 'rose', 'red-bull'),
    ('S3-44', 'Bren', 'CHALLENGER', 'trackmania', 'FR', 'driver', 'kc'),
    ('S3-45', 'Exotiik', 'CHALLENGER', 'rocket-league', 'FR', 'fennec', 'team-bds'),
    ('S3-46', 'Rocky', 'CHALLENGER', 'fifa', 'FR', NULL, 'vitality'),
    ('S3-47', 'Kayane', 'CHALLENGER', 'soulcalibur', 'FR', 'chun-li', 'red-bull'),
    ('S3-48', 'Soaz', 'CHALLENGER', 'league-of-legends', 'FR', 'toplaner', 'fnatic'),
    ('S3-49', 'Alpha54', 'CHALLENGER', 'rocket-league', 'FR', 'octane', 'vitality'),
    ('S3-50', 'RpK', 'CHALLENGER', 'counter-strike-global-offensive', 'FR', 'support', 'vitality'),
    ('S3-51', 'Fairy Peak!', 'CHALLENGER', 'rocket-league', 'FR', 'batmobile', 'vitality'),
    ('S3-52', 'Shox', 'CHALLENGER', 'counter-strike-global-offensive', 'FR', 'lurker', 'envyus'),
    ('S3-53', 'Carl Jr', 'CHAMPION', 'trackmania', 'CA', 'driver', 'solary'),
    ('S3-54', 'YellowStar', 'CHAMPION', 'league-of-legends', 'FR', 'support', 'fnatic'),
    ('S3-55', 'Clem', 'CHAMPION', 'starcraft-ii', 'FR', 'terran', 'team-liquid'),
    ('S3-56', 'Vatira', 'CHAMPION', 'rocket-league', 'FR', 'fennec', 'kc'),
    ('S3-57', 'Zen', 'CHAMPION', 'rocket-league', 'FR', 'octane', 'vitality'),
    ('S3-58', 'Bruce Grannec', 'CHAMPION', 'fifa', 'FR', NULL, 'fcn'),
    ('S3-59', 'KennyS', 'CHAMPION', 'counter-strike-global-offensive', 'FR', 'awper', 'envyus'),
    ('S3-60', 'Shaiiko', 'CHAMPION', 'rainbow-six-siege', 'FR', 'fragger', 'team-bds'),
    ('S3-61', 'Skewmond', 'CHAMPION', 'league-of-legends', 'FR', 'jungler', 'g2-esports'),
    ('S3-62', 'apEX', 'CHAMPION', 'counter-strike-2', 'FR', 'igl', 'vitality'),
    ('S3-63', 'Glutonny', 'WORLD_CLASS', 'smash', 'FR', 'wario', 'solary'),
    ('S3-64', 'Gotaga', 'WORLD_CLASS', 'call-of-duty', 'FR', 'french-monster', 'vitality'),
    ('S3-65', 'Kaydop', 'WORLD_CLASS', 'rocket-league', 'FR', 'octane', 'vitality'),
    ('S3-66', 'M0nkey M00n', 'WORLD_CLASS', 'rocket-league', 'FR', 'fennec', 'team-bds'),
    ('S3-67', 'Stephano', 'WORLD_CLASS', 'starcraft-ii', 'FR', 'zerg', 'eg'),
    ('S3-68', 'MarineLord', 'WORLD_CLASS', 'age-of-empires', 'FR', NULL, 'gentle-mates'),
    ('S3-69', 'ZywOo', 'WORLD_CLASS', 'counter-strike-2', 'FR', 'awper', 'vitality'),
    ('S3-70', 'Ceb', 'LEGENDS', 'dota-2', 'FR', 'offlane', 'og')
),
resolved AS (
  SELECT
    ci.id,
    ci.name,
    ci.rarity::public."Rarity" AS rarity,
    '/src/assets/cards/S3/' || ci.id || '.webp' AS "imageUrl",
    s.id AS series_id,
    g.id AS game_id,
    t.id AS team_id,
    n.id AS nationality_id,
    r.id AS role_id
  FROM card_input ci
  JOIN public.series s ON s.code = 'S3'
  JOIN public.games g ON g.slug = ci.game_slug
  LEFT JOIN public.teams t ON t.slug = ci.team_slug
  JOIN public.nationalities n ON n.code = ci.nationality_code
  LEFT JOIN public.roles r
    ON ci.role_slug IS NOT NULL
   AND r.slug = ci.game_slug || '-' || ci.role_slug
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

WITH s3 AS (
  SELECT id AS series_id FROM public.series WHERE code = 'S3'
),
booster_input(name, type, price_pc, image_url, is_daily_only, drop_rates) AS (
  VALUES
    (
      'S3 Normal Booster',
      'NORMAL',
      1600,
      '/src/assets/series/french-touch.avif',
      false,
      '{"ROOKIE":80,"CHALLENGER":14,"CHAMPION":4.5,"WORLD_CLASS":1.45,"LEGENDS":0.05}'::jsonb
    ),
    (
      'S3 Luck Booster',
      'LUCK',
      2700,
      '/src/assets/series/french-touch.avif',
      false,
      '{"ROOKIE":60,"CHALLENGER":24,"CHAMPION":11,"WORLD_CLASS":4.8,"LEGENDS":0.2}'::jsonb
    ),
    (
      'S3 Premium Booster',
      'PREMIUM',
      4650,
      '/src/assets/series/french-touch.avif',
      false,
      '{"ROOKIE":40,"CHALLENGER":27,"CHAMPION":20,"WORLD_CLASS":12.2,"LEGENDS":0.8}'::jsonb
    ),
    (
      'S3 Godpack Booster',
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
    substr(md5('booster:S3:' || bi.type), 1, 8) || '-' ||
    substr(md5('booster:S3:' || bi.type), 9, 4) || '-' ||
    substr(md5('booster:S3:' || bi.type), 13, 4) || '-' ||
    substr(md5('booster:S3:' || bi.type), 17, 4) || '-' ||
    substr(md5('booster:S3:' || bi.type), 21, 12)
  )::uuid,
  bi.name,
  bi.type::public."BoosterType",
  bi.price_pc,
  bi.image_url,
  bi.is_daily_only,
  bi.drop_rates,
  s3.series_id
FROM booster_input bi
CROSS JOIN s3
ON CONFLICT (series_id, type) DO UPDATE
SET
  name = EXCLUDED.name,
  price_pc = EXCLUDED.price_pc,
  image_url = EXCLUDED.image_url,
  is_daily_only = EXCLUDED.is_daily_only,
  drop_rates = EXCLUDED.drop_rates;
