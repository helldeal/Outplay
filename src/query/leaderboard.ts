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
  title?: string | null;
  avatar_url: string | null;
  signature_card_name?: string | null;
  signature_card_rarity?: Rarity | null;
  signature_card_image_url?: string | null;
  total_cards: number;
  weighted_score: number;
  card_score: number;
  achievement_score: number;
  achievements_unlocked: number;
}

export interface LeaderboardRow {
  userId: string;
  username: string;
  title: string | null;
  avatarUrl: string | null;
  signatureCardName: string | null;
  signatureCardRarity: Rarity | null;
  signatureCardImageUrl: string | null;
  totalCards: number;
  weightedScore: number;
  cardScore: number;
  achievementScore: number;
  achievementsUnlocked: number;
}

export const leaderboardQueryKey = ["leaderboard"] as const;

interface PublicProfileIdentityRpcRow {
  user_id: string;
  title: string | null;
  signature_card_name: string | null;
  signature_card_rarity: Rarity | null;
  signature_card_image_url: string | null;
}

async function fetchPublicIdentityByUserIds(userIds: string[]): Promise<
  Map<
    string,
    {
      title: string | null;
      signatureCardName: string | null;
      signatureCardRarity: Rarity | null;
      signatureCardImageUrl: string | null;
    }
  >
> {
  const byUserId = new Map<
    string,
    {
      title: string | null;
      signatureCardName: string | null;
      signatureCardRarity: Rarity | null;
      signatureCardImageUrl: string | null;
    }
  >();

  const uniqueUserIds = Array.from(new Set(userIds)).filter(Boolean);
  if (uniqueUserIds.length === 0) {
    return byUserId;
  }

  const results = await Promise.allSettled(
    uniqueUserIds.map(async (userId) => {
      const { data, error } = await supabase.rpc(
        "get_public_profile_overview",
        {
          p_user_id: userId,
        },
      );

      if (error) {
        return null;
      }

      const row = (data as PublicProfileIdentityRpcRow[] | null)?.[0] ?? null;
      if (!row || row.user_id !== userId) {
        return null;
      }

      return {
        userId,
        title: row.title ?? null,
        signatureCardName: row.signature_card_name ?? null,
        signatureCardRarity: row.signature_card_rarity ?? null,
        signatureCardImageUrl: row.signature_card_image_url
          ? resolveAssetUrl(row.signature_card_image_url)
          : null,
      };
    }),
  );

  for (const result of results) {
    if (result.status !== "fulfilled" || !result.value) {
      continue;
    }

    byUserId.set(result.value.userId, {
      title: result.value.title,
      signatureCardName: result.value.signatureCardName,
      signatureCardRarity: result.value.signatureCardRarity,
      signatureCardImageUrl: result.value.signatureCardImageUrl,
    });
  }

  return byUserId;
}

