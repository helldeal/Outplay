import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

interface LeaderboardRpcRow {
  user_id: string;
  username: string;
  total_cards: number;
  weighted_score: number;
  pc_balance: number;
}

export interface LeaderboardRow {
  userId: string;
  username: string;
  totalCards: number;
  weightedScore: number;
  pcBalance: number;
}

export const leaderboardQueryKey = ["leaderboard"] as const;

export function useLeaderboardQuery(isEnabled: boolean) {
  return useQuery({
    queryKey: leaderboardQueryKey,
    enabled: isEnabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_leaderboard");
      if (error) {
        throw error;
      }

      return ((data ?? []) as LeaderboardRpcRow[]).map((row) => ({
        userId: row.user_id,
        username: row.username,
        totalCards: row.total_cards,
        weightedScore: row.weighted_score,
        pcBalance: row.pc_balance,
      }));
    },
  });
}
