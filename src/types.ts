export type Rarity =
  | "LEGENDS"
  | "WORLD_CLASS"
  | "CHAMPION"
  | "CHALLENGER"
  | "ROOKIE";

export interface LinkedEntity {
  name: string;
  logoUrl?: string;
  iconUrl?: string;
  code?: string;
  flagUrl?: string;
}

export interface CardWithRelations {
  id: string;
  name: string;
  rarity: Rarity;
  imageUrl: string;
  pc_value: number;
  game: LinkedEntity;
  team: LinkedEntity | null;
  nationality: LinkedEntity;
  role: LinkedEntity | null;
}

export interface UserCardRow {
  card_id: string;
  obtained_at: string;
  card: CardWithRelations;
}

export interface Booster {
  id: string;
  name: string;
  type: "NORMAL" | "LUCK" | "PREMIUM" | "GODPACK";
  price_pc: number;
  image_url: string | null;
  is_daily_only: boolean;
}

export interface Series {
  id: string;
  name: string;
  slug: string;
  code: string;
  coverImage?: string | null;
}
