-- AlterTable
ALTER TABLE "series"
ALTER COLUMN "coverImage" SET DEFAULT 'https://example.com/series/default-cover.webp';

UPDATE "series"
SET "coverImage" = 'https://example.com/series/default-cover.webp'
WHERE "coverImage" IS NULL;

ALTER TABLE "series"
ALTER COLUMN "coverImage" SET NOT NULL,
ALTER COLUMN "coverImage" DROP DEFAULT;

ALTER TABLE "boosters"
ALTER COLUMN "image_url" DROP NOT NULL;

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_auth_user_to_public_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_username text;
  v_avatar_url text;
BEGIN
  v_username :=
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'global_name', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'preferred_username', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'user_name', '')
    );

  v_avatar_url :=
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'avatar_url', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'picture', '')
    );

  INSERT INTO public.users (id, username, avatar_url)
  VALUES (NEW.id, v_username, v_avatar_url)
  ON CONFLICT (id) DO UPDATE
  SET
    username = COALESCE(EXCLUDED.username, public.users.username),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_auth_user_to_public_users ON auth.users;
CREATE TRIGGER trg_sync_auth_user_to_public_users
AFTER INSERT OR UPDATE OF raw_user_meta_data
ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_auth_user_to_public_users();

INSERT INTO public.users (id, username, avatar_url)
SELECT
  au.id,
  COALESCE(
    NULLIF(au.raw_user_meta_data ->> 'global_name', ''),
    NULLIF(au.raw_user_meta_data ->> 'preferred_username', ''),
    NULLIF(au.raw_user_meta_data ->> 'name', ''),
    NULLIF(au.raw_user_meta_data ->> 'user_name', '')
  ) AS username,
  COALESCE(
    NULLIF(au.raw_user_meta_data ->> 'avatar_url', ''),
    NULLIF(au.raw_user_meta_data ->> 'picture', '')
  ) AS avatar_url
FROM auth.users au
ON CONFLICT (id) DO UPDATE
SET
  username = COALESCE(EXCLUDED.username, public.users.username),
  avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url);

CREATE OR REPLACE FUNCTION public.ensure_current_user_profile(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_auth_user auth.users%ROWTYPE;
  v_user public.users%ROWTYPE;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated user';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'You can only sync your own profile';
  END IF;

  SELECT *
  INTO v_auth_user
  FROM auth.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auth user not found';
  END IF;

  INSERT INTO public.users (id, username, avatar_url)
  VALUES (
    v_auth_user.id,
    COALESCE(
      NULLIF(v_auth_user.raw_user_meta_data ->> 'global_name', ''),
      NULLIF(v_auth_user.raw_user_meta_data ->> 'preferred_username', ''),
      NULLIF(v_auth_user.raw_user_meta_data ->> 'name', ''),
      NULLIF(v_auth_user.raw_user_meta_data ->> 'user_name', '')
    ),
    COALESCE(
      NULLIF(v_auth_user.raw_user_meta_data ->> 'avatar_url', ''),
      NULLIF(v_auth_user.raw_user_meta_data ->> 'picture', '')
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET
    username = COALESCE(EXCLUDED.username, public.users.username),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url)
  RETURNING * INTO v_user;

  RETURN v_user;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_current_user_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_current_user_profile(uuid) TO authenticated;
