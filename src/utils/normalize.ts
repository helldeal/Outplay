import type {
  CardWithRelations,
  LinkedEntity,
  Rarity,
  UserCardRow,
} from "../types";

type JoinedEntity = LinkedEntity | LinkedEntity[] | null | undefined;

function takeJoined(value: JoinedEntity): LinkedEntity | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

interface RawCard {
  id: string;
  name: string;
  rarity: Rarity;
  imageUrl: string;
  pc_value: number;
  game: JoinedEntity;
  team: JoinedEntity;
  nationality: JoinedEntity;
  role: JoinedEntity;
}

interface RawUserCardRow {
  card_id: string;
  obtained_at: string;
  card: RawCard | RawCard[];
}

export function normalizeCard(rawCard: RawCard): CardWithRelations {
  const game = takeJoined(rawCard.game);
  const nationality = takeJoined(rawCard.nationality);

  if (!game || !nationality) {
    throw new Error("Card relation payload is incomplete");
  }

  return {
    id: rawCard.id,
    name: rawCard.name,
    rarity: rawCard.rarity,
    imageUrl: rawCard.imageUrl,
    pc_value: rawCard.pc_value,
    game,
    team: takeJoined(rawCard.team),
    nationality,
    role: takeJoined(rawCard.role),
  };
}

export function normalizeUserCardRow(rawRow: RawUserCardRow): UserCardRow {
  const cardData = Array.isArray(rawRow.card) ? rawRow.card[0] : rawRow.card;
  if (!cardData) {
    throw new Error("Missing card payload");
  }

  return {
    card_id: rawRow.card_id,
    obtained_at: rawRow.obtained_at,
    card: normalizeCard(cardData),
  };
}
