import { useQuery } from "@tanstack/react-query";
import { rarityRank } from "../utils/rarity";
import { supabase } from "../lib/supabase";
import type { CardWithRelations, Series } from "../types";

export function useLegendexSeriesQuery() {
  return useQuery({
    queryKey: ["legendex-series"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("series")
        .select("id, name, slug, code")
        .order("name");
      if (error) {
        throw error;
      }
      return (data ?? []) as Series[];
    },
  });
}

export function useLegendexCardsQuery(selectedSeriesId?: string) {
  return useQuery({
    queryKey: ["legendex-cards", selectedSeriesId],
    enabled: Boolean(selectedSeriesId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select(
          `id, name, rarity, imageUrl, pc_value, series_id,
           game:games(*),
           nationality:nationalities(*),
           team:teams(*),
           role:roles(*)`,
        )
        .eq("series_id", selectedSeriesId!);

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as unknown as (CardWithRelations & {
        series_id: string;
      })[];
      return rows.sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity));
    },
  });
}

export function useLegendexOwnedCardsQuery(
  userId?: string,
  selectedSeriesId?: string,
) {
  return useQuery({
    queryKey: ["legendex-owned", userId, selectedSeriesId],
    enabled: Boolean(userId && selectedSeriesId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_cards")
        .select("card_id, obtained_at, card:cards!inner(series_id)")
        .eq("user_id", userId!)
        .eq("card.series_id", selectedSeriesId!);

      if (error) {
        throw error;
      }

      return new Map(
        (data ?? []).map((entry) => [
          entry.card_id as string,
          entry.obtained_at as string,
        ]),
      );
    },
  });
}
