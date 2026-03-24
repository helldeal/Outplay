-- Rebalance booster prices and compensate historical SHOP openings.
-- New prices:
-- - NORMAL: 1600
-- - LUCK: 2700
-- - PREMIUM: 4650

UPDATE public.boosters
SET price_pc = CASE type
  WHEN 'NORMAL'::public."BoosterType" THEN 1600
  WHEN 'LUCK'::public."BoosterType" THEN 2700
  WHEN 'PREMIUM'::public."BoosterType" THEN 4650
  ELSE price_pc
END
WHERE type IN (
  'NORMAL'::public."BoosterType",
  'LUCK'::public."BoosterType",
  'PREMIUM'::public."BoosterType"
);

WITH user_compensation AS (
  SELECT
    bo.user_id,
    SUM(
      CASE
        WHEN b.type = 'LUCK'::public."BoosterType" THEN 800
        WHEN b.type = 'PREMIUM'::public."BoosterType" THEN 3350
        ELSE 0
      END
    )::int AS total_compensation
  FROM public.booster_openings bo
  JOIN public.boosters b ON b.id = bo.booster_id
  WHERE bo.type = 'SHOP'::public."OpeningType"
  GROUP BY bo.user_id
  HAVING SUM(
    CASE
      WHEN b.type = 'LUCK'::public."BoosterType" THEN 800
      WHEN b.type = 'PREMIUM'::public."BoosterType" THEN 3350
      ELSE 0
    END
  ) > 0
)
UPDATE public.users u
SET
  pc_balance = u.pc_balance + uc.total_compensation,
  total_pc_earned = u.total_pc_earned + uc.total_compensation::bigint
FROM user_compensation uc
WHERE u.id = uc.user_id;
