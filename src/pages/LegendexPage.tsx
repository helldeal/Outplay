import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { rarityRank } from "../lib/rarity";
import { supabase } from "../lib/supabase";
import type { Rarity, Series } from "../types";

interface LegendexCard {
  id: string;
  name: string;
  rarity: Rarity;
  imageUrl: string;
  pc_value: number;
  series_id: string;
}

export function LegendexPage() {
  const { user } = useAuth();
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>("");

  const seriesQuery = useQuery({
    queryKey: ["legendex-series"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("series")
        .select("id, name, slug, code")
        .order("name");
      if (error) {
        throw error;
      }
      return (data ?? []) as Series[];
    },
  });

  useEffect(() => {
    if (!selectedSeriesId && seriesQuery.data && seriesQuery.data.length > 0) {
      setSelectedSeriesId(seriesQuery.data[0].id);
    }
  }, [selectedSeriesId, seriesQuery.data]);

  const cardsQuery = useQuery({
    queryKey: ["legendex-cards", selectedSeriesId],
    enabled: Boolean(selectedSeriesId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("id, name, rarity, imageUrl, pc_value, series_id")
        .eq("series_id", selectedSeriesId);

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as LegendexCard[];
      return rows.sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity));
    },
  });

  const ownedQuery = useQuery({
    queryKey: ["legendex-owned", user?.id, selectedSeriesId],
    enabled: Boolean(user && selectedSeriesId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_cards")
        .select("card_id, card:cards!inner(series_id)")
        .eq("card.series_id", selectedSeriesId);

      if (error) {
        throw error;
      }

      return new Set((data ?? []).map((entry) => entry.card_id as string));
    },
  });

  const cards = cardsQuery.data ?? [];
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
        <h1 className="text-2xl font-semibold text-white">Legendex</h1>
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

        <span className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200">
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
                  {isOwned ? card.name : "Unknown Card"}
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
