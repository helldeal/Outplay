import { useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Crown,
  LoaderCircle,
  Trophy,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import {
  useLeaderboardQuery,
  useRecentDropsQuery,
  fetchMoreRecentDrops,
  type RecentDrop,
} from "../query/leaderboard";
import {
  rarityTextColor,
  rarityLabel,
  rarityBorderColor,
} from "../utils/rarity";

/* ── constants ── */

const PAGE_SIZE = 10;
const scoreFormatter = new Intl.NumberFormat("fr-FR");

/* ── small helpers ── */

function formatRelativeDate(dateIso: string) {
  const d = new Date(dateIso);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ── reusable avatar + name ── */

export function PlayerAvatar({
  avatarUrl,
  username,
  size = "sm",
}: {
  avatarUrl: string | null;
  username: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim =
    size === "lg" ? "h-20 w-20" : size === "md" ? "h-10 w-10" : "h-7 w-7";
  const textSize =
    size === "lg" ? "text-xl" : size === "md" ? "text-sm" : "text-[10px]";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className={`${dim} rounded-full border border-slate-600/70 bg-slate-800 object-cover`}
        loading="lazy"
      />
    );
  }

  const initials =
    username
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "OP";

  return (
    <span
      className={`inline-flex ${dim} items-center justify-center rounded-full border border-slate-600/70 bg-slate-700 ${textSize} font-semibold text-slate-200`}
    >
      {initials}
    </span>
  );
}

/* ── page ── */

export function LeaderboardPage() {
  const { user } = useAuth();
  const leaderboardQuery = useLeaderboardQuery(Boolean(user));
  const recentDropsQuery = useRecentDropsQuery(Boolean(user));

  /* pagination state */
  const [page, setPage] = useState(0);

  /* recent drops load-more state */
  const [extraDrops, setExtraDrops] = useState<RecentDrop[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [noMore, setNoMore] = useState(false);

  const loadMore = useCallback(async () => {
    const currentLen = (recentDropsQuery.data?.length ?? 0) + extraDrops.length;
    setLoadingMore(true);
    try {
      const more = await fetchMoreRecentDrops(currentLen);
      if (more.length === 0) {
        setNoMore(true);
      } else {
        setExtraDrops((prev) => [...prev, ...more]);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [recentDropsQuery.data, extraDrops]);

  /* ── guards ── */

  if (!user) {
    return (
      <p className="text-sm text-slate-400">
        Connecte-toi pour consulter le leaderboard.
      </p>
    );
  }

  if (leaderboardQuery.isLoading || recentDropsQuery.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-400">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Chargement du leaderboard…
      </p>
    );
  }

  if (leaderboardQuery.error || recentDropsQuery.error) {
    return (
      <p className="text-sm text-rose-300">
        {((leaderboardQuery.error ?? recentDropsQuery.error) as Error).message}
      </p>
    );
  }

  const allRows = leaderboardQuery.data ?? [];
  const podium = allRows.slice(0, 3);
  const totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  const pageRows = allRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const allDrops = [...(recentDropsQuery.data ?? []), ...extraDrops];

  /* podium order: 2nd – 1st – 3rd */
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean);
  const podiumMeta = [
    {
      rank: 2,
      pillar: "h-36 md:h-48",
      ring: "border-slate-400/60 from-slate-300 to-slate-600",
      text: "text-slate-300",
      glow: "",
    },
    {
      rank: 1,
      pillar: "h-48 md:h-64",
      ring: "border-amber-400/60 from-amber-300 to-amber-700",
      text: "text-amber-400",
      glow: "shadow-[0_0_30px_rgba(251,191,36,0.3)]",
    },
    {
      rank: 3,
      pillar: "h-28 md:h-40",
      ring: "border-orange-400/60 from-orange-300 to-orange-700",
      text: "text-orange-400",
      glow: "",
    },
  ];

  return (
    <section className="space-y-10">
      {/* ── Header ── */}
      <div className="text-center">
        <h1 className="text-4xl font-black uppercase italic tracking-tight text-white md:text-6xl">
          Leaderboard
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">
          Dominez le classement en collectionnant les cartes les plus rares.
        </p>
      </div>

      {/* ── Podium ── */}
      {podium.length >= 3 && (
        <div className="flex items-end justify-center gap-3 md:gap-8">
          {podiumOrder.map((row, i) => {
            const meta = podiumMeta[i];
            return (
              <div
                key={row.userId}
                className="flex w-1/3 max-w-[220px] flex-col items-center"
              >
                {/* avatar */}
                <div className="relative mb-4">
                  {meta.rank === 1 && (
                    <Crown className="absolute -top-8 left-1/2 h-8 w-8 -translate-x-1/2 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.7)]" />
                  )}
                  <div
                    className={`rounded-full border-2 bg-gradient-to-b p-1 ${meta.ring} ${meta.glow}`}
                  >
                    <PlayerAvatar
                      avatarUrl={row.avatarUrl}
                      username={row.username}
                      size="lg"
                    />
                  </div>
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-[10px] font-black text-white">
                    {scoreFormatter.format(row.weightedScore)} pts
                  </span>
                </div>

                {/* pillar */}
                <div
                  className={`w-full rounded-t-2xl border-t border-x border-slate-700/50 bg-slate-900/60 ${meta.pillar} flex flex-col items-center pt-5`}
                >
                  <span
                    className={`text-5xl font-black opacity-20 ${meta.text}`}
                  >
                    {meta.rank}
                  </span>
                  <div className="mt-auto pb-4 text-center">
                    <p className="truncate px-2 text-sm font-bold text-white">
                      {row.username}
                    </p>
                    <p className="text-xs text-slate-400">
                      {row.totalCards} cartes
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Main content: leaderboard + recent drops ── */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* leaderboard table */}
        <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-4">
            <Trophy className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-black italic uppercase text-white">
              Top Collection
            </h2>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase tracking-widest text-slate-500">
                <th className="px-4 py-3 text-center font-bold">#</th>
                <th className="px-4 py-3 text-left font-bold">Joueur</th>
                <th className="px-4 py-3 text-right font-bold">Score</th>
                <th className="px-4 py-3 text-center font-bold">Cartes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {pageRows.map((row, i) => {
                const rank = page * PAGE_SIZE + i + 1;
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
                      <span className="inline-flex items-center gap-2.5">
                        <PlayerAvatar
                          avatarUrl={row.avatarUrl}
                          username={row.username}
                          size="sm"
                        />
                        <span className="truncate font-semibold text-white">
                          {row.username}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-indigo-300">
                      {scoreFormatter.format(row.weightedScore)}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400">
                      {row.totalCards}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Page {page + 1} / {totalPages}
              </span>
              <div className="flex gap-1.5">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded p-1.5 transition hover:bg-white/10 disabled:opacity-20"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded p-1.5 transition hover:bg-white/10 disabled:opacity-20"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* recent drops */}
        <aside className="w-full space-y-3 lg:w-80 lg:shrink-0">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-300">
            <Clock3 className="h-4 w-4 text-cyan-300" />
            Dernières ouvertures
          </h2>

          {allDrops.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
              Aucune ouverture récente.
            </div>
          ) : (
            <div className="space-y-3">
              {allDrops.map((drop) => (
                <article
                  key={drop.openingId}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"
                >
                  <div className="flex items-center gap-2.5">
                    <PlayerAvatar
                      avatarUrl={drop.avatarUrl}
                      username={drop.username}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-indigo-300">
                        {drop.username}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {drop.boosterName} · {formatRelativeDate(drop.openedAt)}
                      </p>
                    </div>
                  </div>

                  {drop.bestCardName && (
                    <div
                      className={`mt-2 flex items-center gap-3 rounded-lg border bg-slate-950/60 p-2 ${rarityBorderColor(drop.bestCardRarity)}`}
                    >
                      <div className="h-11 w-8 shrink-0 overflow-hidden rounded bg-black">
                        {drop.bestCardImageUrl && (
                          <img
                            src={drop.bestCardImageUrl}
                            alt={drop.bestCardName}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-[9px] font-black uppercase tracking-wider ${rarityTextColor(drop.bestCardRarity)}`}
                        >
                          {rarityLabel(drop.bestCardRarity)}
                        </p>
                        <p className="truncate text-xs font-bold text-white">
                          {drop.bestCardName}
                        </p>
                      </div>
                    </div>
                  )}
                </article>
              ))}

              {!noMore && (
                <button
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-white/5 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  {loadingMore ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Charger plus
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
