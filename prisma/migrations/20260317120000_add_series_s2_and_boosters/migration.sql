-- Add Series S2 with cards and boosters (idempotent, CI-friendly, no seed dependency)

WITH game_data(name, slug, "logoUrl") AS (
  VALUES
    ('Counter-Strike 2', 'counter-strike-2', '/src/assets/games/counter-strike.png'),
    ('Counter-Strike: Global Offensive', 'counter-strike-global-offensive', '/src/assets/games/counter-strike.png'),
    ('Valorant', 'valorant', '/src/assets/games/valorant.png'),
    ('Call of Duty', 'call-of-duty', '/src/assets/games/call-of-duty.png'),
    ('Multi-Game', 'multi-game', '/src/assets/games/multi-game.png')
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
    ('Eternal Fire', 'eternal-fire', '/src/assets/teams/eternal-fire.png'),
    ('The MongolZ', 'the-mongolz', '/src/assets/teams/the-mongolz.png'),
    ('G2 Esports', 'g2-esports', '/src/assets/teams/g2-esports.webp'),
    ('MOUZ', 'mouz', '/src/assets/teams/mouz.png'),
    ('Gen.G', 'gen-g', '/src/assets/teams/gen-g.png'),
    ('Team Heretics', 'team-heretics', '/src/assets/teams/team-heretics.png'),
    ('EDG', 'edg', '/src/assets/teams/edg.png'),
    ('Heroic', 'heroic', '/src/assets/teams/heroic.png'),
    ('Team Vitality', 'team-vitality', '/src/assets/teams/team-vitality.png'),
    ('Toronto Ultra', 'toronto-ultra', '/src/assets/teams/toronto-ultra.png'),
    ('OpTic Texas', 'optic-texas', '/src/assets/teams/optic-texas.png'),
    ('NY Subliners', 'ny-subliners', '/src/assets/teams/ny-subliners.png'),
    ('LOUD', 'loud', '/src/assets/teams/loud.png'),
    ('Fnatic', 'fnatic', '/src/assets/teams/fnatic.png'),
    ('Sentinels', 'sentinels', '/src/assets/teams/sentinels.png'),
    ('Leviatán', 'leviatan', '/src/assets/teams/leviatan.png'),
    ('FaZe Clan', 'faze-clan', '/src/assets/teams/faze-clan.png'),
    ('Cloud9', 'cloud9', '/src/assets/teams/cloud9.png'),
    ('Complexity', 'complexity', '/src/assets/teams/complexity.png'),
    ('Team Spirit', 'team-spirit', '/src/assets/teams/team-spirit.png'),
    ('OpTic Gaming', 'optic-gaming', '/src/assets/teams/optic-gaming.png'),
    ('Acend', 'acend', '/src/assets/teams/acend.png'),
    ('Virtus.pro', 'virtus-pro', '/src/assets/teams/virtus-pro.png'),
    ('Team Liquid', 'team-liquid', '/src/assets/teams/team-liquid.png'),
    ('NAVI', 'navi', '/src/assets/teams/navi.png'),
    ('100 Thieves', '100-thieves', '/src/assets/teams/100-thieves.png'),
    ('Atlanta FaZe', 'atlanta-faze', '/src/assets/teams/atlanta-faze.png'),
    ('EnvyUs', 'envyus', '/src/assets/teams/envyus.png'),
    ('Luminosity', 'luminosity', '/src/assets/teams/luminosity.png'),
    ('Astralis', 'astralis', '/src/assets/teams/astralis.png'),
    ('SK Gaming', 'sk-gaming', '/src/assets/teams/sk-gaming.png'),
    ('NiP', 'nip', '/src/assets/teams/nip.svg'),
    ('Quake Team', 'quake-team', '/src/assets/teams/quake-team.png')
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
    ('Turquie', 'TR', 'https://flagcdn.com/w80/tr.png'),
    ('Mongolie', 'MN', 'https://flagcdn.com/w80/mn.png'),
    ('Guatemala', 'GT', 'https://flagcdn.com/w80/gt.png'),
    ('Finlande', 'FI', 'https://flagcdn.com/w80/fi.png'),
    ('Corée du Sud', 'KR', 'https://flagcdn.com/w80/kr.png'),
    ('Lituanie', 'LT', 'https://flagcdn.com/w80/lt.png'),
    ('UK', 'GB', 'https://flagcdn.com/w80/gb.png'),
    ('Chine', 'CN', 'https://flagcdn.com/w80/cn.png'),
    ('Israël', 'IL', 'https://flagcdn.com/w80/il.png'),
    ('Pologne', 'PL', 'https://flagcdn.com/w80/pl.png'),
    ('USA', 'US', 'https://flagcdn.com/w80/us.png'),
    ('Australie', 'AU', 'https://flagcdn.com/w80/au.png'),
    ('France', 'FR', 'https://flagcdn.com/w80/fr.png'),
    ('Brésil', 'BR', 'https://flagcdn.com/w80/br.png'),
    ('Suède', 'SE', 'https://flagcdn.com/w80/se.png'),
    ('Russie', 'RU', 'https://flagcdn.com/w80/ru.png'),
    ('Slovaquie', 'SK', 'https://flagcdn.com/w80/sk.png'),
    ('Danemark', 'DK', 'https://flagcdn.com/w80/dk.png'),
    ('Argentine', 'AR', 'https://flagcdn.com/w80/ar.png'),
    ('Norvège', 'NO', 'https://flagcdn.com/w80/no.png'),
    ('Canada', 'CA', 'https://flagcdn.com/w80/ca.png'),
    ('Lettonie', 'LV', 'https://flagcdn.com/w80/lv.png'),
    ('Estonie', 'EE', 'https://flagcdn.com/w80/ee.png'),
    ('Bosnie', 'BA', 'https://flagcdn.com/w80/ba.png'),
    ('Ukraine', 'UA', 'https://flagcdn.com/w80/ua.png')
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

WITH role_data(name, slug, "iconUrl") AS (
  VALUES
    ('Rifler', 'rifler', '/src/assets/roles/rifler.png'),
    ('Entry', 'entry', '/src/assets/roles/entry.png'),
    ('Lurker', 'lurker', '/src/assets/roles/lurker.png'),
    ('Duelist', 'duelist', '/src/assets/roles/duelist.png'),
    ('Controller', 'controller', '/src/assets/roles/controller.png'),
    ('Flex', 'flex', '/src/assets/roles/flex.png'),
    ('Sentinel', 'sentinel', '/src/assets/roles/sentinel.png'),
    ('IGL', 'igl', '/src/assets/roles/igl.png'),
    ('AR', 'ar', '/src/assets/roles/ar.png'),
    ('SMG', 'smg', '/src/assets/roles/smg.png'),
    ('Initiator', 'initiator', '/src/assets/roles/initiator.png'),
    ('AWPer', 'awper', '/src/assets/roles/awper.png'),
    ('Anchor', 'anchor', '/src/assets/roles/anchor.png'),
    ('Support', 'support', '/src/assets/roles/support.png'),
    ('AWPer/Rifler', 'awper-rifler', '/src/assets/roles/awper-rifler.png'),
    ('AWPer/IGL', 'awper-igl', '/src/assets/roles/awper-igl.png'),
    ('Slayer', 'slayer', '/src/assets/roles/slayer.png')
)
INSERT INTO public.roles (id, name, slug, "iconUrl")
SELECT
  (
    substr(md5('role:' || slug), 1, 8) || '-' ||
    substr(md5('role:' || slug), 9, 4) || '-' ||
    substr(md5('role:' || slug), 13, 4) || '-' ||
    substr(md5('role:' || slug), 17, 4) || '-' ||
    substr(md5('role:' || slug), 21, 12)
  )::uuid,
  name,
  slug,
  "iconUrl"
FROM role_data
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  "iconUrl" = EXCLUDED."iconUrl";

INSERT INTO public.series (id, name, slug, code, "coverImage")
VALUES (
  (
    substr(md5('series:S2'), 1, 8) || '-' ||
    substr(md5('series:S2'), 9, 4) || '-' ||
    substr(md5('series:S2'), 13, 4) || '-' ||
    substr(md5('series:S2'), 17, 4) || '-' ||
    substr(md5('series:S2'), 21, 12)
  )::uuid,
  'Clutch factor',
  'clutch-factor',
  'S2',
  '/src/assets/series/clutch-factor.jpg'
)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  "coverImage" = EXCLUDED."coverImage";

WITH card_input(id, name, rarity, game_slug, nationality_code, role_slug, team_slug) AS (
  VALUES
    ('S2-01', 'Wicadia', 'ROOKIE', 'counter-strike-2', 'TR', 'rifler', 'eternal-fire'),
    ('S2-02', 'Senzu', 'ROOKIE', 'counter-strike-2', 'MN', 'rifler', 'the-mongolz'),
    ('S2-03', 'MalbsMd', 'ROOKIE', 'counter-strike-2', 'GT', 'entry', 'g2-esports'),
    ('S2-04', 'Jimpphat', 'ROOKIE', 'counter-strike-2', 'FI', 'lurker', 'mouz'),
    ('S2-05', 'Texture', 'ROOKIE', 'valorant', 'KR', 'duelist', 'gen-g'),
    ('S2-06', 'Karon', 'ROOKIE', 'valorant', 'KR', 'controller', 'gen-g'),
    ('S2-07', 'Miniboo', 'ROOKIE', 'valorant', 'LT', 'duelist', 'team-heretics'),
    ('S2-08', 'Wo0t', 'ROOKIE', 'valorant', 'TR', 'flex', 'team-heretics'),
    ('S2-09', 'Benjyfishy', 'ROOKIE', 'valorant', 'GB', 'sentinel', 'team-heretics'),
    ('S2-10', 'Chichoo', 'ROOKIE', 'valorant', 'CN', 'controller', 'edg'),
    ('S2-11', 'ZmjjKK', 'ROOKIE', 'valorant', 'CN', 'duelist', 'edg'),
    ('S2-12', 'NertZ', 'ROOKIE', 'counter-strike-2', 'IL', 'rifler', 'heroic'),
    ('S2-13', 'FlameZ', 'ROOKIE', 'counter-strike-2', 'IL', 'rifler', 'team-vitality'),
    ('S2-14', 'XertioN', 'ROOKIE', 'counter-strike-2', 'IL', 'entry', 'mouz'),
    ('S2-15', 'Siuhy', 'ROOKIE', 'counter-strike-2', 'PL', 'igl', 'mouz'),
    ('S2-16', 'Scrap', 'ROOKIE', 'call-of-duty', 'US', 'ar', 'toronto-ultra'),
    ('S2-17', 'Pred', 'ROOKIE', 'call-of-duty', 'AU', 'smg', 'optic-texas'),
    ('S2-18', 'Hydra', 'ROOKIE', 'call-of-duty', 'FR', 'smg', 'ny-subliners'),
    ('S2-19', 'Less', 'ROOKIE', 'valorant', 'BR', 'sentinel', 'loud'),
    ('S2-20', 'Leo', 'ROOKIE', 'valorant', 'SE', 'initiator', 'fnatic'),
    ('S2-21', 'Chronicle', 'ROOKIE', 'valorant', 'RU', 'flex', 'fnatic'),
    ('S2-22', 'Alfajer', 'ROOKIE', 'valorant', 'TR', 'sentinel', 'fnatic'),
    ('S2-23', 'Zekken', 'ROOKIE', 'valorant', 'US', 'duelist', 'sentinels'),
    ('S2-24', 'Aspas', 'ROOKIE', 'valorant', 'BR', 'duelist', 'leviatan'),
    ('S2-25', 'Frozen', 'ROOKIE', 'counter-strike-2', 'SK', 'rifler', 'faze-clan'),
    ('S2-26', 'Spinx', 'ROOKIE', 'counter-strike-2', 'IL', 'lurker', 'team-vitality'),
    ('S2-27', 'Ax1Le', 'ROOKIE', 'counter-strike-2', 'RU', 'rifler', 'cloud9'),
    ('S2-28', 'Magisk', 'ROOKIE', 'counter-strike-2', 'DK', 'anchor', 'team-vitality'),
    ('S2-29', 'EliGE', 'ROOKIE', 'counter-strike-2', 'US', 'rifler', 'complexity'),
    ('S2-30', 'm0NESY', 'ROOKIE', 'counter-strike-2', 'RU', 'awper', 'g2-esports'),
    ('S2-31', 'Donk', 'ROOKIE', 'counter-strike-2', 'RU', 'entry', 'team-spirit'),
    ('S2-32', 'Jks', 'CHALLENGER', 'counter-strike-global-offensive', 'AU', 'lurker', 'g2-esports'),
    ('S2-33', 'Yay', 'CHALLENGER', 'valorant', 'US', 'duelist', 'optic-gaming'),
    ('S2-34', 'TenZ', 'CHALLENGER', 'valorant', 'CA', 'duelist', 'sentinels'),
    ('S2-35', 'CNed', 'CHALLENGER', 'valorant', 'TR', 'duelist', 'acend'),
    ('S2-36', 'Derke', 'CHALLENGER', 'valorant', 'FI', 'duelist', 'fnatic'),
    ('S2-37', 'Saadhak', 'CHALLENGER', 'valorant', 'AR', 'igl', 'loud'),
    ('S2-38', 'Boaster', 'CHALLENGER', 'valorant', 'GB', 'igl', 'fnatic'),
    ('S2-39', 'Rain', 'CHALLENGER', 'counter-strike-2', 'NO', 'entry', 'faze-clan'),
    ('S2-40', 'Twistzz', 'CHALLENGER', 'counter-strike-2', 'CA', 'rifler', 'faze-clan'),
    ('S2-41', 'Broky', 'CHALLENGER', 'counter-strike-2', 'LV', 'awper', 'faze-clan'),
    ('S2-42', 'Ropz', 'CHALLENGER', 'counter-strike-2', 'EE', 'lurker', 'faze-clan'),
    ('S2-43', 'Snax', 'CHALLENGER', 'counter-strike-global-offensive', 'PL', 'rifler', 'virtus-pro'),
    ('S2-44', 'Hiko', 'CHALLENGER', 'counter-strike-global-offensive', 'US', 'lurker', 'team-liquid'),
    ('S2-45', 'Shox', 'CHALLENGER', 'counter-strike-global-offensive', 'FR', 'lurker', 'g2-esports'),
    ('S2-46', 'Guardian', 'CHALLENGER', 'counter-strike-global-offensive', 'SK', 'awper', 'navi'),
    ('S2-47', 'NiKo', 'CHALLENGER', 'counter-strike-2', 'BA', 'rifler', 'g2-esports'),
    ('S2-48', 'Karrigan', 'CHALLENGER', 'counter-strike-2', 'DK', 'igl', 'faze-clan'),
    ('S2-49', 'Dupreeh', 'CHALLENGER', 'counter-strike-2', 'DK', 'entry', 'team-vitality'),
    ('S2-50', 'Sacy', 'CHAMPION', 'valorant', 'BR', 'initiator', 'sentinels'),
    ('S2-51', 'Boostio', 'CHAMPION', 'valorant', 'US', 'igl', '100-thieves'),
    ('S2-52', 'Shotzzy', 'CHAMPION', 'call-of-duty', 'US', 'smg', 'optic-texas'),
    ('S2-53', 'Simp', 'CHAMPION', 'call-of-duty', 'US', 'smg', 'atlanta-faze'),
    ('S2-54', 'Flusha', 'CHAMPION', 'counter-strike-global-offensive', 'SE', 'rifler', 'fnatic'),
    ('S2-55', 'PashaBiceps', 'CHAMPION', 'counter-strike-global-offensive', 'PL', 'awper-rifler', 'virtus-pro'),
    ('S2-56', 'NBK-', 'CHAMPION', 'counter-strike-global-offensive', 'FR', 'support', 'envyus'),
    ('S2-57', 'Olofmeister', 'CHAMPION', 'counter-strike-global-offensive', 'SE', 'rifler', 'fnatic'),
    ('S2-58', 'apEX', 'CHAMPION', 'counter-strike-2', 'FR', 'igl', 'team-vitality'),
    ('S2-59', 'Fallen', 'CHAMPION', 'counter-strike-global-offensive', 'BR', 'awper-igl', 'luminosity'),
    ('S2-60', 'Xyp9x', 'CHAMPION', 'counter-strike-global-offensive', 'DK', 'lurker', 'astralis'),
    ('S2-61', 'Device', 'CHAMPION', 'counter-strike-2', 'DK', 'awper', 'astralis'),
    ('S2-62', 'Coldzera', 'CHAMPION', 'counter-strike-global-offensive', 'BR', 'rifler', 'sk-gaming'),
    ('S2-63', 'Crimsix', 'WORLD_CLASS', 'call-of-duty', 'US', 'ar', 'optic-gaming'),
    ('S2-64', 'f0rest', 'WORLD_CLASS', 'counter-strike-global-offensive', 'SE', 'rifler', 'nip'),
    ('S2-65', 'GeT_RiGhT', 'WORLD_CLASS', 'counter-strike-global-offensive', 'SE', 'lurker', 'nip'),
    ('S2-66', 'Scump', 'WORLD_CLASS', 'call-of-duty', 'US', 'smg', 'optic-texas'),
    ('S2-67', 'KennyS', 'WORLD_CLASS', 'counter-strike-global-offensive', 'FR', 'awper', 'envyus'),
    ('S2-68', 'Fatal1ty', 'WORLD_CLASS', 'multi-game', 'US', 'slayer', 'quake-team'),
    ('S2-69', 's1mple', 'WORLD_CLASS', 'counter-strike-2', 'UA', 'awper', 'navi'),
    ('S2-70', 'ZywOo', 'LEGENDS', 'counter-strike-2', 'FR', 'awper', 'team-vitality')
),
resolved AS (
  SELECT
    ci.id,
    ci.name,
    ci.rarity::public."Rarity" AS rarity,
    '/src/assets/cards/S2/' || ci.id || '.webp' AS "imageUrl",
    s.id AS series_id,
    g.id AS game_id,
    t.id AS team_id,
    n.id AS nationality_id,
    r.id AS role_id
  FROM card_input ci
  JOIN public.series s ON s.code = 'S2'
  JOIN public.games g ON g.slug = ci.game_slug
  JOIN public.teams t ON t.slug = ci.team_slug
  JOIN public.nationalities n ON n.code = ci.nationality_code
  JOIN public.roles r ON r.slug = ci.role_slug
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

WITH s2 AS (
  SELECT id AS series_id FROM public.series WHERE code = 'S2'
),
booster_input(name, type, price_pc, image_url, is_daily_only, drop_rates) AS (
  VALUES
    (
      'S2 Normal Booster',
      'NORMAL',
      1250,
      '/src/assets/series/clutch-factor.jpg',
      false,
      '{"ROOKIE":80,"CHALLENGER":14,"CHAMPION":4.5,"WORLD_CLASS":1.45,"LEGENDS":0.05}'::jsonb
    ),
    (
      'S2 Luck Booster',
      'LUCK',
      3500,
      '/src/assets/series/clutch-factor.jpg',
      false,
      '{"ROOKIE":60,"CHALLENGER":24,"CHAMPION":11,"WORLD_CLASS":4.8,"LEGENDS":0.2}'::jsonb
    ),
    (
      'S2 Premium Booster',
      'PREMIUM',
      8000,
      '/src/assets/series/clutch-factor.jpg',
      false,
      '{"ROOKIE":40,"CHALLENGER":27,"CHAMPION":20,"WORLD_CLASS":12.2,"LEGENDS":0.8}'::jsonb
    ),
    (
      'S2 Godpack Booster',
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
    substr(md5('booster:S2:' || bi.type), 1, 8) || '-' ||
    substr(md5('booster:S2:' || bi.type), 9, 4) || '-' ||
    substr(md5('booster:S2:' || bi.type), 13, 4) || '-' ||
    substr(md5('booster:S2:' || bi.type), 17, 4) || '-' ||
    substr(md5('booster:S2:' || bi.type), 21, 12)
  )::uuid,
  bi.name,
  bi.type::public."BoosterType",
  bi.price_pc,
  bi.image_url,
  bi.is_daily_only,
  bi.drop_rates,
  s2.series_id
FROM booster_input bi
CROSS JOIN s2
ON CONFLICT (series_id, type) DO UPDATE
SET
  name = EXCLUDED.name,
  price_pc = EXCLUDED.price_pc,
  image_url = EXCLUDED.image_url,
  is_daily_only = EXCLUDED.is_daily_only;
