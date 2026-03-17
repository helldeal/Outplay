import { useState, useCallback } from "react";
import { useAuth } from "../auth/AuthProvider";
import { LeaderboardGlobalStats } from "../components/leaderboard/LeaderboardGlobalStats";
import { LeaderboardMatrices } from "../components/leaderboard/LeaderboardMatrices";
import { LeaderboardPodium } from "../components/leaderboard/LeaderboardPodium";
import { LeaderboardTable } from "../components/leaderboard/LeaderboardTable";
import { RecentDropsPanel } from "../components/leaderboard/RecentDropsPanel";
import { PageLoading } from "../components/PageLoading";
import {
  useLeaderboardQuery,
  useLeaderboardMatrixPlayersQuery,
  useLeaderboardGlobalStatsQuery,
  useRecentDropsQuery,
  fetchMoreRecentDrops,
  type RecentDrop,
} from "../query/leaderboard";

/* ── constants ── */

const PAGE_SIZE = 10;
const scoreFormatter = new Intl.NumberFormat("fr-FR");

export function LeaderboardPage() {
  const { user } = useAuth();
  const leaderboardQuery = useLeaderboardQuery(Boolean(user));
  const recentDropsQuery = useRecentDropsQuery(Boolean(user));
  const leaderboardGlobalStatsQuery = useLeaderboardGlobalStatsQuery(
    Boolean(user),
  );
  const leaderboardMatrixPlayersQuery = useLeaderboardMatrixPlayersQuery(
    user?.id,
    Boolean(user),
  );

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
    return <PageLoading subtitle="Chargement du leaderboard…" />;
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

      <LeaderboardPodium rows={podium} scoreFormatter={scoreFormatter} />

      {/* ── Main content: leaderboard + recent drops ── */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <LeaderboardTable
          page={page}
          totalPages={totalPages}
          rows={pageRows}
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
          scoreFormatter={scoreFormatter}
        />

        <RecentDropsPanel
          drops={allDrops}
          noMore={noMore}
          loadingMore={loadingMore}
          onLoadMore={() => {
            void loadMore();
          }}
        />
      </div>

      {leaderboardGlobalStatsQuery.isLoading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
          Chargement des global stats...
        </div>
      ) : leaderboardGlobalStatsQuery.error ? (
        <div className="rounded-2xl border border-rose-800/70 bg-rose-950/30 p-4 text-sm text-rose-300">
          Impossible de charger les global stats.
        </div>
      ) : leaderboardGlobalStatsQuery.data ? (
        <LeaderboardGlobalStats
          stats={leaderboardGlobalStatsQuery.data}
          scoreFormatter={scoreFormatter}
        />
      ) : null}

      {leaderboardMatrixPlayersQuery.isLoading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
          Chargement des matrices du leaderboard...
        </div>
      ) : leaderboardMatrixPlayersQuery.error ? (
        <div className="rounded-2xl border border-rose-800/70 bg-rose-950/30 p-4 text-sm text-rose-300">
          Impossible de charger les matrices du leaderboard.
        </div>
      ) : leaderboardMatrixPlayersQuery.data && user?.id ? (
        <LeaderboardMatrices
          players={leaderboardMatrixPlayersQuery.data}
          currentUserId={user.id}
        />
      ) : null}
    </section>
  );
}
