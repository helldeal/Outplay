import { useEffect, useMemo, useState } from "react";
import { BookMarked, Gauge } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { CardTile } from "../components/CardTile";
import {
  useLegendexCardsQuery,
  useLegendexOwnedCardsQuery,
  useLegendexSeriesQuery,
} from "../query/legendex";

export function LegendexPage() {
  const { user } = useAuth();
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>("");
  const seriesQuery = useLegendexSeriesQuery();

  useEffect(() => {
    if (!selectedSeriesId && seriesQuery.data && seriesQuery.data.length > 0) {
      setSelectedSeriesId(seriesQuery.data[0].id);
    }
  }, [selectedSeriesId, seriesQuery.data]);

  const cardsQuery = useLegendexCardsQuery(selectedSeriesId);
  const ownedQuery = useLegendexOwnedCardsQuery(user?.id, selectedSeriesId);

  const cards = cardsQuery.data?.sort((a, b) => b.id.localeCompare(a.id)) ?? [];
  const ownedData = ownedQuery.data;
  const owned = ownedData instanceof Map ? ownedData : new Map<string, string>();

  const completion = useMemo(() => {
    if (cards.length === 0) {
      return 0;
    }
    const ownedCount = cards.filter((card) => owned.has(card.id)).length;
    return Math.round((ownedCount / cards.length) * 100);
  }, [cards, owned]);

  return (
    <section className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
          <BookMarked className="h-6 w-6 text-cyan-300" />
          Legendex
        </h1>
        <p className="text-sm text-slate-400">
          Index des cartes avec visibilité de la progression par série.
        </p>
      </div>

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

        <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200">
          <Gauge className="h-4 w-4" />
          {completion}% completion
        </span>
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
