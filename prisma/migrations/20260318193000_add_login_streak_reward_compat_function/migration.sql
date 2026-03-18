-- Compatibility shim for legacy login streak claim functions
-- Some deployed function bodies still reference _get_login_streak_reward(int).

CREATE OR REPLACE FUNCTION public._get_login_streak_reward(p_day int)
RETURNS TABLE (
  reward_type text,
  reward_pc int,
  reward_booster_type public."BoosterType"
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    reward_type,
    reward_pc,
    reward_booster_type
  FROM public._login_streak_reward_for_day(p_day);
$$;
