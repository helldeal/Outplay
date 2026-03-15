import { useQuery } from "@tanstack/react-query";
import type { UserCardRow } from "../types";
import { supabase } from "../lib/supabase";
import { resolveAssetUrl } from "../utils/asset-url";
import { displayName } from "./leaderboard";

interface PublicProfileOverviewRpcRow {
  user_id: string;
  username: string;
  avatar_url: string | null;
  title: string | null;
  leaderboard_position: number | null;
  total_cards: number;
  weighted_score: number;
  achievements_unlocked: number;
  total_openings: number;
  normal_openings: number;
  luck_openings: number;
  premium_openings: number;
  godpack_openings: number;
  avg_pc_gained: number | string;
  duplicate_rate: number | string;
  big_pull_rate: number | string;
  legends_owned: number;
  world_class_owned: number;
  champion_owned: number;
  best_card_id: string | null;
  best_card_name: string | null;
  best_card_rarity:
    | "LEGENDS"
    | "WORLD_CLASS"
    | "CHAMPION"
    | "CHALLENGER"
    | "ROOKIE"
    | null;
  best_card_pc_value: number | null;
  signature_card_id: string | null;
  signature_card_name: string | null;
  signature_card_rarity:
    | "LEGENDS"
    | "WORLD_CLASS"
    | "CHAMPION"
    | "CHALLENGER"
    | "ROOKIE"
    | null;
  signature_card_pc_value: number | null;
  signature_card_image_url: string | null;
  favorite_game: string | null;
  pc_balance: number;
  total_pc_earned: number | string;
  total_pc_spent: number | string;
  global_avg_big_pull_rate: number | string;
  global_avg_duplicate_rate: number | string;
  global_avg_pc_spent: number | string;
  top_drop_cards: unknown;
}

export interface PublicProfileOverview {
  userId: string;
  username: string;
  avatarUrl: string | null;
  title: string | null;
  leaderboardPosition: number | null;
  totalCards: number;
  weightedScore: number;
  achievementsUnlocked: number;
  totalOpenings: number;
  normalOpenings: number;
  luckOpenings: number;
  premiumOpenings: number;
  godpackOpenings: number;
  avgPcGained: number;
  duplicateRate: number;
  bigPullRate: number;
  legendsOwned: number;
  worldClassOwned: number;
  championOwned: number;
  bestCardId: string | null;
  bestCardName: string | null;
  bestCardRarity:
    | "LEGENDS"
    | "WORLD_CLASS"
    | "CHAMPION"
    | "CHALLENGER"
    | "ROOKIE"
    | null;
  bestCardPcValue: number;
  signatureCardId: string | null;
  signatureCardName: string | null;
  signatureCardRarity:
    | "LEGENDS"
    | "WORLD_CLASS"
    | "CHAMPION"
    | "CHALLENGER"
    | "ROOKIE"
    | null;
  signatureCardPcValue: number;
  signatureCardImageUrl: string | null;
  favoriteGame: string | null;
  pcBalance: number;
  totalPcEarned: number;
  totalPcSpent: number;
  globalAvgBigPullRate: number;
  globalAvgDuplicateRate: number;
  globalAvgPcSpent: number;
  topDropCards: Array<{
    cardId: string;
    cardName: string;
    cardRarity:
      | "LEGENDS"
      | "WORLD_CLASS"
      | "CHAMPION"
      | "CHALLENGER"
      | "ROOKIE"
      | null;
    cardImageUrl: string | null;
    dropsCount: number;
  }>;
}

interface PublicProfileCollectionRpcRow {
  card_id: string;
  obtained_at: string;
  card_name: string;
  card_rarity: "LEGENDS" | "WORLD_CLASS" | "CHAMPION" | "CHALLENGER" | "ROOKIE";
  card_image_url: string;
  card_pc_value: number;
  game_name: string;
  game_logo_url: string | null;
  team_name: string | null;
  team_logo_url: string | null;
  nationality_code: string;
  nationality_flag_url: string | null;
  role_name: string | null;
  role_icon_url: string | null;
}

export const publicProfileOverviewQueryKey = (userId?: string) =>
  ["public-profile-overview", userId] as const;

export const publicProfileCollectionQueryKey = (userId?: string) =>
  ["public-profile-collection", userId] as const;

export const publicProfileRecentOpeningsQueryKey = (userId?: string) =>
  ["public-profile-recent-openings", userId] as const;

export const publicProfileRecentAchievementsQueryKey = (userId?: string) =>
  ["public-profile-recent-achievements", userId] as const;

