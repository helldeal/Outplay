import { useQuery } from "@tanstack/react-query";
import { normalizeCard } from "../utils/normalize";
import { resolveAssetUrl } from "../utils/asset-url";
import { supabase } from "../lib/supabase";
import type { CardWithRelations, Series } from "../types";

export interface OpenBoosterResponse {
  openingId: string;
  boosterId: string;
  seriesId: string;
  cards: string[];
  pcGained: number;
  chargedPc: number;
  type: "SHOP" | "DAILY" | "STREAK" | "ACHIEVEMENT";
}

export interface LoginStreakStatus {
  current_day: number;
  last_claim_date: string | null;
  can_claim_today: boolean;
  next_day: number;
  next_reward_type: "PC" | "BOOSTER";
  next_reward_pc: number;
  next_reward_booster_type: "NORMAL" | "LUCK" | "PREMIUM" | null;
}

interface LoginStreakClaimResponse {
  day: number;
  rewardType: "PC" | "BOOSTER";
  pcGained: number;
  boosterType: "NORMAL" | "LUCK" | "PREMIUM" | null;
  opening: OpenBoosterResponse | null;
}

interface DailyBoosterTarget {
  id: string;
  series: {
    code: string;
    slug: string;
    name: string;
  };
}

export interface ShopBoosterWithSeries {
  id: string;
  name: string;
  type: "NORMAL" | "LUCK" | "PREMIUM" | "GODPACK";
  price_pc: number;
  image_url: string | null;
  drop_rates: Record<string, number>;
  is_daily_only: boolean;
  series: Pick<Series, "id" | "name" | "slug" | "code" | "coverImage">;
}

export async function openBoosterRpc(
  boosterId: string,
  userId: string,
  targetSeriesId?: string,
) {
  const { data, error } = await supabase.rpc("open_booster", {
    p_booster_id: boosterId,
    p_user_id: userId,
    p_target_series_id: targetSeriesId ?? null,
  });

  if (error) {
    throw error;
  }

  return data as OpenBoosterResponse;
}

export async function openDailyBoosterRpc(
  seriesCode: string,
  userId: string,
  targetSeriesId?: string,
) {
  const { data, error } = await supabase.rpc("open_daily_booster", {
    p_series_code: seriesCode,
    p_user_id: userId,
    p_target_series_id: targetSeriesId ?? null,
  });

  if (error) {
    throw error;
  }

  return data as OpenBoosterResponse;
}

export async function claimLoginStreakRewardRpc(
  userId: string,
  targetSeriesId?: string,
) {
  const { data, error } = await supabase.rpc("claim_login_streak_reward", {
    p_user_id: userId,
    p_target_series_id: targetSeriesId ?? null,
  });

  if (error) {
    throw error;
  }

  return data as LoginStreakClaimResponse;
}

export async function fetchCardsByIds(cardIds: string[]) {
  const { data: cardRows, error } = await supabase
    .from("cards")
    .select(
      `
        id,
        name,
        rarity,
        imageUrl,
        pc_value,
        game:games(name, logoUrl),
        team:teams(name, logoUrl),
        nationality:nationalities(code, flagUrl),
        role:roles(name, iconUrl)
      `,
    )
    .in("id", cardIds);

  if (error) {
    throw error;
  }

  const normalizedCards = (cardRows ?? []).map((row) =>
    normalizeCard(row as never),
  );
  const cardById = new Map(
    normalizedCards.map((card: CardWithRelations) => [card.id, card]),
  );

  return cardIds
    .map((id) => cardById.get(id))
    .filter((card): card is CardWithRelations => Boolean(card));
}

