-- Add Series S5 "This is Rocket League" with Rocket League cards and boosters.
-- Idempotent migration.

WITH game_data(name, slug, "logoUrl") AS (
  VALUES
    ('Rocket League', 'rocket-league', '/src/assets/games/rocket-league.png')
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
    ('G2 Esports', 'g2-esports', '/src/assets/teams/g2-esports.webp'),
    ('iBUYPOWER', 'ibuypower', '/src/assets/teams/iBUYPOWER.png'),
    ('FlipSid3 Tactics', 'flipsid3-tactics', '/src/assets/teams/FlipSid3 Tactics.png'),
    ('Version1', 'version1', '/src/assets/teams/Version1.png'),
    ('Spacestation', 'spacestation', '/src/assets/teams/Spacestation.png'),
    ('Giants Gaming', 'giants-gaming', '/src/assets/teams/giant gaming.png'),
    ('Gentlemates', 'gentlemates', '/src/assets/teams/gentlemates.png'),
    ('Team Vitality', 'team-vitality', '/src/assets/teams/team-vitality.png'),
    ('Dignitas', 'dignitas', '/src/assets/teams/Team Dignitas.png'),
    ('NRG Esports', 'nrg-esports', '/src/assets/teams/nrg.png'),
    ('Team Falcons', 'team-falcons', '/src/assets/teams/Team Falcons.png'),
    ('FaZe Clan', 'faze-clan', '/src/assets/teams/faze-clan.png'),
    ('Power', 'power', '/src/assets/teams/Power.png'),
    ('Renegades', 'renegades', '/src/assets/teams/Renegades.png'),
    ('FURIA Esports', 'furia-esports', '/src/assets/teams/FURIA Esports.png'),
    ('Rogue', 'rogue', '/src/assets/teams/rogue.png'),
    ('SPMR Esports', 'spmr-esports', '/src/assets/teams/SPMR Esports.png'),
    ('Team Reciprocity', 'team-reciprocity', '/src/assets/teams/Team Reciprocity.png'),
    ('Team Envy', 'team-envy', '/src/assets/teams/envyus.webp'),
    ('Endpoint', 'endpoint', '/src/assets/teams/Endpoint.png'),
    ('Oxygen Esport', 'oxygen-esport', '/src/assets/teams/Oxygen Esport.webp'),
    ('Gen.G Mobil1', 'geng-mobil1', '/src/assets/teams/gen-g.png'),
    ('Karmine Corp', 'karmine-corp', '/src/assets/teams/karmine-corp.png'),
    ('Cloud9', 'cloud9', '/src/assets/teams/cloud9.png'),
    ('Team BDS', 'team-bds', '/src/assets/teams/team-bds.png'),
    ('Moist Esports', 'moist-esports', '/src/assets/teams/Moist Esports.png'),
    ('Renault Vitality', 'renault-vitality', '/src/assets/teams/vitality.png')
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
    ('USA', 'US', 'https://flagcdn.com/w80/us.png'),
    ('Royaume-Uni', 'GB', 'https://flagcdn.com/w80/gb.png'),
    ('France', 'FR', 'https://flagcdn.com/w80/fr.png'),
    ('Italie', 'IT', 'https://flagcdn.com/w80/it.png'),
    ('Arabie Saoudite', 'SA', 'https://flagcdn.com/w80/sa.png'),
    ('Belgique', 'BE', 'https://flagcdn.com/w80/be.png'),
    ('Pays-Bas', 'NL', 'https://flagcdn.com/w80/nl.png'),
    ('Danemark', 'DK', 'https://flagcdn.com/w80/dk.png'),
    ('Allemagne', 'DE', 'https://flagcdn.com/w80/de.png'),
    ('Australie', 'AU', 'https://flagcdn.com/w80/au.png'),
    ('Nouvelle-Zélande', 'NZ', 'https://flagcdn.com/w80/nz.png'),
    ('Autriche', 'AT', 'https://flagcdn.com/w80/at.png'),
    ('Brésil', 'BR', 'https://flagcdn.com/w80/br.png'),
    ('Canada', 'CA', 'https://flagcdn.com/w80/ca.png'),
    ('Espagne', 'ES', 'https://flagcdn.com/w80/es.png'),
    ('Maroc', 'MA', 'https://flagcdn.com/w80/ma.png'),
    ('Finlande', 'FI', 'https://flagcdn.com/w80/fi.png'),
    ('Suède', 'SE', 'https://flagcdn.com/w80/se.png')
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
    ('rocket-league', 'Fennec', 'fennec', '/src/assets/roles/fennec.png'),
    ('rocket-league', 'Octane', 'octane', '/src/assets/roles/octane.webp'),
    ('rocket-league', 'Batmobile', 'batmobile', '/src/assets/roles/batmobile.webp')
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
    substr(md5('series:S5'), 1, 8) || '-' ||
    substr(md5('series:S5'), 9, 4) || '-' ||
    substr(md5('series:S5'), 13, 4) || '-' ||
    substr(md5('series:S5'), 17, 4) || '-' ||
    substr(md5('series:S5'), 21, 12)
  )::uuid,
  'This is Rocket League',
  'this-is-rocket-league',
  'S5',
  '/src/assets/series/this-is-rocket-league.jpg'
)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  "coverImage" = EXCLUDED."coverImage";

