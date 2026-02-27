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
