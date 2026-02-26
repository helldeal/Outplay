import { useQuery } from "@tanstack/react-query";
import { normalizeUserCardRow } from "../utils/normalize";
import { rarityRank } from "../utils/rarity";
import { supabase } from "../lib/supabase";

export const collectionQueryKey = (userId?: string) =>
  ["collection", userId] as const;

export function useCollectionQuery(userId?: string) {
  return useQuery({
    queryKey: collectionQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from("user_cards").select(`
          card_id,
          obtained_at,
          card:cards!inner(
            id,
            name,
            rarity,
            imageUrl,
            pc_value,
            game:games(name, logoUrl),
            team:teams(name, logoUrl),
            nationality:nationalities(code, flagUrl),
            role:roles(name, iconUrl)
          )
        `);

      if (error) {
        throw error;
      }

      const rows = (data ?? []).map((row) =>
        normalizeUserCardRow(row as never),
      );
      return rows.sort(
        (a, b) => rarityRank(b.card.rarity) - rarityRank(a.card.rarity),
      );
    },
  });
}
