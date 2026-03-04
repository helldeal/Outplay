import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

/* ── helpers ── */

/** Strip "#1234" discriminator and return display-ready name. */
export function displayName(raw: string | null | undefined): string {
  if (!raw) return "Player";
  return raw.split("#")[0]?.trim() || "Player";
}

/* ── Leaderboard ── */

interface LeaderboardRpcRow {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_cards: number;
  weighted_score: number;
}

export interface LeaderboardRow {
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalCards: number;
  weightedScore: number;
}

export const leaderboardQueryKey = ["leaderboard"] as const;

export function useLeaderboardQuery(isEnabled: boolean) {
  return useQuery({
    queryKey: leaderboardQueryKey,
    enabled: isEnabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_leaderboard");
      if (error) {
        throw error;
      }

      return ((data ?? []) as LeaderboardRpcRow[]).map((row) => ({
        userId: row.user_id,
        username: displayName(row.username),
        avatarUrl: row.avatar_url,
        totalCards: row.total_cards,
        weightedScore: row.weighted_score,
      }));
    },
  });
}

/* ── Recent drops ── */

interface RecentDropRpcRow {
  opening_id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  booster_name: string;
  opened_at: string;
  best_card_id: string | null;
  best_card_name: string | null;
  best_card_rarity:
    | "LEGENDS"
    | "WORLD_CLASS"
    | "CHAMPION"
    | "CHALLENGER"
    | "ROOKIE"
    | null;
  best_card_image_url: string | null;
  best_card_pc_value: number | null;
}

export interface RecentDrop {
  openingId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  boosterName: string;
  openedAt: string;
  bestCardId: string | null;
  bestCardName: string | null;
  bestCardRarity:
    | "LEGENDS"
    | "WORLD_CLASS"
    | "CHAMPION"
    | "CHALLENGER"
    | "ROOKIE"
    | null;
  bestCardImageUrl: string | null;
  bestCardPcValue: number;
}

export const recentDropsQueryKey = ["recent-drops"] as const;

const DROPS_PAGE_SIZE = 5;

function mapDropRow(row: RecentDropRpcRow): RecentDrop {
  return {
    openingId: row.opening_id,
    userId: row.user_id,
    username: displayName(row.username),
    avatarUrl: row.avatar_url,
    boosterName: row.booster_name,
    openedAt: row.opened_at,
    bestCardId: row.best_card_id,
    bestCardName: row.best_card_name,
    bestCardRarity: row.best_card_rarity,
    bestCardImageUrl: row.best_card_image_url,
    bestCardPcValue: row.best_card_pc_value ?? 0,
  };
}

export function useRecentDropsQuery(isEnabled: boolean) {
  return useQuery({
    queryKey: [...recentDropsQueryKey],
    enabled: isEnabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_recent_drops", {
        p_limit: DROPS_PAGE_SIZE,
        p_offset: 0,
      });

      if (error) throw error;
      return ((data ?? []) as RecentDropRpcRow[]).map(mapDropRow);
    },
  });
}

export async function fetchMoreRecentDrops(
  offset: number,
): Promise<RecentDrop[]> {
  const { data, error } = await supabase.rpc("get_recent_drops", {
    p_limit: DROPS_PAGE_SIZE,
    p_offset: offset,
  });

  if (error) throw error;
  return ((data ?? []) as RecentDropRpcRow[]).map(mapDropRow);
}