export function useLeaderboardQuery(isEnabled: boolean) {
  return useQuery({
    queryKey: leaderboardQueryKey,
    enabled: isEnabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_leaderboard");
      if (error) {
        throw error;
      }

      const rows = ((data ?? []) as LeaderboardRpcRow[]).map((row) => ({
        userId: row.user_id,
        username: displayName(row.username),
        title: row.title ?? null,
        avatarUrl: row.avatar_url,
        signatureCardName: row.signature_card_name ?? null,
        signatureCardRarity: row.signature_card_rarity ?? null,
        signatureCardImageUrl: row.signature_card_image_url
          ? resolveAssetUrl(row.signature_card_image_url)
          : null,
        totalCards: row.total_cards,
        weightedScore: row.weighted_score,
        cardScore: row.card_score,
        achievementScore: row.achievement_score,
        achievementsUnlocked: row.achievements_unlocked,
      }));

      const missingIdentityUserIds = rows
        .filter(
          (row) =>
            !row.title ||
            (!row.signatureCardName && !row.signatureCardImageUrl),
        )
        .map((row) => row.userId);

      if (missingIdentityUserIds.length === 0) {
        return rows;
      }

      const fallbackIdentity = await fetchPublicIdentityByUserIds(
        missingIdentityUserIds,
      );

      return rows.map((row) => {
        const identity = fallbackIdentity.get(row.userId);
        return {
          ...row,
          title: row.title ?? identity?.title ?? null,
          signatureCardName:
            row.signatureCardName ?? identity?.signatureCardName ?? null,
          signatureCardRarity:
            row.signatureCardRarity ?? identity?.signatureCardRarity ?? null,
          signatureCardImageUrl:
            row.signatureCardImageUrl ??
            identity?.signatureCardImageUrl ??
            null,
        };
      });
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
  title: string | null;
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
    title: null,
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

      const rows = ((data ?? []) as RecentDropRpcRow[]).map(mapDropRow);
      const identityByUserId = await fetchPublicIdentityByUserIds(
        rows.map((row) => row.userId),
      );

      return rows.map((row) => ({
        ...row,
        title: identityByUserId.get(row.userId)?.title ?? null,
      }));
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

  const rows = ((data ?? []) as RecentDropRpcRow[]).map(mapDropRow);
  const identityByUserId = await fetchPublicIdentityByUserIds(
    rows.map((row) => row.userId),
  );

  return rows.map((row) => ({
    ...row,
    title: identityByUserId.get(row.userId)?.title ?? null,
  }));
}

/* ── Leaderboard global stats ── */

interface LeaderboardGlobalStatsRpcRow {
  total_pc_spent: number | string | null;
  total_cards_opened: number | string | null;
  total_openings: number | string | null;
  booster_distribution: unknown;
  top_drop_cards: unknown;
  top_best_score_cards: unknown;
  top_worst_score_cards: unknown;
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

interface TopScoreCardRpcItem {
  card_id: string;
  card_name: string;
  card_rarity: Rarity | null;
  card_image_url: string | null;
  score_value: number | string;
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

export interface TopScoreCard {
  cardId: string;
  cardName: string;
  cardRarity: Rarity | null;
  cardImageUrl: string | null;
  scoreValue: number;
}

export interface LeaderboardGlobalStats {
  totalPcSpent: number;
  totalCardsOpened: number;
  totalOpenings: number;
  boosterDistribution: BoosterDistributionItem[];
  topDropCards: TopDropCard[];
  topBestScoreCards: TopScoreCard[];
  topWorstScoreCards: TopScoreCard[];
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

function toTopScoreCardsArray(value: unknown): TopScoreCardRpcItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is TopScoreCardRpcItem =>
      typeof item === "object" &&
      item !== null &&
      "card_id" in item &&
      "card_name" in item &&
      "score_value" in item,
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
          topBestScoreCards: [],
          topWorstScoreCards: [],
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

      const topBestScoreCards = toTopScoreCardsArray(
        row.top_best_score_cards,
      ).map((item) => ({
        cardId: item.card_id,
        cardName: item.card_name,
        cardRarity: item.card_rarity,
        cardImageUrl: resolveAssetUrl(item.card_image_url),
        scoreValue: toNumber(item.score_value),
      }));

      const topWorstScoreCards = toTopScoreCardsArray(
        row.top_worst_score_cards,
      ).map((item) => ({
        cardId: item.card_id,
        cardName: item.card_name,
        cardRarity: item.card_rarity,
        cardImageUrl: resolveAssetUrl(item.card_image_url),
        scoreValue: toNumber(item.score_value),
      }));

      return {
        totalPcSpent: toNumber(row.total_pc_spent),
        totalCardsOpened: toNumber(row.total_cards_opened),
        totalOpenings,
        boosterDistribution,
        topDropCards,
        topBestScoreCards,
        topWorstScoreCards,
      };
    },
  });
}

/* ── Leaderboard matrix players ── */

interface LeaderboardMatrixPlayerRpcRow {
  user_id: string;
  username: string;
  avatar_url: string | null;
  leaderboard_position: number;
  weighted_score: number;
  card_score: number;
  total_card_value: number;
  duplicate_rate: number | string | null;
  big_pull_rate: number | string | null;
  avg_pc_gained: number | string | null;
  avg_pc_spent: number | string | null;
}

export interface LeaderboardMatrixPlayer {
  userId: string;
  username: string;
  title: string | null;
  avatarUrl: string | null;
  leaderboardPosition: number;
  weightedScore: number;
  cardScore: number;
  totalCardValue: number;
  duplicateRate: number;
  bigPullRate: number;
  avgPcGained: number;
  avgPcSpent: number;
}

export const leaderboardMatrixPlayersQueryKey = (userId?: string) =>
  ["leaderboard", "matrix-players", userId] as const;

export function useLeaderboardMatrixPlayersQuery(
  userId: string | undefined,
  isEnabled: boolean,
) {
  return useQuery({
    queryKey: leaderboardMatrixPlayersQueryKey(userId),
    enabled: Boolean(userId) && isEnabled,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<LeaderboardMatrixPlayer[]> => {
      const { data, error } = await supabase.rpc(
        "get_leaderboard_matrix_players",
        {
          p_user_id: userId!,
        },
      );

      if (error) {
        throw error;
      }

      const rows = ((data ?? []) as LeaderboardMatrixPlayerRpcRow[]).map(
        (row) => ({
          userId: row.user_id,
          username: displayName(row.username),
          title: null,
          avatarUrl: row.avatar_url,
          leaderboardPosition: row.leaderboard_position,
          weightedScore: row.weighted_score,
          cardScore: row.card_score,
          totalCardValue: row.total_card_value,
          duplicateRate: toNumber(row.duplicate_rate),
          bigPullRate: toNumber(row.big_pull_rate),
          avgPcGained: toNumber(row.avg_pc_gained),
          avgPcSpent: toNumber(row.avg_pc_spent),
        }),
      );

      const fallbackIdentity = await fetchPublicIdentityByUserIds(
        rows.map((row) => row.userId),
      );

      return rows.map((row) => {
        const identity = fallbackIdentity.get(row.userId);
        return {
          ...row,
          title: identity?.title ?? null,
        };
      });
    },
  });
}
