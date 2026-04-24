-- Align achievement categories with existing buckets
-- Requested: add to existing Economy and Esport categories

UPDATE public.achievement_definitions
SET category = 'Economy'
WHERE category = 'Economie'
   OR code IN ('ECO_SPENDER_I', 'ECO_SPENDER_II', 'ECO_DUPLICATE_MAGNET');

UPDATE public.achievement_definitions
SET category = 'Esport'
WHERE category = 'Esport LoL'
   OR code IN ('LOL_SCOUT', 'LOL_WORLD_ELITE', 'LOL_LEGENDARY_ICON');
