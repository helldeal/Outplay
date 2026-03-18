-- Reorganize S2 cards rarity to match proper range structure
-- S2-01 to S2-32: ROOKIE (32)
-- S2-33 to S2-52: CHALLENGER (20)  
-- S2-53 to S2-62: CHAMPION (10)
-- S2-63 to S2-69: WORLD_CLASS (7)
-- S2-70: LEGENDS (1)

-- Update S2-38 (Boaster) from CHALLENGER to ROOKIE
UPDATE public.cards
SET rarity = 'ROOKIE', pc_value = 100
WHERE id = 'S2-38';

-- Update S2-50, S2-51, S2-52 from CHAMPION to CHALLENGER
UPDATE public.cards
SET rarity = 'CHALLENGER', pc_value = 250
WHERE id IN ('S2-50', 'S2-51', 'S2-52');
