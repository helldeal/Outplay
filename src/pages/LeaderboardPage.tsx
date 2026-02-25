import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";

interface LeaderboardRpcRow {
  user_id: string;
  username: string;
  total_cards: number;
  weighted_score: number;
  pc_balance: number;
}

export function LeaderboardPage() {
  const { user } = useAuth();

  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard"],
    enabled: Boolean(user),
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

  if (!user) {
    return (
      <p className="text-sm text-slate-400">
        Connecte-toi pour consulter le leaderboard.
      </p>
    );
  }

  if (leaderboardQuery.isLoading) {
    return (
      <p className="text-sm text-slate-400">Chargement du leaderboard...</p>
    );
  }

  if (leaderboardQuery.error) {
    return (
      <p className="text-sm text-rose-300">
        {(leaderboardQuery.error as Error).message}
      </p>
    );
  }

  const rows = leaderboardQuery.data ?? [];

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Leaderboard</h1>
        <p className="text-sm text-slate-400">
          Classement par score pondéré de rareté puis nombre total de cartes.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900">
            <tr className="text-left text-slate-300">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Joueur</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Cartes</th>
              <th className="px-4 py-3">PC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/70">
            {rows.map((row, index) => (
              <tr key={row.userId} className="text-slate-200">
                <td className="px-4 py-3">{index + 1}</td>
                <td className="px-4 py-3">{row.username}</td>
                <td className="px-4 py-3">{row.weightedScore}</td>
                <td className="px-4 py-3">{row.totalCards}</td>
                <td className="px-4 py-3">{row.pcBalance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
