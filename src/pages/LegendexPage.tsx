import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { CardTile } from "../components/CardTile";
import { PageLoading } from "../components/PageLoading";
import {
  useLegendexCardsQuery,
  useLegendexOwnedCardsQuery,
  useLegendexSeriesQuery,
} from "../query/legendex";

export function LegendexPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedSeries = searchParams.get("series")?.trim().toLowerCase();
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>("");
  const seriesQuery = useLegendexSeriesQuery();

  useEffect(() => {
    if (!seriesQuery.data || seriesQuery.data.length === 0) {
      return;
    }

    const targetSeries = requestedSeries
      ? seriesQuery.data.find(
          (series) =>
            series.slug.toLowerCase() === requestedSeries ||
            series.code.toLowerCase() === requestedSeries,
        )
      : null;

    const nextSeriesId = targetSeries?.id ?? seriesQuery.data[0].id;

    if (selectedSeriesId !== nextSeriesId) {
      setSelectedSeriesId(nextSeriesId);
    }
  }, [requestedSeries, selectedSeriesId, seriesQuery.data]);

  const cardsQuery = useLegendexCardsQuery(selectedSeriesId);
  const ownedQuery = useLegendexOwnedCardsQuery(user?.id, selectedSeriesId);

  const cards = cardsQuery.data?.sort((a, b) => b.id.localeCompare(a.id)) ?? [];
  const ownedData = ownedQuery.data;
  const owned =
    ownedData instanceof Map ? ownedData : new Map<string, string>();

  const selectedSeries =
    (seriesQuery.data ?? []).find((series) => series.id === selectedSeriesId) ??
    null;

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

  const isPageLoading =
    seriesQuery.isLoading ||
    (Boolean(selectedSeriesId) && cardsQuery.isLoading) ||
    (Boolean(user?.id && selectedSeriesId) && ownedQuery.isLoading);

  if (isPageLoading) {
    return <PageLoading title="Legendex" subtitle="Chargement du Legendex…" />;
  }

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
        <h1 className="flex items-center justify-center gap-2 text-4xl font-black uppercase italic tracking-tight text-white md:text-6xl">
          Legendex
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">
          Index des cartes avec visibilité de la progression par série.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="series-select" className="text-sm text-slate-300">
            Série
          </label>
          <select
            id="series-select"
            value={selectedSeriesId}
            onChange={(event) => setSelectedSeriesId(event.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            {(seriesQuery.data ?? []).map((series) => (
              <option key={series.id} value={series.id}>
                {series.name} ({series.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">
              Progression série
            </p>
            <h2 className="mt-1 text-lg font-black uppercase italic text-white">
              {selectedSeries?.name ?? "Série"}
            </h2>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
              Complétion
            </p>
            <p className="text-2xl font-black tracking-tight text-cyan-300">
              {completion}%
            </p>
          </div>
        </div>

        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500 transition-all duration-500"
            style={{ width: `${completion}%` }}
          />
        </div>

        <p className="mt-2 text-sm text-slate-300">
          <span className="font-semibold text-white">{ownedCount}</span> /
          <span className="font-semibold text-white"> {totalCount}</span> cartes
          possédées
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => {
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
    </section>
  );
}
