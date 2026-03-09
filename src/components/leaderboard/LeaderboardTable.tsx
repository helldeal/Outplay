import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import type { LeaderboardRow } from "../../query/leaderboard";
import { PlayerAvatar } from "./PlayerAvatar";

export function LeaderboardTable({
  page,
  totalPages,
  rows,
  onPrev,
  onNext,
  scoreFormatter,
}: {
  page: number;
  totalPages: number;
  rows: LeaderboardRow[];
  onPrev: () => void;
  onNext: () => void;
  scoreFormatter: Intl.NumberFormat;
}) {
  return (
    <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
      <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-4">
        <Trophy className="h-5 w-5 text-amber-400" />
        <h2 className="text-lg font-black italic uppercase text-white">
          Top collection
        </h2>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-[10px] uppercase tracking-widest text-slate-500">
            <th className="px-4 py-3 text-center font-bold">#</th>
            <th className="px-4 py-3 text-left font-bold">Joueur</th>
            <th className="px-4 py-3 text-right font-bold">Score</th>
            <th className="px-4 py-3 text-center font-bold">Cartes</th>
            <th className="px-4 py-3 text-center font-bold">Achv.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {rows.map((row, i) => {
            const rank = page * 10 + i + 1;
            const isTop3 = rank <= 3;
            return (
              <tr
                key={row.userId}
                className="transition-colors hover:bg-white/5"
              >
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-black ${
                      isTop3
                        ? "bg-white text-black"
                        : "bg-white/5 text-slate-500"
                    }`}
                  >
                    {rank}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/profile/${row.userId}`}
                    className="inline-flex items-center gap-2.5 transition hover:text-cyan-100"
                  >
                    <PlayerAvatar
                      avatarUrl={row.avatarUrl}
                      username={row.username}
                      size="sm"
                    />
                    <span className="truncate font-semibold text-white">
                      {row.username}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-indigo-300">
                  {scoreFormatter.format(row.weightedScore)}
                </td>
                <td className="px-4 py-3 text-center text-slate-400">
                  {row.totalCards}
                </td>
                <td className="px-4 py-3 text-center text-amber-300">
                  {row.achievementsUnlocked}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Page {page + 1} / {totalPages}
          </span>
          <div className="flex gap-1.5">
            <button
              disabled={page === 0}
              onClick={onPrev}
              className="rounded p-1.5 transition hover:bg-white/10 disabled:opacity-20"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={onNext}
              className="rounded p-1.5 transition hover:bg-white/10 disabled:opacity-20"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
