-- Rebalance selected S2 cards: rarity changes + ID permutation to keep rarity tiers coherent

BEGIN;

WITH mapping(old_id, new_id, new_rarity) AS (
  VALUES
    ('S2-44', 'S2-31', 'ROOKIE'),
    ('S2-32', 'S2-29', 'ROOKIE'),
    ('S2-55', 'S2-28', 'ROOKIE'),
    ('S2-33', 'S2-30', 'ROOKIE'),
    ('S2-29', 'S2-32', 'CHALLENGER'),
    ('S2-30', 'S2-33', 'CHALLENGER'),
    ('S2-54', 'S2-48', 'CHALLENGER'),
    ('S2-31', 'S2-44', 'CHALLENGER'),
    ('S2-51', 'S2-49', 'CHALLENGER'),
    ('S2-48', 'S2-54', 'CHAMPION'),
    ('S2-49', 'S2-51', 'CHAMPION'),
    ('S2-28', 'S2-55', 'CHAMPION')
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
  role_id,
  created_at
)
SELECT
  m.old_id || '__TMP',
  c.name,
  m.new_rarity::public."Rarity",
  CASE m.new_rarity::public."Rarity"
    WHEN 'ROOKIE'::public."Rarity" THEN 100
    WHEN 'CHALLENGER'::public."Rarity" THEN 250
    WHEN 'CHAMPION'::public."Rarity" THEN 800
    WHEN 'WORLD_CLASS'::public."Rarity" THEN 2500
    WHEN 'LEGENDS'::public."Rarity" THEN 10000
  END,
  '/src/assets/cards/S2/' || m.new_id || '.webp',
  c."animationUrl",
  c.series_id,
  c.game_id,
  c.team_id,
  c.nationality_id,
  c.role_id,
  c.created_at
FROM public.cards c
JOIN mapping m ON m.old_id = c.id;

WITH mapping(old_id, new_id) AS (
  VALUES
    ('S2-44', 'S2-31'),
    ('S2-32', 'S2-29'),
    ('S2-55', 'S2-28'),
    ('S2-33', 'S2-30'),
    ('S2-29', 'S2-32'),
    ('S2-30', 'S2-33'),
    ('S2-54', 'S2-48'),
    ('S2-31', 'S2-44'),
    ('S2-51', 'S2-49'),
    ('S2-48', 'S2-54'),
    ('S2-49', 'S2-51'),
    ('S2-28', 'S2-55')
)
UPDATE public.user_cards uc
SET card_id = m.old_id || '__TMP'
FROM mapping m
WHERE uc.card_id = m.old_id;

WITH mapping(old_id, new_id) AS (
  VALUES
    ('S2-44', 'S2-31'),
    ('S2-32', 'S2-29'),
    ('S2-55', 'S2-28'),
    ('S2-33', 'S2-30'),
    ('S2-29', 'S2-32'),
    ('S2-30', 'S2-33'),
    ('S2-54', 'S2-48'),
    ('S2-31', 'S2-44'),
    ('S2-51', 'S2-49'),
    ('S2-48', 'S2-54'),
    ('S2-49', 'S2-51'),
    ('S2-28', 'S2-55')
)
UPDATE public.users u
SET signature_card_id = m.old_id || '__TMP'
FROM mapping m
WHERE u.signature_card_id = m.old_id;

WITH mapping(old_id) AS (
  VALUES
    ('S2-44'),
    ('S2-32'),
    ('S2-55'),
    ('S2-33'),
    ('S2-29'),
    ('S2-30'),
    ('S2-54'),
    ('S2-31'),
    ('S2-51'),
    ('S2-48'),
    ('S2-49'),
    ('S2-28')
)
DELETE FROM public.cards c
USING mapping m
WHERE c.id = m.old_id;

WITH mapping(old_id, new_id) AS (
  VALUES
    ('S2-44', 'S2-31'),
    ('S2-32', 'S2-29'),
    ('S2-55', 'S2-28'),
    ('S2-33', 'S2-30'),
    ('S2-29', 'S2-32'),
    ('S2-30', 'S2-33'),
    ('S2-54', 'S2-48'),
    ('S2-31', 'S2-44'),
    ('S2-51', 'S2-49'),
    ('S2-48', 'S2-54'),
    ('S2-49', 'S2-51'),
    ('S2-28', 'S2-55')
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
  role_id,
  created_at
)
SELECT
  m.new_id,
  c.name,
  c.rarity,
  c.pc_value,
  c."imageUrl",
  c."animationUrl",
  c.series_id,
  c.game_id,
  c.team_id,
  c.nationality_id,
  c.role_id,
  c.created_at
FROM public.cards c
JOIN mapping m ON c.id = m.old_id || '__TMP';

WITH mapping(old_id, new_id) AS (
  VALUES
    ('S2-44', 'S2-31'),
    ('S2-32', 'S2-29'),
    ('S2-55', 'S2-28'),
    ('S2-33', 'S2-30'),
    ('S2-29', 'S2-32'),
    ('S2-30', 'S2-33'),
    ('S2-54', 'S2-48'),
    ('S2-31', 'S2-44'),
    ('S2-51', 'S2-49'),
    ('S2-48', 'S2-54'),
    ('S2-49', 'S2-51'),
    ('S2-28', 'S2-55')
)
UPDATE public.user_cards uc
SET card_id = m.new_id
FROM mapping m
WHERE uc.card_id = m.old_id || '__TMP';

WITH mapping(old_id, new_id) AS (
  VALUES
    ('S2-44', 'S2-31'),
    ('S2-32', 'S2-29'),
    ('S2-55', 'S2-28'),
    ('S2-33', 'S2-30'),
    ('S2-29', 'S2-32'),
    ('S2-30', 'S2-33'),
    ('S2-54', 'S2-48'),
    ('S2-31', 'S2-44'),
    ('S2-51', 'S2-49'),
    ('S2-48', 'S2-54'),
    ('S2-49', 'S2-51'),
    ('S2-28', 'S2-55')
)
UPDATE public.users u
SET signature_card_id = m.new_id
FROM mapping m
WHERE u.signature_card_id = m.old_id || '__TMP';

WITH mapping(old_id) AS (
  VALUES
    ('S2-44'),
    ('S2-32'),
    ('S2-55'),
    ('S2-33'),
    ('S2-29'),
    ('S2-30'),
    ('S2-54'),
    ('S2-31'),
    ('S2-51'),
    ('S2-48'),
    ('S2-49'),
    ('S2-28')
)
DELETE FROM public.cards c
USING mapping m
WHERE c.id = m.old_id || '__TMP';

COMMIT;
