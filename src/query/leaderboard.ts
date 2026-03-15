import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Rarity } from "../types";
import { resolveAssetUrl } from "../utils/asset-url";

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
  achievements_unlocked: number;
}

export interface LeaderboardRow {
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalCards: number;
  weightedScore: number;
  achievementsUnlocked: number;
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
        achievementsUnlocked: row.achievements_unlocked,
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
    bestCardImageUrl: resolveAssetUrl(row.best_card_image_url),
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

/* ── Leaderboard global stats ── */

interface LeaderboardGlobalStatsRpcRow {
  total_pc_spent: number | string | null;
  total_cards_opened: number | string | null;
  total_openings: number | string | null;
  booster_distribution: unknown;
  top_drop_cards: unknown;
}

interface BoosterDistributionRpcItem {
  booster_type: string;
  openings_count: number | string;
}

interface TopDropCardRpcItem {
  card_id: string;
  card_name: string;
  card_rarity: Rarity | null;
  card_image_url: string | null;
  drops_count: number | string;
}

export interface BoosterDistributionItem {
  boosterType: string;
  openingsCount: number;
  share: number;
}

export interface TopDropCard {
  cardId: string;
  cardName: string;
  cardRarity: Rarity | null;
  cardImageUrl: string | null;
  dropsCount: number;
}

export interface LeaderboardGlobalStats {
  totalPcSpent: number;
  totalCardsOpened: number;
  totalOpenings: number;
  boosterDistribution: BoosterDistributionItem[];
  topDropCards: TopDropCard[];
}

export const leaderboardGlobalStatsQueryKey = [
  "leaderboard",
  "global-stats",
] as const;

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toBoosterDistributionArray(
  value: unknown,
): BoosterDistributionRpcItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is BoosterDistributionRpcItem =>
      typeof item === "object" &&
      item !== null &&
      "booster_type" in item &&
      "openings_count" in item,
  );
}

function toTopDropCardsArray(value: unknown): TopDropCardRpcItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is TopDropCardRpcItem =>
      typeof item === "object" &&
      item !== null &&
      "card_id" in item &&
      "card_name" in item &&
      "drops_count" in item,
  );
}

export function useLeaderboardGlobalStatsQuery(isEnabled: boolean) {
  return useQuery({
    queryKey: leaderboardGlobalStatsQueryKey,
    enabled: isEnabled,
    queryFn: async (): Promise<LeaderboardGlobalStats> => {
      const { data, error } = await supabase.rpc(
        "get_leaderboard_global_stats",
      );
      if (error) {
        throw error;
      }

      const row = ((data ?? []) as LeaderboardGlobalStatsRpcRow[])[0];

      if (!row) {
        return {
          totalPcSpent: 0,
          totalCardsOpened: 0,
          totalOpenings: 0,
          boosterDistribution: [],
          topDropCards: [],
        };
      }

      const totalOpenings = toNumber(row.total_openings);

      const boosterDistribution = toBoosterDistributionArray(
        row.booster_distribution,
      ).map((item) => {
        const openingsCount = toNumber(item.openings_count);
        const share =
          totalOpenings > 0
            ? Number(((openingsCount * 100) / totalOpenings).toFixed(2))
            : 0;

        return {
          boosterType: item.booster_type,
          openingsCount,
          share,
        };
      });

      const topDropCards = toTopDropCardsArray(row.top_drop_cards).map(
        (item) => ({
          cardId: item.card_id,
          cardName: item.card_name,
          cardRarity: item.card_rarity,
          cardImageUrl: resolveAssetUrl(item.card_image_url),
          dropsCount: toNumber(item.drops_count),
        }),
      );

      return {
        totalPcSpent: toNumber(row.total_pc_spent),
        totalCardsOpened: toNumber(row.total_cards_opened),
        totalOpenings,
        boosterDistribution,
        topDropCards,
      };
    },
  });
}