async function fetchDailyBoosterTarget() {
  const { data, error } = await supabase
    .from("boosters")
    .select("id, series:series_id(name, code, slug)")
    .eq("is_daily_only", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const seriesRelation = Array.isArray(data.series)
    ? data.series[0]
    : data.series;

  if (!seriesRelation?.code || !seriesRelation?.slug || !seriesRelation?.name) {
    return null;
  }

  return {
    id: data.id,
    series: {
      code: seriesRelation.code,
      slug: seriesRelation.slug,
      name: seriesRelation.name,
    },
  } as DailyBoosterTarget;
}

async function fetchShopBoosters() {
  const { data, error } = await supabase
    .from("boosters")
    .select(
      "id, name, type, price_pc, image_url, drop_rates, is_daily_only, series:series_id(id, name, slug, code, coverImage)",
    )
    .eq("is_daily_only", false)
    .order("price_pc", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => {
      const relation = Array.isArray(row.series) ? row.series[0] : row.series;

      if (!relation) {
        return null;
      }

      return {
        id: row.id,
        name: row.name,
        type: row.type,
        price_pc: row.price_pc,
        image_url: resolveAssetUrl(row.image_url),
        drop_rates:
          row.drop_rates && typeof row.drop_rates === "object"
            ? (row.drop_rates as Record<string, number>)
            : {},
        is_daily_only: row.is_daily_only,
        series: {
          id: relation.id,
          name: relation.name,
          slug: relation.slug,
          code: relation.code,
          coverImage: resolveAssetUrl(relation.coverImage),
        },
      } as ShopBoosterWithSeries;
    })
    .filter((booster): booster is ShopBoosterWithSeries => Boolean(booster));
}

async function fetchLoginStreakStatus(userId: string) {
  const { data, error } = await supabase.rpc("get_login_streak_status", {
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return null;
  }

  return {
    current_day: Number(row.current_day ?? 0),
    last_claim_date:
      typeof row.last_claim_date === "string" ? row.last_claim_date : null,
    can_claim_today: Boolean(row.can_claim_today),
    next_day: Number(row.next_day ?? 1),
    next_reward_type: row.next_reward_type === "BOOSTER" ? "BOOSTER" : "PC",
    next_reward_pc: Number(row.next_reward_pc ?? 0),
    next_reward_booster_type:
      row.next_reward_booster_type === "NORMAL" ||
      row.next_reward_booster_type === "LUCK" ||
      row.next_reward_booster_type === "PREMIUM"
        ? row.next_reward_booster_type
        : null,
  } as LoginStreakStatus;
}

async function fetchHasOpenedDailyToday(userId: string) {
  const startOfTodayUtc = new Date();
  startOfTodayUtc.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("booster_openings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", "DAILY")
    .gte("created_at", startOfTodayUtc.toISOString());

  if (error) {
    throw error;
  }

  return (count ?? 0) > 0;
}

export function useDailyBoosterTargetQuery() {
  return useQuery({
    queryKey: ["daily-booster-target"],
    queryFn: fetchDailyBoosterTarget,
  });
}

export function useHasOpenedDailyTodayQuery(userId?: string) {
  return useQuery({
    queryKey: ["daily-booster-opened-today", userId],
    enabled: Boolean(userId),
    queryFn: () => fetchHasOpenedDailyToday(userId!),
  });
}

export function useLoginStreakStatusQuery(userId?: string) {
  return useQuery({
    queryKey: ["login-streak-status", userId],
    enabled: Boolean(userId),
    queryFn: () => fetchLoginStreakStatus(userId!),
  });
}

export function useShopBoostersQuery() {
  return useQuery({
    queryKey: ["shop-boosters"],
    queryFn: fetchShopBoosters,
  });
}

/* ─── Duplicate detection helpers ─── */

/** Snapshot the set of card IDs a user currently owns (call BEFORE opening). */
export async function getOwnedCardIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("user_cards")
    .select("card_id")
    .eq("user_id", userId);
  return new Set((data ?? []).map((row: { card_id: string }) => row.card_id));
}

/**
 * Given the drawn card IDs and the set of cards owned before opening,
 * return the indices (into drawnCardIds) that are duplicates.
 */
export function computeDuplicateIndices(
  drawnCardIds: string[],
  ownedBefore: Set<string>,
): number[] {
  const seen = new Set<string>();
  const dupes: number[] = [];
  for (let i = 0; i < drawnCardIds.length; i++) {
    const id = drawnCardIds[i];
    if (ownedBefore.has(id) || seen.has(id)) {
      dupes.push(i);
    }
    seen.add(id);
  }
  return dupes;
}
