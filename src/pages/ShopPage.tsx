import { LoaderCircle, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useSeriesListQuery } from "../query/series";

export function ShopPage() {
  const seriesQuery = useSeriesListQuery();

  if (seriesQuery.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-400">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Chargement de la boutique...
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

  const seriesList = seriesQuery.data ?? [];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
          <ShoppingBag className="h-6 w-6 text-cyan-300" />
          Boutique
        </h1>
        <p className="text-sm text-slate-400">
          Sélectionne une série pour voir les boosters shop et daily.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {seriesList.map((series) => (
          <Link
            key={series.id}
            to={`/series/${series.slug}`}
            className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 transition hover:border-slate-600"
          >
            {series.coverImage ? (
              <img
                src={series.coverImage}
                alt={series.name}
                className="h-36 w-full object-cover"
              />
            ) : (
              <div className="h-20 bg-slate-800" />
            )}
            <div className="space-y-1 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">
                Series {series.code}
              </p>
              <h2 className="text-lg font-semibold text-white">
                {series.name}
              </h2>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
