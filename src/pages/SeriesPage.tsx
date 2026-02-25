import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Booster, Series } from "../types";

export function SeriesPage() {
  const { slug = "" } = useParams();

  const seriesQuery = useQuery({
    queryKey: ["series", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("series")
        .select("id, name, slug, code, coverImage")
        .or(`slug.eq.${slug},code.eq.${slug}`)
        .single();

      if (error) {
        throw error;
      }

      return data as Series;
    },
  });

  const boostersQuery = useQuery({
    queryKey: ["series-boosters", seriesQuery.data?.id],
    enabled: Boolean(seriesQuery.data?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boosters")
        .select("id, name, type, price_pc, image_url, is_daily_only")
        .eq("series_id", seriesQuery.data!.id)
        .order("price_pc", { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []) as Booster[];
    },
  });

  if (seriesQuery.isLoading) {
    return <p className="text-sm text-slate-400">Chargement de la série...</p>;
  }

  if (seriesQuery.error) {
    return (
      <p className="text-sm text-rose-300">
        {(seriesQuery.error as Error).message}
      </p>
    );
  }

  const series = seriesQuery.data;
  if (!series) {
    return <p className="text-sm text-slate-400">Série introuvable.</p>;
  }

  const boosters = boostersQuery.data ?? [];

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
        {series.coverImage ? (
          <img
            src={series.coverImage}
            alt={series.name}
            className="h-52 w-full object-cover"
          />
        ) : (
          <div className="h-24 bg-slate-800" />
        )}
        <div className="space-y-2 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">
            Series {series.code}
          </p>
          <h1 className="text-2xl font-semibold">{series.name}</h1>
          <Link
            to={`/booster/${series.slug}`}
            className="inline-block rounded-md bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400"
          >
            Ouvrir un booster
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {boosters.map((booster) => (
          <div
            key={booster.id}
            className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"
          >
            <img
              src={booster.image_url}
              alt={booster.name}
              className="h-28 w-full rounded-md object-cover"
            />
            <h2 className="mt-3 text-lg font-semibold text-white">
              {booster.name}
            </h2>
            <p className="text-sm text-slate-400">{booster.type}</p>
            <p className="mt-1 text-sm text-amber-300">{booster.price_pc} PC</p>
            {booster.is_daily_only ? (
              <p className="mt-1 text-xs text-slate-500">Daily only</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
