import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { displayName } from "./leaderboard";

interface PublicCardStatsRpcRow {
  card_id: string;
  total_opened_cards: number | string;
  total_card_drops: number | string;
  drop_rate_pct: number | string;
  owners_count: number | string;
  first_holder_user_id: string | null;
  first_holder_username: string | null;
  first_holder_avatar_url: string | null;
  first_holder_obtained_at: string | null;
  top_holder_user_id: string | null;
  top_holder_username: string | null;
  top_holder_avatar_url: string | null;
  top_holder_drops: number | string;
}

export interface PublicCardStats {
  cardId: string;
  totalOpenedCards: number;
  totalCardDrops: number;
  dropRatePct: number;
  ownersCount: number;
  oneIn: number | null;
  firstHolder: {
    userId: string;
    username: string;
    avatarUrl: string | null;
    obtainedAt: string | null;
  } | null;
  topHolder: {
    userId: string;
    username: string;
    avatarUrl: string | null;
    drops: number;
  } | null;
}

function parseNumber(input: number | string | null | undefined): number {
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : 0;
  }

  if (typeof input === "string") {
    const parsed = Number(input);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function mapRow(row: PublicCardStatsRpcRow): PublicCardStats {
  const totalOpenedCards = parseNumber(row.total_opened_cards);
  const totalCardDrops = parseNumber(row.total_card_drops);
  const dropRatePct = parseNumber(row.drop_rate_pct);
  const ownersCount = parseNumber(row.owners_count);
  const oneIn = totalCardDrops > 0 ? totalOpenedCards / totalCardDrops : null;

  return {
    cardId: row.card_id,
    totalOpenedCards,
    totalCardDrops,
    dropRatePct,
    ownersCount,
    oneIn,
    firstHolder: row.first_holder_user_id
      ? {
          userId: row.first_holder_user_id,
          username: displayName(row.first_holder_username),
          avatarUrl: row.first_holder_avatar_url,
          obtainedAt: row.first_holder_obtained_at,
        }
      : null,
    topHolder: row.top_holder_user_id
      ? {
          userId: row.top_holder_user_id,
          username: displayName(row.top_holder_username),
          avatarUrl: row.top_holder_avatar_url,
          drops: parseNumber(row.top_holder_drops),
        }
      : null,
  };
}

export const publicCardStatsQueryKey = (cardId?: string) =>
  ["public-card-stats", cardId] as const;

export function usePublicCardStatsQuery(cardId?: string, enabled = true) {
  return useQuery({
    queryKey: publicCardStatsQueryKey(cardId),
    enabled: Boolean(cardId) && enabled,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_card_stats", {
        p_card_id: cardId!,
      });

      if (error) {
        throw error;
      }

      const row = ((data ?? []) as PublicCardStatsRpcRow[])[0];

      if (!row) {
        throw new Error("Stats de carte introuvables");
      }

      return mapRow(row);
    },
  });
}
