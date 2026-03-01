import { useQuery } from "@tanstack/react-query";
import { normalizeCard } from "../utils/normalize";
import { supabase } from "../lib/supabase";
import type { CardWithRelations, Series } from "../types";

export interface OpenBoosterResponse {
  openingId: string;
  boosterId: string;
  seriesId: string;
  cards: string[];
  pcGained: number;
  chargedPc: number;
  type: "SHOP" | "DAILY";
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
  is_daily_only: boolean;
  series: Pick<Series, "id" | "name" | "slug" | "code" | "coverImage">;
}

export async function openBoosterRpc(boosterId: string, userId: string) {
  const { data, error } = await supabase.rpc("open_booster", {
    p_booster_id: boosterId,
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }

  return data as OpenBoosterResponse;
}

export async function openDailyBoosterRpc(seriesCode: string, userId: string) {
  const { data, error } = await supabase.rpc("open_daily_booster", {
    p_series_code: seriesCode,
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }

  return data as OpenBoosterResponse;
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
      "id, name, type, price_pc, image_url, is_daily_only, series:series_id(id, name, slug, code, coverImage)",
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
        image_url: row.image_url,
        is_daily_only: row.is_daily_only,
        series: {
          id: relation.id,
          name: relation.name,
          slug: relation.slug,
          code: relation.code,
          coverImage: relation.coverImage,
        },
      } as ShopBoosterWithSeries;
    })
    .filter((booster): booster is ShopBoosterWithSeries => Boolean(booster));
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
