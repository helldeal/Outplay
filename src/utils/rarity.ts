import type { Rarity } from "../types";

export const RARITY_ORDER: Rarity[] = [
  "LEGENDS",
  "WORLD_CLASS",
  "CHAMPION",
  "CHALLENGER",
  "ROOKIE",
];

const RARITY_RANK: Record<Rarity, number> = {
  LEGENDS: 5,
  WORLD_CLASS: 4,
  CHAMPION: 3,
  CHALLENGER: 2,
  ROOKIE: 1,
};

const RARITY_WEIGHTS: Record<Rarity, number> = {
  ROOKIE: 1,
  CHALLENGER: 3,
  CHAMPION: 8,
  WORLD_CLASS: 20,
  LEGENDS: 70,
};

export function rarityRank(rarity: Rarity): number {
  return RARITY_RANK[rarity];
}

export function rarityWeight(rarity: Rarity): number {
  return RARITY_WEIGHTS[rarity];
}

export function rarityTone(rarity: Rarity): string {
  switch (rarity) {
    case "LEGENDS":
      return ""; // Géré par holographic-border dans CardTile
    case "WORLD_CLASS":
      return "border-orange-500 border-4 shadow-orange-500/60 hover:shadow-orange-500/80";
    case "CHAMPION":
      return "border-purple-500 border-4 shadow-purple-500/60 hover:shadow-purple-500/80";
    case "CHALLENGER":
      return "border-blue-500 border-4 shadow-blue-500/60 hover:shadow-blue-500/80";
    default:
      return "border-gray-400 border-4 shadow-gray-400/40 hover:shadow-gray-400/60";
  }
}

/** Tailwind text-color class for a rarity badge / label. */
export function rarityTextColor(rarity: Rarity | string | null): string {
  switch (rarity) {
    case "LEGENDS":
      return "text-amber-400";
    case "WORLD_CLASS":
      return "text-orange-400";
    case "CHAMPION":
      return "text-purple-400";
    case "CHALLENGER":
      return "text-blue-400";
    case "ROOKIE":
      return "text-zinc-400";
    default:
      return "text-slate-400";
  }
}

/** Human-readable rarity label. */
export function rarityLabel(rarity: Rarity | string | null): string {
  switch (rarity) {
    case "LEGENDS":
      return "Legends";
    case "WORLD_CLASS":
      return "World Class";
    case "CHAMPION":
      return "Champion";
    case "CHALLENGER":
      return "Challenger";
    case "ROOKIE":
      return "Rookie";
    default:
      return "N/A";
  }
}

/** Tailwind border-color class for a rarity. */
export function rarityBorderColor(rarity: Rarity | string | null): string {
  switch (rarity) {
    case "LEGENDS":
      return "border-amber-400/50";
    case "WORLD_CLASS":
      return "border-orange-500/50";
    case "CHAMPION":
      return "border-purple-500/50";
    case "CHALLENGER":
      return "border-blue-500/50";
    case "ROOKIE":
      return "border-zinc-500/50";
    default:
      return "border-slate-700";
  }
}
