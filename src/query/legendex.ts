import { useQuery, useMutation } from "@tanstack/react-query";
import { rarityRank } from "../utils/rarity";
import { normalizeCard } from "../utils/normalize";
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

export function useUserTargetSeriesQuery(userId?: string) {
  return useQuery({
    queryKey: ["user-target-series", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) {
        return null;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("target_series_id")
        .eq("id", userId)
        .maybeSingle();

      if (userError || !userData?.target_series_id) {
        return null;
      }

      const { data: seriesData, error: seriesError } = await supabase
        .from("series")
        .select("id, name, slug, code")
        .eq("id", userData.target_series_id)
        .maybeSingle();

      if (seriesError) {
        return null;
      }

      return seriesData as Series | null;
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
      return rows
        .map((row) => normalizeCard(row as never))
        .sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity));
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

export function useUpdateUserTargetSeriesMutation(userId?: string) {
  return useMutation({
    mutationFn: async (targetSeriesId: string) => {
      if (!userId) {
        throw new Error("User ID required");
      }

      const { error } = await supabase
        .from("users")
        .update({ target_series_id: targetSeriesId })
        .eq("id", userId);

      if (error) {
        throw error;
      }

      return targetSeriesId;
    },
  });
}
