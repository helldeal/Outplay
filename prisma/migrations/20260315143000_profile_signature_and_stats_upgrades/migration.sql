-- Profile: signature card selection + richer public stats and identity update RPC.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS signature_card_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_signature_card_id_fkey'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
    ADD CONSTRAINT users_signature_card_id_fkey
    FOREIGN KEY (signature_card_id)
    REFERENCES public.cards(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS users_signature_card_id_idx
ON public.users(signature_card_id);

DROP FUNCTION IF EXISTS public.get_public_profile_overview(uuid);

CREATE OR REPLACE FUNCTION public.get_public_profile_overview(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  title text,
  leaderboard_position int,
  total_cards int,
  weighted_score int,
  achievements_unlocked int,
  total_openings int,
  normal_openings int,
  luck_openings int,
  premium_openings int,
  godpack_openings int,
  avg_pc_gained numeric,
  duplicate_rate numeric,
  big_pull_rate numeric,
  legends_owned int,
  world_class_owned int,
  champion_owned int,
  best_card_id text,
  best_card_name text,
  best_card_rarity public."Rarity",
  best_card_pc_value int,
  signature_card_id text,
  signature_card_name text,
  signature_card_rarity public."Rarity",
  signature_card_pc_value int,
  signature_card_image_url text,
  favorite_game text,
  pc_balance int,
  total_pc_earned bigint,
  total_pc_spent bigint,
  global_avg_big_pull_rate numeric,
  global_avg_duplicate_rate numeric,
  global_avg_pc_spent numeric,
  top_drop_cards jsonb
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH base_user AS (
    SELECT
      u.id,
      COALESCE(NULLIF(trim(u.username), ''), concat('Player-', left(u.id::text, 6))) AS username,
      u.avatar_url,
      NULLIF(trim(u.title), '') AS title,
      u.signature_card_id,
      u.pc_balance,
      u.total_pc_earned
    FROM public.users u
    WHERE u.id = p_user_id
  ),
  user_openings AS (
    SELECT
      bo.id,
      bo.user_id,
      bo.type AS opening_type,
      bo.cards,
      bo.pc_gained,
      bo.duplicate_cards,
      b.type AS booster_type,
      b.price_pc
    FROM public.booster_openings bo
    LEFT JOIN public.boosters b ON b.id = bo.booster_id
    WHERE bo.user_id = p_user_id
  ),
  opening_stats AS (
    SELECT
      COUNT(*)::int AS total_openings,
      COUNT(*) FILTER (WHERE o.booster_type = 'NORMAL')::int AS normal_openings,
      COUNT(*) FILTER (WHERE o.booster_type = 'LUCK')::int AS luck_openings,
      COUNT(*) FILTER (WHERE o.booster_type = 'PREMIUM')::int AS premium_openings,
      COUNT(*) FILTER (WHERE o.booster_type = 'GODPACK')::int AS godpack_openings,
      COALESCE(AVG(o.pc_gained::numeric), 0::numeric) AS avg_pc_gained,
      COALESCE(
        SUM(
          CASE
            WHEN o.opening_type = 'SHOP'::public."OpeningType" THEN COALESCE(o.price_pc, 0)
            ELSE 0
          END
        ),
        0
      )::bigint AS total_pc_spent,
      COALESCE(SUM(o.duplicate_cards), 0)::numeric AS duplicate_cards_total
    FROM user_openings o
  ),
  user_drop_cards AS (
    SELECT
      c.id,
      c.name,
      c.rarity,
      c.pc_value,
      c."imageUrl"
    FROM user_openings o
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE
        WHEN jsonb_typeof(o.cards::jsonb) = 'array' THEN o.cards::jsonb
        ELSE '[]'::jsonb
      END
    ) AS opened(card_id)
    JOIN public.cards c ON c.id = opened.card_id
  ),
  user_drop_stats AS (
    SELECT
      COUNT(*)::numeric AS total_drop_cards,
      COUNT(*) FILTER (
        WHERE udc.rarity IN ('LEGENDS'::public."Rarity", 'WORLD_CLASS'::public."Rarity")
      )::numeric AS big_pull_cards
    FROM user_drop_cards udc
  ),
  top_drop_cards_json AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'card_id', grouped.card_id,
          'card_name', grouped.card_name,
          'card_rarity', grouped.card_rarity,
          'card_image_url', grouped.card_image_url,
          'drops_count', grouped.drops_count
        )
        ORDER BY grouped.drops_count DESC, grouped.card_id ASC
      ),
      '[]'::jsonb
    ) AS value
    FROM (
      SELECT
        udc.id AS card_id,
        udc.name AS card_name,
        udc.rarity AS card_rarity,
        udc."imageUrl" AS card_image_url,
        COUNT(*)::bigint AS drops_count
      FROM user_drop_cards udc
      GROUP BY udc.id, udc.name, udc.rarity, udc."imageUrl"
      ORDER BY
        drops_count DESC,
        CASE udc.rarity
          WHEN 'LEGENDS'::public."Rarity" THEN 5
          WHEN 'WORLD_CLASS'::public."Rarity" THEN 4
          WHEN 'CHAMPION'::public."Rarity" THEN 3
          WHEN 'CHALLENGER'::public."Rarity" THEN 2
          WHEN 'ROOKIE'::public."Rarity" THEN 1
          ELSE 0
        END DESC,
        udc.id ASC
      LIMIT 5
    ) grouped
  ),
  card_stats AS (
    SELECT
      COUNT(*)::int AS total_cards,
      COALESCE(SUM(c.pc_value), 0)::int AS weighted_score,
      COUNT(*) FILTER (WHERE c.rarity = 'LEGENDS')::int AS legends_owned,
      COUNT(*) FILTER (WHERE c.rarity = 'WORLD_CLASS')::int AS world_class_owned,
      COUNT(*) FILTER (WHERE c.rarity = 'CHAMPION')::int AS champion_owned
    FROM public.user_cards uc
    JOIN public.cards c ON c.id = uc.card_id
    WHERE uc.user_id = p_user_id
  ),
  achievements_stats AS (
    SELECT COUNT(*)::int AS achievements_unlocked
    FROM public.user_achievements ua
    WHERE ua.user_id = p_user_id
  ),
  best_card AS (
    SELECT
      c.id,
      c.name,
      c.rarity,
      c.pc_value
    FROM public.user_cards uc
    JOIN public.cards c ON c.id = uc.card_id
    WHERE uc.user_id = p_user_id
    ORDER BY c.pc_value DESC, uc.obtained_at DESC
    LIMIT 1
  ),
  signature_card AS (
    SELECT
      c.id,
      c.name,
      c.rarity,
      c.pc_value,
      c."imageUrl"
    FROM base_user bu
    JOIN public.cards c ON c.id = bu.signature_card_id
    JOIN public.user_cards uc
      ON uc.user_id = bu.id
     AND uc.card_id = c.id
    LIMIT 1
  ),
  favorite_game AS (
    SELECT
      g.name,
      COUNT(*)::int AS card_count
    FROM public.user_cards uc
    JOIN public.cards c ON c.id = uc.card_id
    JOIN public.games g ON g.id = c.game_id
    WHERE uc.user_id = p_user_id
    GROUP BY g.name
    ORDER BY card_count DESC, g.name ASC
    LIMIT 1
  ),
  leaderboard_ranks AS (
    SELECT
      ranked.user_id,
      ranked.leaderboard_position
    FROM (
      SELECT
        u.id AS user_id,
        DENSE_RANK() OVER (
          ORDER BY
            COALESCE(SUM(c.pc_value), 0) DESC,
            COUNT(uc.card_id) DESC,
            COALESCE(NULLIF(trim(u.username), ''), concat('Player-', left(u.id::text, 6))) ASC
        )::int AS leaderboard_position
      FROM public.users u
      LEFT JOIN public.user_cards uc ON uc.user_id = u.id
      LEFT JOIN public.cards c ON c.id = uc.card_id
      GROUP BY u.id, u.username
    ) ranked
    WHERE ranked.user_id = p_user_id
  ),
  all_user_base AS (
    SELECT
      u.id AS user_id,
      bo.id AS opening_id,
      bo.type AS opening_type,
      bo.cards,
      bo.duplicate_cards,
      b.price_pc,
      b.type AS booster_type
    FROM public.users u
    LEFT JOIN public.booster_openings bo ON bo.user_id = u.id
    LEFT JOIN public.boosters b ON b.id = bo.booster_id
  ),
  all_user_opening_stats AS (
    SELECT
      aub.user_id,
      COUNT(aub.opening_id)::numeric AS total_openings,
      COALESCE(SUM(aub.duplicate_cards), 0)::numeric AS duplicate_cards_total,
      COALESCE(
        SUM(
          CASE
            WHEN aub.opening_type = 'SHOP'::public."OpeningType" THEN COALESCE(aub.price_pc, 0)
            ELSE 0
          END
        ),
        0
      )::numeric AS total_pc_spent
    FROM all_user_base aub
    GROUP BY aub.user_id
  ),
  all_user_drop_stats AS (
    SELECT
      aub.user_id,
      COUNT(*)::numeric AS total_drop_cards,
      COUNT(*) FILTER (
        WHERE c.rarity IN ('LEGENDS'::public."Rarity", 'WORLD_CLASS'::public."Rarity")
      )::numeric AS big_pull_cards
    FROM all_user_base aub
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE
        WHEN aub.cards IS NULL THEN '[]'::jsonb
        WHEN jsonb_typeof(aub.cards::jsonb) = 'array' THEN aub.cards::jsonb
        ELSE '[]'::jsonb
      END
    ) AS opened(card_id)
    JOIN public.cards c ON c.id = opened.card_id
    GROUP BY aub.user_id
  ),
  all_user_rates AS (
    SELECT
      aou.user_id,
      CASE
        WHEN COALESCE(aud.total_drop_cards, 0) = 0 THEN 0::numeric
        ELSE (COALESCE(aud.big_pull_cards, 0) * 100.0) / aud.total_drop_cards
      END AS big_pull_rate,
      CASE
        WHEN COALESCE(aud.total_drop_cards, 0) = 0 THEN 0::numeric
        ELSE (COALESCE(aou.duplicate_cards_total, 0) * 100.0) / aud.total_drop_cards
      END AS duplicate_rate,
      aou.total_pc_spent,
      COALESCE(aud.total_drop_cards, 0) AS total_drop_cards,
      aou.total_openings
    FROM all_user_opening_stats aou
    LEFT JOIN all_user_drop_stats aud ON aud.user_id = aou.user_id
  ),
  global_averages AS (
    SELECT
      COALESCE(AVG(big_pull_rate) FILTER (WHERE total_drop_cards > 0), 0::numeric) AS avg_big_pull_rate,
      COALESCE(AVG(duplicate_rate) FILTER (WHERE total_drop_cards > 0), 0::numeric) AS avg_duplicate_rate,
      COALESCE(AVG(total_pc_spent) FILTER (WHERE total_openings > 0), 0::numeric) AS avg_pc_spent
    FROM all_user_rates
  )
  SELECT
    bu.id AS user_id,
    bu.username,
    bu.avatar_url,
    bu.title,
    lr.leaderboard_position,
    COALESCE(cs.total_cards, 0) AS total_cards,
    COALESCE(cs.weighted_score, 0) AS weighted_score,
    COALESCE(ach.achievements_unlocked, 0) AS achievements_unlocked,
    COALESCE(os.total_openings, 0) AS total_openings,
    COALESCE(os.normal_openings, 0) AS normal_openings,
    COALESCE(os.luck_openings, 0) AS luck_openings,
    COALESCE(os.premium_openings, 0) AS premium_openings,
    COALESCE(os.godpack_openings, 0) AS godpack_openings,
    COALESCE(os.avg_pc_gained, 0::numeric) AS avg_pc_gained,
    CASE
      WHEN COALESCE(uds.total_drop_cards, 0) = 0 THEN 0::numeric
      ELSE (COALESCE(os.duplicate_cards_total, 0) * 100.0) / uds.total_drop_cards
    END AS duplicate_rate,
    CASE
      WHEN COALESCE(uds.total_drop_cards, 0) = 0 THEN 0::numeric
      ELSE (COALESCE(uds.big_pull_cards, 0) * 100.0) / uds.total_drop_cards
    END AS big_pull_rate,
    COALESCE(cs.legends_owned, 0) AS legends_owned,
    COALESCE(cs.world_class_owned, 0) AS world_class_owned,
    COALESCE(cs.champion_owned, 0) AS champion_owned,
    bc.id AS best_card_id,
    bc.name AS best_card_name,
    bc.rarity AS best_card_rarity,
    bc.pc_value AS best_card_pc_value,
    sc.id AS signature_card_id,
    sc.name AS signature_card_name,
    sc.rarity AS signature_card_rarity,
    sc.pc_value AS signature_card_pc_value,
    sc."imageUrl" AS signature_card_image_url,
    fg.name AS favorite_game,
    bu.pc_balance,
    bu.total_pc_earned,
    COALESCE(os.total_pc_spent, 0)::bigint AS total_pc_spent,
    ga.avg_big_pull_rate AS global_avg_big_pull_rate,
    ga.avg_duplicate_rate AS global_avg_duplicate_rate,
    ga.avg_pc_spent AS global_avg_pc_spent,
    tdj.value AS top_drop_cards
  FROM base_user bu
  LEFT JOIN opening_stats os ON true
  LEFT JOIN user_drop_stats uds ON true
  LEFT JOIN card_stats cs ON true
  LEFT JOIN achievements_stats ach ON true
  LEFT JOIN best_card bc ON true
  LEFT JOIN signature_card sc ON true
  LEFT JOIN favorite_game fg ON true
  LEFT JOIN leaderboard_ranks lr ON true
  LEFT JOIN global_averages ga ON true
  LEFT JOIN top_drop_cards_json tdj ON true;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_overview(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_overview(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.update_current_user_profile_identity(text, text);
DROP FUNCTION IF EXISTS public.update_current_user_profile_identity(text, text, text);

CREATE OR REPLACE FUNCTION public.update_current_user_profile_identity(
  p_username text,
  p_title text DEFAULT NULL,
  p_signature_card_id text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  username text,
  title text,
  signature_card_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_username text := NULLIF(trim(p_username), '');
  v_title_raw text := NULLIF(trim(COALESCE(p_title, '')), '');
  v_title text;
  v_signature_card_id text := NULLIF(trim(COALESCE(p_signature_card_id, '')), '');
  v_is_allowed_title boolean := false;
  v_owns_signature_card boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_username IS NULL THEN
    RAISE EXCEPTION 'Username is required';
  END IF;

  IF length(v_username) < 3 OR length(v_username) > 24 THEN
    RAISE EXCEPTION 'Username length must be between 3 and 24 characters';
  END IF;

  IF v_username !~ '^[A-Za-z0-9 _-]+$' THEN
    RAISE EXCEPTION 'Username contains forbidden characters';
  END IF;

  IF v_title_raw IS NULL OR lower(v_title_raw) IN ('null', 'undefined', 'aucun titre') THEN
    v_title := NULL;
  ELSE
    v_title := v_title_raw;
  END IF;

  IF v_title IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.user_achievements ua
      JOIN public.achievement_definitions ad ON ad.id = ua.achievement_id
      WHERE ua.user_id = v_user_id
        AND ua.reward_granted_at IS NOT NULL
        AND ad.reward_title = v_title
    )
    INTO v_is_allowed_title;

    IF NOT v_is_allowed_title THEN
      RAISE EXCEPTION 'Title is not unlocked by this user';
    END IF;
  END IF;

  IF v_signature_card_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.user_cards uc
      WHERE uc.user_id = v_user_id
        AND uc.card_id = v_signature_card_id
    )
    INTO v_owns_signature_card;

    IF NOT v_owns_signature_card THEN
      RAISE EXCEPTION 'Signature card must belong to current user';
    END IF;
  END IF;

  UPDATE public.users u
  SET
    username = v_username,
    title = v_title,
    signature_card_id = v_signature_card_id
  WHERE u.id = v_user_id;

  RETURN QUERY
  SELECT
    u.id,
    u.username,
    u.title,
    u.signature_card_id
  FROM public.users u
  WHERE u.id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_current_user_profile_identity(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_current_user_profile_identity(text, text, text) TO authenticated;
