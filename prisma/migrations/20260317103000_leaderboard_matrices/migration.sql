-- Leaderboard matrices: top 10 players + current user (if outside top 10), with chance and profitability metrics.

DROP FUNCTION IF EXISTS public.get_leaderboard_matrix_players(uuid);

CREATE OR REPLACE FUNCTION public.get_leaderboard_matrix_players(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  leaderboard_position int,
  weighted_score int,
  duplicate_rate numeric,
  big_pull_rate numeric,
  avg_pc_gained numeric,
  avg_pc_spent numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      u.id AS user_id,
      COALESCE(NULLIF(trim(u.username), ''), concat('Player-', left(u.id::text, 6))) AS username,
      u.avatar_url,
      COALESCE(SUM(c.pc_value), 0)::int AS weighted_score,
      COUNT(uc.card_id)::int AS total_cards,
      COALESCE(ua.unlocked_count, 0)::int AS achievements_unlocked,
      ROW_NUMBER() OVER (
        ORDER BY
          COALESCE(SUM(c.pc_value), 0) DESC,
          COUNT(uc.card_id) DESC,
          COALESCE(ua.unlocked_count, 0) DESC,
          COALESCE(NULLIF(trim(u.username), ''), concat('Player-', left(u.id::text, 6))) ASC
      )::int AS leaderboard_position
    FROM public.users u
    LEFT JOIN public.user_cards uc ON uc.user_id = u.id
    LEFT JOIN public.cards c ON c.id = uc.card_id
    LEFT JOIN (
      SELECT
        user_id,
        COUNT(*)::int AS unlocked_count
      FROM public.user_achievements
      GROUP BY user_id
    ) ua ON ua.user_id = u.id
    GROUP BY u.id, u.username, u.avatar_url, ua.unlocked_count
  ),
  selected_users AS (
    SELECT r.user_id
    FROM ranked r
    WHERE r.leaderboard_position <= 10

    UNION

    SELECT r.user_id
    FROM ranked r
    WHERE r.user_id = p_user_id
      AND r.leaderboard_position > 10
  ),
  opening_base AS (
    SELECT
      su.user_id,
      bo.id AS opening_id,
      bo.type AS opening_type,
      bo.cards,
      bo.pc_gained,
      bo.duplicate_cards,
      b.price_pc
    FROM selected_users su
    LEFT JOIN public.booster_openings bo ON bo.user_id = su.user_id
    LEFT JOIN public.boosters b ON b.id = bo.booster_id
  ),
  opening_stats AS (
    SELECT
      ob.user_id,
      COUNT(ob.opening_id)::numeric AS total_openings,
      COALESCE(AVG(ob.pc_gained::numeric), 0::numeric) AS avg_pc_gained,
      CASE
        WHEN COUNT(ob.opening_id) = 0 THEN 0::numeric
        ELSE COALESCE(
          SUM(
            CASE
              WHEN ob.opening_type = 'SHOP'::public."OpeningType" THEN COALESCE(ob.price_pc, 0)
              ELSE 0
            END
          ),
          0
        )::numeric / COUNT(ob.opening_id)::numeric
      END AS avg_pc_spent,
      COALESCE(SUM(ob.duplicate_cards), 0)::numeric AS duplicate_cards_total
    FROM opening_base ob
    GROUP BY ob.user_id
  ),
  drop_stats AS (
    SELECT
      ob.user_id,
      COUNT(*)::numeric AS total_drop_cards,
      COUNT(*) FILTER (
        WHERE c.rarity IN ('LEGENDS'::public."Rarity", 'WORLD_CLASS'::public."Rarity")
      )::numeric AS big_pull_cards
    FROM opening_base ob
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE
        WHEN ob.cards IS NULL THEN '[]'::jsonb
        WHEN jsonb_typeof(ob.cards::jsonb) = 'array' THEN ob.cards::jsonb
        ELSE '[]'::jsonb
      END
    ) AS opened(card_id)
    JOIN public.cards c ON c.id = opened.card_id
    GROUP BY ob.user_id
  )
  SELECT
    r.user_id,
    r.username,
    r.avatar_url,
    r.leaderboard_position,
    r.weighted_score,
    CASE
      WHEN COALESCE(ds.total_drop_cards, 0) = 0 THEN 0::numeric
      ELSE (COALESCE(os.duplicate_cards_total, 0) * 100.0) / ds.total_drop_cards
    END AS duplicate_rate,
    CASE
      WHEN COALESCE(ds.total_drop_cards, 0) = 0 THEN 0::numeric
      ELSE (COALESCE(ds.big_pull_cards, 0) * 100.0) / ds.total_drop_cards
    END AS big_pull_rate,
    COALESCE(os.avg_pc_gained, 0::numeric) AS avg_pc_gained,
    COALESCE(os.avg_pc_spent, 0::numeric) AS avg_pc_spent
  FROM ranked r
  JOIN selected_users su ON su.user_id = r.user_id
  LEFT JOIN opening_stats os ON os.user_id = r.user_id
  LEFT JOIN drop_stats ds ON ds.user_id = r.user_id
  ORDER BY r.leaderboard_position ASC;
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard_matrix_players(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_matrix_players(uuid) TO authenticated;
