-- Fix REST 403 on read endpoints by aligning grants + RLS policies.
-- Public catalog data should be readable by anon and authenticated users.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Catalog tables used across app pages and embedded selects.
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nationalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boosters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS games_select_all ON public.games;
CREATE POLICY games_select_all
ON public.games
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS teams_select_all ON public.teams;
CREATE POLICY teams_select_all
ON public.teams
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS nationalities_select_all ON public.nationalities;
CREATE POLICY nationalities_select_all
ON public.nationalities
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS roles_select_all ON public.roles;
CREATE POLICY roles_select_all
ON public.roles
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS series_select_all ON public.series;
CREATE POLICY series_select_all
ON public.series
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS cards_select_all ON public.cards;
CREATE POLICY cards_select_all
ON public.cards
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS boosters_select_all ON public.boosters;
CREATE POLICY boosters_select_all
ON public.boosters
FOR SELECT
TO anon, authenticated
USING (true);

GRANT SELECT ON TABLE
  public.games,
  public.teams,
  public.nationalities,
  public.roles,
  public.series,
  public.cards,
  public.boosters
TO anon, authenticated;

-- Private/user tables remain constrained by existing per-user RLS,
-- but authenticated role still needs table privileges.
GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_cards TO authenticated;
GRANT SELECT, INSERT ON TABLE public.booster_openings TO authenticated;
