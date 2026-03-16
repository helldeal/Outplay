import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { displayName } from "./leaderboard";

interface PublicOpeningRecapRpcRow {
  opening_id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  opened_at: string;
  opening_type: "SHOP" | "DAILY" | "STREAK" | "ACHIEVEMENT";
  booster_name: string | null;
  booster_type: "NORMAL" | "LUCK" | "PREMIUM" | "GODPACK" | null;
  booster_price_pc: number | null;
  series_name: string | null;
  pc_gained: number;
  duplicate_cards: number;
  opened_cards: unknown;
}

export interface PublicOpeningRecap {
  openingId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  openedAt: string;
  openingType: "SHOP" | "DAILY" | "STREAK" | "ACHIEVEMENT";
  boosterName: string | null;
  boosterType: "NORMAL" | "LUCK" | "PREMIUM" | "GODPACK" | null;
  boosterPricePc: number;
  seriesName: string | null;
  pcGained: number;
  duplicateCards: number;
  cardIds: string[];
}

export const publicOpeningRecapQueryKey = (openingId?: string) =>
  ["public-opening-recap", openingId] as const;

function normalizeCardIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

export function usePublicOpeningRecapQuery(openingId?: string) {
  return useQuery({
    queryKey: publicOpeningRecapQueryKey(openingId),
    enabled: Boolean(openingId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_opening_recap", {
        p_opening_id: openingId!,
      });

      if (error) {
        throw error;
      }

      const row = ((data ?? []) as PublicOpeningRecapRpcRow[])[0];

      if (!row) {
        throw new Error("Ouverture introuvable");
      }

      return {
        openingId: row.opening_id,
        userId: row.user_id,
        username: displayName(row.username),
        avatarUrl: row.avatar_url,
        openedAt: row.opened_at,
        openingType: row.opening_type,
        boosterName: row.booster_name,
        boosterType: row.booster_type,
        boosterPricePc: row.booster_price_pc ?? 0,
        seriesName: row.series_name,
        pcGained: row.pc_gained,
        duplicateCards: row.duplicate_cards,
        cardIds: normalizeCardIds(row.opened_cards),
      } as PublicOpeningRecap;
    },
  });
}
