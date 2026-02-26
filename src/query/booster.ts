import { normalizeCard } from "../utils/normalize";
import { supabase } from "../lib/supabase";
import type { CardWithRelations } from "../types";

export interface OpenBoosterResponse {
  openingId: string;
  boosterId: string;
  seriesId: string;
  cards: string[];
  pcGained: number;
  chargedPc: number;
  type: "SHOP" | "DAILY";
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
