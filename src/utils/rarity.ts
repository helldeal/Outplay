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
      return "border-amber-400/60 hover:shadow-amber-400/30";
    case "WORLD_CLASS":
      return "border-fuchsia-400/60 hover:shadow-fuchsia-400/30";
    case "CHAMPION":
      return "border-cyan-400/60 hover:shadow-cyan-400/30";
    case "CHALLENGER":
      return "border-violet-400/60 hover:shadow-violet-400/30";
    default:
      return "border-slate-600 hover:shadow-slate-500/30";
  }
}
