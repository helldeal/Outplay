-- Create game-specific roles to avoid cross-game collisions on role name/logo.
WITH role_labels(role_slug, role_name) AS (
  VALUES
    ('toplaner', 'Toplaner'),
    ('jungler', 'Jungler'),
    ('midlaner', 'Midlaner'),
    ('adc', 'ADC'),
    ('mid-adc', 'Mid / ADC'),
    ('support', 'Support'),
    ('rifler', 'Rifler'),
    ('entry', 'Entry'),
    ('lurker', 'Lurker'),
    ('duelist', 'Duelist'),
    ('controller', 'Controller'),
    ('flex', 'Flex'),
    ('sentinel', 'Sentinel'),
    ('igl', 'IGL'),
    ('ar', 'AR'),
    ('smg', 'SMG'),
    ('initiator', 'Initiator'),
    ('awper', 'AWPer'),
    ('anchor', 'Anchor'),
    ('slayer', 'Slayer')
),
existing_card_targets AS (
  SELECT DISTINCT
    g.slug AS game_slug,
    CASE
      WHEN r.slug = 'awper-rifler' THEN
        CASE
          WHEN lower(c.name) = 'pashabiceps' THEN 'rifler'
          ELSE 'awper'
        END
      WHEN r.slug = 'awper-igl' THEN
        CASE
          WHEN lower(c.name) = 'fallen' THEN 'awper'
          ELSE 'igl'
        END
      ELSE r.slug
    END AS role_slug
  FROM public.cards c
  JOIN public.games g ON g.id = c.game_id
  JOIN public.roles r ON r.id = c.role_id
),
required_missing(game_slug, role_slug) AS (
  VALUES
    ('league-of-legends', 'support'),
    ('counter-strike-2', 'support'),
    ('counter-strike-global-offensive', 'support'),
    ('valorant', 'igl'),
    ('counter-strike-2', 'igl'),
    ('counter-strike-global-offensive', 'igl')
),
role_catalog AS (
  SELECT game_slug, role_slug
  FROM existing_card_targets
  UNION
  SELECT game_slug, role_slug
  FROM required_missing
),
resolved_catalog AS (
  SELECT
    rc.game_slug,
    rc.role_slug,
    COALESCE(rl.role_name, initcap(replace(rc.role_slug, '-', ' '))) AS role_name
  FROM role_catalog rc
  LEFT JOIN role_labels rl ON rl.role_slug = rc.role_slug
)
INSERT INTO public.roles (id, name, slug, "iconUrl")
SELECT
  (
    substr(md5('role:' || rc.game_slug || ':' || rc.role_slug), 1, 8) || '-' ||
    substr(md5('role:' || rc.game_slug || ':' || rc.role_slug), 9, 4) || '-' ||
    substr(md5('role:' || rc.game_slug || ':' || rc.role_slug), 13, 4) || '-' ||
    substr(md5('role:' || rc.game_slug || ':' || rc.role_slug), 17, 4) || '-' ||
    substr(md5('role:' || rc.game_slug || ':' || rc.role_slug), 21, 12)
  )::uuid,
  rc.role_name,
  rc.game_slug || '-' || rc.role_slug,
  '/src/assets/roles/' || rc.game_slug || '-' || rc.role_slug || '.png'
FROM resolved_catalog rc
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  "iconUrl" = EXCLUDED."iconUrl";

WITH card_target AS (
  SELECT
    c.id AS card_id,
    g.slug AS game_slug,
    CASE
      WHEN r.slug = 'awper-rifler' THEN
        CASE
          WHEN lower(c.name) = 'pashabiceps' THEN 'rifler'
          ELSE 'awper'
        END
      WHEN r.slug = 'awper-igl' THEN
        CASE
          WHEN lower(c.name) = 'fallen' THEN 'awper'
          ELSE 'igl'
        END
      ELSE r.slug
    END AS role_slug
  FROM public.cards c
  JOIN public.games g ON g.id = c.game_id
  JOIN public.roles r ON r.id = c.role_id
),
resolved_target AS (
  SELECT
    ct.card_id,
    r.id AS role_id
  FROM card_target ct
  JOIN public.roles r
    ON r.slug = ct.game_slug || '-' || ct.role_slug
)
UPDATE public.cards c
SET role_id = rt.role_id
FROM resolved_target rt
WHERE c.id = rt.card_id
  AND c.role_id IS DISTINCT FROM rt.role_id;

-- Remove legacy global/compound roles once nothing references them.
DELETE FROM public.roles r
WHERE r.slug IN (
  'toplaner',
  'jungler',
  'midlaner',
  'adc',
  'mid-adc',
  'support',
  'rifler',
  'entry',
  'lurker',
  'duelist',
  'controller',
  'flex',
  'sentinel',
  'igl',
  'ar',
  'smg',
  'initiator',
  'awper',
  'anchor',
  'slayer',
  'awper-rifler',
  'awper-igl'
)
AND NOT EXISTS (
  SELECT 1
  FROM public.cards c
  WHERE c.role_id = r.id
);
