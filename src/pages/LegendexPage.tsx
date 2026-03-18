import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LoaderCircle, Target } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { CardTile } from "../components/CardTile";
import {
  useLegendexCardsQuery,
  useLegendexOwnedCardsQuery,
  useLegendexSeriesQuery,
  useUserTargetSeriesQuery,
  useUpdateUserTargetSeriesMutation,
} from "../query/legendex";
import { useQueryClient } from "@tanstack/react-query";

export function LegendexPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSeries = searchParams.get("series")?.toLowerCase() ?? "";
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const seriesQuery = useLegendexSeriesQuery();
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>("");
  const targetSeriesQuery = useUserTargetSeriesQuery(user?.id);
  const updateTargetSeriesMutation = useUpdateUserTargetSeriesMutation(
    user?.id,
  );

  const sortedSeries = useMemo(
    () =>
      (seriesQuery.data ?? [])
        .slice()
        .sort((a, b) => a.code.localeCompare(b.code)),
    [seriesQuery.data],
  );

  useEffect(() => {
    if (!sortedSeries.length) {
      return;
    }

    const matchedSeries = requestedSeries
      ? sortedSeries.find(
          (series) =>
            series.slug.toLowerCase() === requestedSeries ||
            series.code.toLowerCase() === requestedSeries ||
            series.id.toLowerCase() === requestedSeries,
        )
      : null;

    if (matchedSeries) {
      if (selectedSeriesId !== matchedSeries.id) {
        setSelectedSeriesId(matchedSeries.id);
      }
      return;
    }

    const fallbackSeries =
      sortedSeries.find((series) => series.id === selectedSeriesId) ??
      sortedSeries[0];

    if (selectedSeriesId !== fallbackSeries.id) {
      setSelectedSeriesId(fallbackSeries.id);
    }

    const nextSeriesParam = fallbackSeries.slug.toLowerCase();
    if (requestedSeries !== nextSeriesParam) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set("series", nextSeriesParam);
      setSearchParams(nextSearchParams, { replace: true });
    }
  }, [
    selectedSeriesId,
    requestedSeries,
    sortedSeries,
    searchParams,
    setSearchParams,
  ]);

  const handleSeriesChange = (nextSeriesId: string) => {
    setSelectedSeriesId(nextSeriesId);

    const nextSeries = sortedSeries.find(
      (series) => series.id === nextSeriesId,
    );
    if (!nextSeries) {
      return;
    }

    const nextSeriesParam = nextSeries.slug.toLowerCase();
    if (requestedSeries === nextSeriesParam) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("series", nextSeriesParam);
    setSearchParams(nextSearchParams, { replace: true });
  };

  const cardsQuery = useLegendexCardsQuery(selectedSeriesId);
  const ownedQuery = useLegendexOwnedCardsQuery(user?.id, selectedSeriesId);

  const cards = useMemo(
    () => [...(cardsQuery.data ?? [])].sort((a, b) => b.id.localeCompare(a.id)),
    [cardsQuery.data],
  );
  const ownedData = ownedQuery.data;
  const owned =
    ownedData instanceof Map ? ownedData : new Map<string, string>();

  const selectedSeries =
    (seriesQuery.data ?? []).find((series) => series.id === selectedSeriesId) ??
    null;
  const isSelectedSeriesTargeted =
    Boolean(selectedSeries?.id) &&
    targetSeriesQuery.data?.id === selectedSeries?.id;

  const ownedCount = useMemo(
    () => cards.filter((card) => owned.has(card.id)).length,
    [cards, owned],
  );

  const totalCount = cards.length;

  const completion = useMemo(() => {
    if (totalCount === 0) {
      return 0;
    }
    return Math.round((ownedCount / totalCount) * 100);
  }, [ownedCount, totalCount]);

  const [animatedCompletion, setAnimatedCompletion] = useState(0);
  const [animatedOwnedCount, setAnimatedOwnedCount] = useState(0);

  const isSeriesLoading = seriesQuery.isLoading;
  const isCardsLoading = Boolean(selectedSeriesId) && cardsQuery.isLoading;
  const isOwnedLoading =
    Boolean(user?.id && selectedSeriesId) && ownedQuery.isLoading;
  const isGridLoading = isCardsLoading;

  useEffect(() => {
    if (isCardsLoading || isOwnedLoading) {
      setAnimatedCompletion(0);
      setAnimatedOwnedCount(0);
      return;
    }

    const targetCompletion = completion;
    const targetOwnedCount = ownedCount;
    const durationMs = 800;
    const startedAt = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / durationMs, 1);
      const eased = 1 - (1 - progress) ** 3;

      setAnimatedCompletion(Math.round(targetCompletion * eased));
      setAnimatedOwnedCount(Math.round(targetOwnedCount * eased));

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [completion, ownedCount, isCardsLoading, isOwnedLoading]);

  if (seriesQuery.error || cardsQuery.error || ownedQuery.error) {
    return (
      <p className="text-sm text-rose-300">
        {
          ((seriesQuery.error ?? cardsQuery.error ?? ownedQuery.error) as Error)
            .message
        }
      </p>
    );
  }

  return (
    <section className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-black uppercase italic tracking-tight text-white md:text-6xl">
          Legendex
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">
          Explore toutes les cartes de la série et vise les 100% de complétion.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4 shadow-[0_10px_32px_rgba(2,6,23,0.4)]">
        <div className="space-y-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="series-select"
              className="text-xs font-black uppercase tracking-[0.14em] text-slate-300"
            >
              Série à explorer
            </label>
            <select
              id="series-select"
              value={selectedSeriesId}
              onChange={(event) => handleSeriesChange(event.target.value)}
              disabled={
                isSeriesLoading || (seriesQuery.data ?? []).length === 0
              }
              className="rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-100 shadow-[0_6px_18px_rgba(2,6,23,0.35)]"
            >
              {sortedSeries.map((series) => (
                <option key={series.id} value={series.id}>
                  {series.name} ({series.code})
                </option>
              ))}
            </select>
            {isSeriesLoading && (
              <span className="text-xs text-slate-400">
                Chargement des séries...
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/55 p-4 shadow-[0_12px_34px_rgba(2,6,23,0.4)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(34,211,238,0.1),transparent_35%,rgba(168,85,247,0.1))]" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">
              Progression série
            </p>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="text-lg font-black uppercase italic text-white">
                {isCardsLoading
                  ? "Chargement..."
                  : (selectedSeries?.name ?? "Série")}
              </h2>

              {user && selectedSeries && (
                <button
                  type="button"
                  title={
                    isSelectedSeriesTargeted
                      ? "Série déjà ciblée"
                      : "Cibler cette série"
                  }
                  onClick={() => {
                    updateTargetSeriesMutation.mutate(selectedSeries.id, {
                      onSuccess: () => {
                        if (!user?.id) {
                          return;
                        }

                        void Promise.all([
                          queryClient.invalidateQueries({
                            queryKey: ["user-target-series", user.id],
                          }),
                          queryClient.invalidateQueries({
                            queryKey: ["login-streak-status", user.id],
                          }),
                          queryClient.invalidateQueries({
                            queryKey: ["achievements-progress", user.id],
                          }),
                          queryClient.invalidateQueries({
                            queryKey: ["achievements-unseen-count", user.id],
                          }),
                          queryClient.invalidateQueries({
                            queryKey: ["achievements-notifications", user.id],
                          }),
                          refreshProfile(),
                        ]).catch(() => undefined);
                      },
                    });
                  }}
                  disabled={
                    updateTargetSeriesMutation.isPending ||
                    isSelectedSeriesTargeted
                  }
                  className={`group inline-flex items-center justify-center rounded-full  shadow-[0_0_20px_rgba(251,191,36,0.28)] transition ${
                    isSelectedSeriesTargeted
                      ? "cursor-default border-emerald-400/60 bg-emerald-500/15 text-emerald-300"
                      : "border-amber-300/70 bg-amber-300/20 text-amber-200 hover:scale-110 hover:bg-amber-300/30"
                  }`}
                >
                  {updateTargetSeriesMutation.isPending ? (
                    <LoaderCircle className="h-6 w-6 animate-spin" />
                  ) : (
                    <Target
                      className={`h-6 w-6 transition ${
                        isSelectedSeriesTargeted
                          ? ""
                          : "animate-pulse group-hover:-rotate-6"
                      }`}
                    />
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
              Complétion
            </p>
            <p className="text-3xl font-black tracking-tight text-cyan-300">
              {isOwnedLoading ? "..." : `${animatedCompletion}%`}
            </p>
          </div>
        </div>

        {user && updateTargetSeriesMutation.isError && (
          <p className="mt-2 text-xs text-rose-400">Erreur de mise à jour</p>
        )}

        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-800/90">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-cyan-400 to-purple-400 transition-all duration-500"
            style={{ width: `${animatedCompletion}%` }}
          />
        </div>

        <p className="mt-2 text-sm text-slate-300">
          <span className="font-semibold text-white">{animatedOwnedCount}</span>{" "}
          /<span className="font-semibold text-white"> {totalCount}</span>{" "}
          cartes possédées
        </p>
        {isOwnedLoading && (
          <p className="mt-1 text-xs text-slate-400">
            Synchronisation de ta collection...
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {isGridLoading
          ? Array.from({ length: 10 }).map((_, index) => (
              <div
                key={index}
                className="aspect-[3/4] animate-pulse rounded-xl border border-slate-800 bg-slate-900/65"
              />
            ))
          : cards.map((card) => {
              const isOwned = owned.has(card.id);
              const obtainedAt = owned.get(card.id);
              return (
                <CardTile
                  key={card.id}
                  card={card}
                  isOwned={isOwned}
                  obtainedAt={obtainedAt}
                />
              );
            })}
      </div>
      {!isGridLoading && cards.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4 text-sm text-slate-400">
          Aucune carte disponible pour cette série.
        </div>
      )}
    </section>
  );
}