export interface PublicProfileRecentOpening {
  openingId: string;
  openedAt: string;
  openingType: "SHOP" | "DAILY" | "STREAK" | "ACHIEVEMENT";
  boosterName: string | null;
  boosterType: "NORMAL" | "LUCK" | "PREMIUM" | "GODPACK" | null;
  seriesName: string | null;
  pcGained: number;
  duplicateCards: number;
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

export interface PublicProfileRecentAchievement {
  unlockedAt: string;
  code: string;
  name: string;
  category: string;
  rewardTitle: string | null;
  rewardPc: number;
  rewardBoosterType: "NORMAL" | "LUCK" | "PREMIUM" | "GODPACK" | null;
}

interface PublicProfileRecentOpeningRpcRow {
  opening_id: string;
  opened_at: string;
  opening_type: "SHOP" | "DAILY" | "STREAK" | "ACHIEVEMENT";
  booster_name: string | null;
  booster_type: "NORMAL" | "LUCK" | "PREMIUM" | "GODPACK" | null;
  series_name: string | null;
  pc_gained: number;
  duplicate_cards: number;
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

interface PublicProfileRecentAchievementRpcRow {
  unlocked_at: string;
  code: string;
  name: string;
  category: string;
  reward_title: string | null;
  reward_pc: number;
  reward_booster_type: "NORMAL" | "LUCK" | "PREMIUM" | "GODPACK" | null;
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

function mapOverview(row: PublicProfileOverviewRpcRow): PublicProfileOverview {
  const topDropCardsRaw = Array.isArray(row.top_drop_cards)
    ? (row.top_drop_cards as Array<Record<string, unknown>>)
    : [];

  const topDropCards = topDropCardsRaw
    .filter(
      (item) =>
        typeof item.card_id === "string" &&
        typeof item.card_name === "string" &&
        (typeof item.drops_count === "number" ||
          typeof item.drops_count === "string"),
    )
    .map((item) => ({
      cardId: item.card_id as string,
      cardName: item.card_name as string,
      cardRarity:
        (item.card_rarity as
          | "LEGENDS"
          | "WORLD_CLASS"
          | "CHAMPION"
          | "CHALLENGER"
          | "ROOKIE"
          | null
          | undefined) ?? null,
      cardImageUrl: item.card_image_url
        ? resolveAssetUrl(item.card_image_url as string)
        : null,
      dropsCount: parseNumber(
        item.drops_count as number | string | null | undefined,
      ),
    }));

  return {
    userId: row.user_id,
    username: displayName(row.username),
    avatarUrl: row.avatar_url,
    title: row.title,
    leaderboardPosition: row.leaderboard_position,
    totalCards: row.total_cards,
    weightedScore: row.weighted_score,
    achievementsUnlocked: row.achievements_unlocked,
    totalOpenings: row.total_openings,
    normalOpenings: row.normal_openings,
    luckOpenings: row.luck_openings,
    premiumOpenings: row.premium_openings,
    godpackOpenings: row.godpack_openings,
    avgPcGained: parseNumber(row.avg_pc_gained),
    duplicateRate: parseNumber(row.duplicate_rate),
    bigPullRate: parseNumber(row.big_pull_rate),
    legendsOwned: row.legends_owned,
    worldClassOwned: row.world_class_owned,
    championOwned: row.champion_owned,
    bestCardId: row.best_card_id,
    bestCardName: row.best_card_name,
    bestCardRarity: row.best_card_rarity,
    bestCardPcValue: row.best_card_pc_value ?? 0,
    signatureCardId: row.signature_card_id,
    signatureCardName: row.signature_card_name,
    signatureCardRarity: row.signature_card_rarity,
    signatureCardPcValue: row.signature_card_pc_value ?? 0,
    signatureCardImageUrl: row.signature_card_image_url
      ? resolveAssetUrl(row.signature_card_image_url)
      : null,
    favoriteGame: row.favorite_game,
    pcBalance: row.pc_balance,
    totalPcEarned: parseNumber(row.total_pc_earned),
    totalPcSpent: parseNumber(row.total_pc_spent),
    globalAvgBigPullRate: parseNumber(row.global_avg_big_pull_rate),
    globalAvgDuplicateRate: parseNumber(row.global_avg_duplicate_rate),
    globalAvgPcSpent: parseNumber(row.global_avg_pc_spent),
    topDropCards,
  };
}

function mapCollectionRow(row: PublicProfileCollectionRpcRow): UserCardRow {
  return {
    card_id: row.card_id,
    obtained_at: row.obtained_at,
    card: {
      id: row.card_id,
      name: row.card_name,
      rarity: row.card_rarity,
      imageUrl: resolveAssetUrl(row.card_image_url),
      pc_value: row.card_pc_value,
      game: {
        name: row.game_name,
        logoUrl: row.game_logo_url
          ? resolveAssetUrl(row.game_logo_url)
          : undefined,
      },
      team:
        row.team_name || row.team_logo_url
          ? {
              name: row.team_name ?? "Team",
              logoUrl: row.team_logo_url
                ? resolveAssetUrl(row.team_logo_url)
                : undefined,
            }
          : null,
      nationality: {
        name: row.nationality_code,
        code: row.nationality_code,
        flagUrl: row.nationality_flag_url
          ? resolveAssetUrl(row.nationality_flag_url)
          : undefined,
      },
      role:
        row.role_name || row.role_icon_url
          ? {
              name: row.role_name ?? "Role",
              iconUrl: row.role_icon_url
                ? resolveAssetUrl(row.role_icon_url)
                : undefined,
            }
          : null,
    },
  };
}

export function usePublicProfileOverviewQuery(userId?: string) {
  return useQuery({
    queryKey: publicProfileOverviewQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_public_profile_overview",
        {
          p_user_id: userId!,
        },
      );

      if (error) {
        throw error;
      }

      const first = ((data ?? []) as PublicProfileOverviewRpcRow[])[0];

      if (!first) {
        throw new Error("Profil introuvable");
      }

      return mapOverview(first);
    },
  });
}

export function usePublicProfileCollectionQuery(userId?: string) {
  return useQuery({
    queryKey: publicProfileCollectionQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_public_profile_collection",
        {
          p_user_id: userId!,
        },
      );

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as PublicProfileCollectionRpcRow[];
      return rows.map(mapCollectionRow);
    },
  });
}

