import {
  BarChart3,
  Coins,
  LoaderCircle,
  Package,
  Trophy,
  UserRound,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { useLeaderboardQuery } from "../query/leaderboard";

export function LeaderboardPage() {
  const { user } = useAuth();
  const leaderboardQuery = useLeaderboardQuery(Boolean(user));

  if (!user) {
    return (
      <p className="text-sm text-slate-400">
        Connecte-toi pour consulter le leaderboard.
      </p>
    );
  }

  if (leaderboardQuery.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-400">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Chargement du leaderboard...
      </p>
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
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
          <Trophy className="h-6 w-6 text-amber-300" />
          Leaderboard
        </h1>
        <p className="text-sm text-slate-400">
          Classement par score pondéré de rareté puis nombre total de cartes.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900">
            <tr className="text-left text-slate-300">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">
                <span className="inline-flex items-center gap-1">
                  <UserRound className="h-4 w-4" />
                  Joueur
                </span>
              </th>
              <th className="px-4 py-3">
                <span className="inline-flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" />
                  Score
                </span>
              </th>
              <th className="px-4 py-3">
                <span className="inline-flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  Cartes
                </span>
              </th>
              <th className="px-4 py-3">
                <span className="inline-flex items-center gap-1">
                  <Coins className="h-4 w-4" />
                  PC
                </span>
              </th>
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
