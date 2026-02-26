import { useEffect, useMemo, useState } from "react";
import { BookMarked, Gauge } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
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
  const owned = ownedQuery.data ?? new Set<string>();

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
          return (
            <article
              key={card.id}
              className={`overflow-hidden rounded-lg border ${isOwned ? "border-slate-700 bg-slate-900" : "border-slate-800 bg-slate-950"}`}
            >
              <div className="aspect-[3/4] overflow-hidden bg-slate-900">
                <img
                  src={card.imageUrl}
                  alt={card.name}
                  className={`h-full w-full object-cover transition ${isOwned ? "opacity-100" : "grayscale opacity-30"}`}
                />
              </div>
              <div className="p-2 text-xs">
                <p className="line-clamp-1 font-medium text-slate-100">
                  {card.name}
                </p>
                <p className="text-slate-400">{card.rarity}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