export function usePublicProfileRecentOpeningsQuery(userId?: string) {
  return useQuery({
    queryKey: publicProfileRecentOpeningsQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_public_profile_recent_openings",
        {
          p_user_id: userId!,
          p_limit: 8,
        },
      );

      if (error) {
        throw error;
      }

      return ((data ?? []) as PublicProfileRecentOpeningRpcRow[]).map(
        (row) => ({
          openingId: row.opening_id,
          openedAt: row.opened_at,
          openingType: row.opening_type,
          boosterName: row.booster_name,
          boosterType: row.booster_type,
          seriesName: row.series_name,
          pcGained: row.pc_gained,
          duplicateCards: row.duplicate_cards,
          bestCardId: row.best_card_id,
          bestCardName: row.best_card_name,
          bestCardRarity: row.best_card_rarity,
          bestCardImageUrl: row.best_card_image_url
            ? resolveAssetUrl(row.best_card_image_url)
            : null,
          bestCardPcValue: row.best_card_pc_value ?? 0,
        }),
      ) as PublicProfileRecentOpening[];
    },
  });
}

export function usePublicProfileRecentAchievementsQuery(userId?: string) {
  return useQuery({
    queryKey: publicProfileRecentAchievementsQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_public_profile_recent_achievements",
        {
          p_user_id: userId!,
          p_limit: 8,
        },
      );

      if (error) {
        throw error;
      }

      return ((data ?? []) as PublicProfileRecentAchievementRpcRow[]).map(
        (row) => ({
          unlockedAt: row.unlocked_at,
          code: row.code,
          name: row.name,
          category: row.category,
          rewardTitle: row.reward_title,
          rewardPc: row.reward_pc,
          rewardBoosterType: row.reward_booster_type,
        }),
      ) as PublicProfileRecentAchievement[];
    },
  });
}

function normalizeTitleInput(title: string | null): string | null {
  if (title === null) {
    return null;
  }

  const trimmed = title.trim();
  if (!trimmed) {
    return null;
  }

  const lowered = trimmed.toLowerCase();
  if (
    lowered === "null" ||
    lowered === "undefined" ||
    lowered === "aucun titre"
  ) {
    return null;
  }

  return trimmed;
}

export async function updateCurrentUserProfileIdentity(params: {
  username: string;
  title: string | null;
  signatureCardId: string | null;
}) {
  const normalizedTitle = normalizeTitleInput(params.title);

  const { data, error } = await supabase.rpc(
    "update_current_user_profile_identity",
    {
      p_username: params.username,
      p_title: normalizedTitle,
      p_signature_card_id: params.signatureCardId,
    },
  );

  if (error) {
    throw error;
  }

  return (
    (
      (data ?? []) as Array<{
        id: string;
        username: string;
        title: string | null;
        signature_card_id: string | null;
      }>
    )[0] ?? null
  );
}
