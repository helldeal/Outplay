BEGIN;

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
  c.id || '__TMP',
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
WHERE c.id IN ('S2-32', 'S2-38');

UPDATE public.user_cards
SET card_id = card_id || '__TMP'
WHERE card_id IN ('S2-32', 'S2-38');

UPDATE public.users
SET signature_card_id = signature_card_id || '__TMP'
WHERE signature_card_id IN ('S2-32', 'S2-38');

DELETE FROM public.cards
WHERE id IN ('S2-32', 'S2-38');

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
  CASE c.id
    WHEN 'S2-32__TMP' THEN 'S2-38'
    WHEN 'S2-38__TMP' THEN 'S2-32'
  END,
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
WHERE c.id IN ('S2-32__TMP', 'S2-38__TMP');

UPDATE public.user_cards
SET card_id = CASE card_id
  WHEN 'S2-32__TMP' THEN 'S2-38'
  WHEN 'S2-38__TMP' THEN 'S2-32'
  ELSE card_id
END
WHERE card_id IN ('S2-32__TMP', 'S2-38__TMP');

UPDATE public.users
SET signature_card_id = CASE signature_card_id
  WHEN 'S2-32__TMP' THEN 'S2-38'
  WHEN 'S2-38__TMP' THEN 'S2-32'
  ELSE signature_card_id
END
WHERE signature_card_id IN ('S2-32__TMP', 'S2-38__TMP');

DELETE FROM public.cards
WHERE id IN ('S2-32__TMP', 'S2-38__TMP');

COMMIT;
