import { useState } from "react";
import { ChevronLeft, ChevronRight, Info, Trophy, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useInViewOnce } from "../../hooks/useInViewOnce";
import type { LeaderboardRow } from "../../query/leaderboard";
import { rarityNameGradient } from "../../utils/rarity";
import { getTitleColorClass } from "../../utils/title-style";
import { ScoreBreakdownTooltip } from "../score/ScoreBreakdownTooltip";
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
  const [isScoreInfoOpen, setIsScoreInfoOpen] = useState(false);
  const { ref, hasBeenVisible } = useInViewOnce<HTMLDivElement>({
    threshold: 0.15,
    rootMargin: "0px 0px -5% 0px",
  });
  const visibleRows = Array.from(
    { length: 10 },
    (_, index) => rows[index] ?? null,
  );

  return (
    <div
      ref={ref}
      className="min-w-0 flex-1 rounded-2xl border border-slate-800 bg-slate-900/50"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-5 py-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-black italic uppercase text-white">
            Top collectionneurs
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setIsScoreInfoOpen(true)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-600 bg-slate-800/70 text-slate-300 transition hover:border-cyan-400 hover:text-cyan-200"
          aria-label="Infos calcul des scores"
          title="Comment les scores sont calculés"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-[10px] uppercase tracking-widest text-slate-500">
            <th className="px-4 py-3 text-center font-bold">#</th>
            <th className="px-4 py-3 text-left font-bold">Joueur</th>
            <th className="px-4 py-3 text-center font-bold">Titre</th>
            <th className="px-4 py-3 text-center font-bold">Score</th>
            <th className="px-4 py-3 text-center font-bold">Cartes</th>
            <th className="px-4 py-3 text-center font-bold">Achv.</th>
            <th className="px-4 py-3 text-left font-bold">Signature</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {visibleRows.map((row, i) => {
            const rank = page * 10 + i + 1;
            const isTop3 = rank <= 3;
            const isPlaceholder = row === null;

            return (
              <tr
                key={row?.userId ?? `placeholder-${page}-${i}`}
                className="relative z-0 transition-colors hover:z-20 hover:bg-white/5 focus-within:z-20"
                style={{
                  opacity: hasBeenVisible ? 1 : 0,
                  transform: hasBeenVisible
                    ? "translateX(0px)"
                    : "translateX(-16px)",
                  transitionProperty: "opacity, transform",
                  transitionDuration: "500ms",
                  transitionTimingFunction: "ease-out",
                  transitionDelay: `${60 + i * 50}ms`,
                }}
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
                  {isPlaceholder ? (
                    <span className="flex items-center gap-2.5 text-slate-600">
                      <span className="h-7 w-7 rounded-full bg-slate-800/70" />
                      <span className="h-3.5 w-24 rounded bg-slate-800/70" />
                    </span>
                  ) : (
                    <Link
                      to={`/profile/${row.userId}`}
                      className="flex items-center gap-2.5 transition hover:text-cyan-100"
                    >
                      <PlayerAvatar
                        avatarUrl={row.avatarUrl}
                        username={row.username}
                        size="sm"
                      />
                      <span className="block truncate font-semibold text-white">
                        {row.username}
                      </span>
                    </Link>
                  )}
                </td>
                <td
                  className={`px-4 py-3 text-center ${getTitleColorClass(row?.title)}`}
                >
                  {isPlaceholder ? (
                    <span className="inline-block h-3.5 w-14 rounded bg-slate-800/70" />
                  ) : (
                    <span className="block truncate font-bold">
                      {row.title || "-"}
                    </span>
                  )}
                </td>
                <td className="relative px-4 py-3 text-center text-indigo-300">
                  {isPlaceholder ? (
                    <span className="inline-block h-3.5 w-14 rounded bg-slate-800/70" />
                  ) : (
                    <ScoreBreakdownTooltip
                      totalScore={row.weightedScore}
                      cardScore={row.cardScore}
                      achievementScore={row.achievementScore}
                      className="inline-flex"
                      tooltipPositionClassName="right-0 top-full"
                    >
                      <span className="font-mono font-bold cursor-help rounded px-1">
                        {scoreFormatter.format(row.weightedScore)}
                      </span>
                    </ScoreBreakdownTooltip>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-slate-400">
                  {isPlaceholder ? "-" : row.totalCards}
                </td>
                <td className="px-4 py-3 text-center text-amber-300">
                  {isPlaceholder ? "-" : row.achievementsUnlocked}
                </td>
                <td className="px-4">
                  {isPlaceholder ? (
                    <span className="inline-block h-3.5 w-24 rounded bg-slate-800/70" />
                  ) : row.signatureCardName ? (
                    <div className="flex min-w-0 items-center gap-2">
                      {row.signatureCardImageUrl ? (
                        <img
                          src={row.signatureCardImageUrl}
                          alt={row.signatureCardName}
                          loading="lazy"
                          className="h-8 w-6 rounded object-cover"
                        />
                      ) : (
                        <span className="inline-block h-8 w-6 rounded bg-slate-800/70" />
                      )}
                      <span
                        className={`truncate text-xs font-black text-transparent bg-clip-text ${rarityNameGradient(
                          row.signatureCardRarity,
                        )}`}
                      >
                        {row.signatureCardName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">-</span>
                  )}
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

      {isScoreInfoOpen ? (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-[0_20px_60px_rgba(2,6,23,0.7)]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="text-base font-black uppercase tracking-wide text-white">
                Calcul des scores
              </h3>
              <button
                type="button"
                onClick={() => setIsScoreInfoOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-600 bg-slate-800/70 text-slate-300 transition hover:border-rose-400 hover:text-rose-200"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-200">
              <div>
                <p className="font-semibold text-cyan-300">
                  Score carte (réel)
                </p>
                <p>
                  Chaque carte a un score de base ajusté par son ratio de drop
                  global (coefficient dynamique). Ensuite, un multiplicateur
                  Prestige est appliqué selon les copies ouvertes:
                </p>
                <ul className="mt-2 space-y-1 text-slate-300">
                  <li>• 2 copies = 1 étoile = x1.25</li>
                  <li>• 5 copies = 2 étoiles = x1.75</li>
                  <li>• 10 copies = 3 étoiles = x3.00</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-violet-300">Score joueur</p>
                <p>
                  <span className="font-semibold text-white">Score total</span>{" "}
                  = somme des scores cartes réels + points d’achievements.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsScoreInfoOpen(false)}
            className="absolute inset-0 -z-10"
            aria-label="Fermer la fenêtre"
          />
        </div>
      ) : null}
    </div>
  );
}
