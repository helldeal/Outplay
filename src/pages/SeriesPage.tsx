import { CalendarClock, Gift, LoaderCircle, Sparkles } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useSeriesBoostersQuery, useSeriesBySlugQuery } from "../query/series";

export function SeriesPage() {
  const { slug = "" } = useParams();
  const seriesQuery = useSeriesBySlugQuery(slug);
  const boostersQuery = useSeriesBoostersQuery(seriesQuery.data?.id);

  if (seriesQuery.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-400">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Chargement de la série...
      </p>
    );
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
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Sparkles className="h-6 w-6 text-cyan-300" />
            {series.name}
          </h1>
          <Link
            to={`/booster/${series.slug}`}
            className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400"
          >
            <Gift className="h-4 w-4" />
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
              src={booster.image_url ?? series.coverImage ?? ""}
              alt={booster.name}
              className="h-28 w-full rounded-md object-cover"
            />
            <h2 className="mt-3 text-lg font-semibold text-white">
              {booster.name}
            </h2>
            <p className="text-sm text-slate-400">{booster.type}</p>
            <p className="mt-1 text-sm text-amber-300">{booster.price_pc} PC</p>
            {booster.is_daily_only ? (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                <CalendarClock className="h-3.5 w-3.5" />
                Daily only
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