WITH card_input(id, name, rarity, game_slug, nationality_code, role_slug, team_slug) AS (
  VALUES
    ('S5-01','Kronovi','ROOKIE','rocket-league','US','fennec','g2-esports'),
    ('S5-02','Over Zer0','ROOKIE','rocket-league','US','fennec','ibuypower'),
    ('S5-03','Markydooda','ROOKIE','rocket-league','GB','fennec','flipsid3-tactics'),
    ('S5-04','Mawkzy','ROOKIE','rocket-league','FR','fennec',NULL),
    ('S5-05','Kuxir97','ROOKIE','rocket-league','IT','fennec','flipsid3-tactics'),
    ('S5-06','Comm','ROOKIE','rocket-league','US','fennec','version1'),
    ('S5-07','Lj','ROOKIE','rocket-league','US','fennec','spacestation'),
    ('S5-08','Stake','ROOKIE','rocket-league','ES','fennec','giants-gaming'),
    ('S5-09','Yujin','ROOKIE','rocket-league','FR','fennec','gentlemates'),
    ('S5-10','Paschy90','ROOKIE','rocket-league','DE','fennec','team-vitality'),
    ('S5-11','AztraL','ROOKIE','rocket-league','BE','fennec','dignitas'),
    ('S5-12','Fireburner','ROOKIE','rocket-league','US','octane','nrg-esports'),
    ('S5-13','Nwpo','ROOKIE','rocket-league','SA','fennec','team-falcons'),
    ('S5-14','Retals','ROOKIE','rocket-league','US','octane','spacestation'),
    ('S5-15','Mist','ROOKIE','rocket-league','US','octane','faze-clan'),
    ('S5-16','Fever','ROOKIE','rocket-league','AU','octane','power'),
    ('S5-17','Torsos','ROOKIE','rocket-league','NZ','octane','renegades'),
    ('S5-18','Yukeo','ROOKIE','rocket-league','AT','octane','dignitas'),
    ('S5-19','Lostt','ROOKIE','rocket-league','BR','octane','furia-esports'),
    ('S5-20','Chicago','ROOKIE','rocket-league','US','octane','g2-esports'),
    ('S5-21','Sizz','ROOKIE','rocket-league','US','octane','rogue'),
    ('S5-22','Arsenal','ROOKIE','rocket-league','US','octane','spacestation'),
    ('S5-23','Kassio','ROOKIE','rocket-league','FR','fennec','spmr-esports'),
    ('S5-24','Ferra','ROOKIE','rocket-league','FR','fennec','team-reciprocity'),
    ('S5-25','Chausette45','ROOKIE','rocket-league','FR','fennec','team-reciprocity'),
    ('S5-26','Deevo','ROOKIE','rocket-league','GB','fennec','team-envy'),
    ('S5-27','Metsanauris','ROOKIE','rocket-league','FI','fennec','endpoint'),
    ('S5-28','Oaly','ROOKIE','rocket-league','NL','fennec','oxygen-esport'),
    ('S5-29','Fruity','ROOKIE','rocket-league','DK','octane','team-reciprocity'),
    ('S5-30','Chronic','ROOKIE','rocket-league','US','octane','geng-mobil1'),
    ('S5-31','Joreuz','ROOKIE','rocket-league','NL','fennec','dignitas'),
    ('S5-32','Drufinho','ROOKIE','rocket-league','BR','fennec','furia-esports'),
    ('S5-33','Trk511','CHALLENGER','rocket-league','SA','fennec','team-falcons'),
    ('S5-34','Kiileerrz','CHALLENGER','rocket-league','SA','fennec','team-falcons'),
    ('S5-35','Itachi','CHALLENGER','rocket-league','MA','fennec','karmine-corp'),
    ('S5-36','Rizzo','CHALLENGER','rocket-league','US','octane','g2-esports'),
    ('S5-37','Torment','CHALLENGER','rocket-league','US','octane','cloud9'),
    ('S5-38','Gimmick','CHALLENGER','rocket-league','US','fennec','cloud9'),
    ('S5-39','Oski','CHALLENGER','rocket-league','FI','fennec','oxygen-esport'),
    ('S5-40','Juicy','CHALLENGER','rocket-league','FR','fennec','gentlemates'),
    ('S5-41','Seikoo','CHALLENGER','rocket-league','FR','fennec','team-bds'),
    ('S5-42','Rise.','CHALLENGER','rocket-league','GB','fennec','moist-esports'),
    ('S5-43','Firstkiller','CHALLENGER','rocket-league','US','octane','faze-clan'),
    ('S5-44','Atomic','CHALLENGER','rocket-league','US','octane','g2-esports'),
    ('S5-45','Exotiik','CHALLENGER','rocket-league','FR','fennec','karmine-corp'),
    ('S5-46','yANXNZ','CHALLENGER','rocket-league','BR','octane','furia-esports'),
    ('S5-47','Joyo','CHALLENGER','rocket-league','GB','octane','moist-esports'),
    ('S5-48','oKhaliD','CHALLENGER','rocket-league','SA','fennec','team-falcons'),
    ('S5-49','Archie','CHALLENGER','rocket-league','GB','fennec','oxygen-esport'),
    ('S5-50','ApparentlyJack','CHALLENGER','rocket-league','GB','fennec','geng-mobil1'),
    ('S5-51','Nass','CHALLENGER','rocket-league','MA','fennec','gentlemates'),
    ('S5-52','Drali','CHALLENGER','rocket-league','MA','fennec','team-bds'),
    ('S5-53','JKnaps','CHAMPION','rocket-league','CA','octane','g2-esports'),
    ('S5-54','Radosin','CHAMPION','rocket-league','FR','fennec','team-vitality'),
    ('S5-55','Rw9','CHAMPION','rocket-league','SA','fennec','team-falcons'),
    ('S5-56','Atow','CHAMPION','rocket-league','FR','fennec','karmine-corp'),
    ('S5-57','BeastMode','CHAMPION','rocket-league','US','octane','g2-esports'),
    ('S5-58','Daniel','CHAMPION','rocket-league','US','octane','g2-esports'),
    ('S5-59','GarrettG','CHAMPION','rocket-league','US','octane','nrg-esports'),
    ('S5-60','Scrub Killa','CHAMPION','rocket-league','GB','octane','renault-vitality'),
    ('S5-61','Alpha54','CHAMPION','rocket-league','FR','octane','team-vitality'),
    ('S5-62','Fairy Peak!','CHAMPION','rocket-league','FR','batmobile','renault-vitality'),
    ('S5-63','Turbopolsa','WORLD_CLASS','rocket-league','SE','fennec','dignitas'),
    ('S5-64','ViolentPanda','WORLD_CLASS','rocket-league','NL','fennec','dignitas'),
    ('S5-65','jstn.','WORLD_CLASS','rocket-league','US','octane','nrg-esports'),
    ('S5-66','Squishy','WORLD_CLASS','rocket-league','CA','octane','cloud9'),
    ('S5-67','M0nkey M00n','WORLD_CLASS','rocket-league','FR','fennec','team-bds'),
    ('S5-68','Zen','WORLD_CLASS','rocket-league','FR','fennec','team-vitality'),
    ('S5-69','Vatira','WORLD_CLASS','rocket-league','FR','fennec','karmine-corp'),
    ('S5-70','Kaydop','LEGENDS','rocket-league','FR','octane','team-vitality')
),
resolved AS (
  SELECT
    ci.id,
    ci.name,
    ci.rarity::public."Rarity" AS rarity,
    CASE ci.id
      WHEN 'S5-02' THEN '/src/assets/cards/S5/S5-02.png'
      WHEN 'S5-45' THEN '/src/assets/cards/S5/S5-45.jpeg'
      ELSE '/src/assets/cards/S5/' || ci.id || '.jpg'
    END AS "imageUrl",
    s.id AS series_id,
    g.id AS game_id,
    t.id AS team_id,
    n.id AS nationality_id,
    r.id AS role_id
  FROM card_input ci
  JOIN public.series s ON s.code = 'S5'
  JOIN public.games g ON g.slug = ci.game_slug
  LEFT JOIN public.teams t ON t.slug = ci.team_slug
  JOIN public.nationalities n ON n.code = ci.nationality_code
  LEFT JOIN public.roles r ON r.slug = 'rocket-league-' || ci.role_slug
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

WITH s5 AS (
  SELECT id AS series_id FROM public.series WHERE code = 'S5'
),
booster_input(name, type, price_pc, image_url, is_daily_only, drop_rates) AS (
  VALUES
    (
      'S5 Normal Booster',
      'NORMAL',
      1600,
      '/src/assets/series/this-is-rocket-league.jpg',
      false,
      '{"ROOKIE":80,"CHALLENGER":14,"CHAMPION":4.5,"WORLD_CLASS":1.45,"LEGENDS":0.05}'::jsonb
    ),
    (
      'S5 Luck Booster',
      'LUCK',
      2700,
      '/src/assets/series/this-is-rocket-league.jpg',
      false,
      '{"ROOKIE":60,"CHALLENGER":24,"CHAMPION":11,"WORLD_CLASS":4.8,"LEGENDS":0.2}'::jsonb
    ),
    (
      'S5 Premium Booster',
      'PREMIUM',
      4650,
      '/src/assets/series/this-is-rocket-league.jpg',
      false,
      '{"ROOKIE":40,"CHALLENGER":27,"CHAMPION":20,"WORLD_CLASS":12.2,"LEGENDS":0.8}'::jsonb
    ),
    (
      'S5 Godpack Booster',
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
    substr(md5('booster:S5:' || bi.type), 1, 8) || '-' ||
    substr(md5('booster:S5:' || bi.type), 9, 4) || '-' ||
    substr(md5('booster:S5:' || bi.type), 13, 4) || '-' ||
    substr(md5('booster:S5:' || bi.type), 17, 4) || '-' ||
    substr(md5('booster:S5:' || bi.type), 21, 12)
  )::uuid,
  bi.name,
  bi.type::public."BoosterType",
  bi.price_pc,
  bi.image_url,
  bi.is_daily_only,
  bi.drop_rates,
  s5.series_id
FROM booster_input bi
CROSS JOIN s5
ON CONFLICT (series_id, type) DO UPDATE
SET
  name = EXCLUDED.name,
  price_pc = EXCLUDED.price_pc,
  image_url = EXCLUDED.image_url,
  is_daily_only = EXCLUDED.is_daily_only,
  drop_rates = EXCLUDED.drop_rates;
