import { useQuery } from "@tanstack/react-query";
import { rarityRank } from "../utils/rarity";
import { supabase } from "../lib/supabase";
import { resolveAssetUrl } from "../utils/asset-url";
import type { UserCardRow } from "../types";

interface CollectionRpcRow {
  card_id: string;
  obtained_at: string;
  card_name: string;
  card_rarity: "LEGENDS" | "WORLD_CLASS" | "CHAMPION" | "CHALLENGER" | "ROOKIE";
  card_image_url: string;
  card_pc_value: number;
  copies_count: number;
  prestige_stars: number;
  is_prestige: boolean;
  series_name: string | null;
  series_code: string | null;
  game_name: string;
  game_logo_url: string | null;
  team_name: string | null;
  team_logo_url: string | null;
  nationality_code: string;
  nationality_flag_url: string | null;
  role_name: string | null;
  role_icon_url: string | null;
}

function mapCollectionRow(row: CollectionRpcRow): UserCardRow {
  return {
    card_id: row.card_id,
    obtained_at: row.obtained_at,
    copies_count: Number.isFinite(row.copies_count) ? row.copies_count : 1,
    prestige_stars: Number.isFinite(row.prestige_stars)
      ? Math.max(0, Math.min(3, row.prestige_stars))
      : 0,
    is_prestige: Boolean(row.is_prestige),
    card: {
      id: row.card_id,
      name: row.card_name,
      rarity: row.card_rarity,
      imageUrl: resolveAssetUrl(row.card_image_url),
      pc_value: row.card_pc_value,
      series: row.series_name
        ? {
            name: row.series_name,
            code: row.series_code ?? undefined,
          }
        : null,
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

export const collectionQueryKey = (userId?: string) =>
  ["collection", userId] as const;

export function useCollectionQuery(userId?: string) {
  return useQuery({
    queryKey: collectionQueryKey(userId),
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

      const rows = ((data ?? []) as CollectionRpcRow[]).map(mapCollectionRow);
      return rows.sort(
        (a, b) => rarityRank(b.card.rarity) - rarityRank(a.card.rarity),
      );
    },
  });
}
