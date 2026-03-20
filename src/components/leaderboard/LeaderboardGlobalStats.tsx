import { Coins, Package, PieChart, Sparkles } from "lucide-react";
import type { LeaderboardGlobalStats } from "../../query/leaderboard";
import { resolveAssetUrl } from "../../utils/asset-url";
import { rarityLabel, rarityTextColor } from "../../utils/rarity";

const percentFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function boosterTypeLabel(type: string): string {
  switch (type) {
    case "NORMAL":
      return "Normal";
    case "LUCK":
      return "Luck";
    case "PREMIUM":
      return "Premium";
    case "GODPACK":
      return "Godpack";
    default:
      return type;
  }
}

function boosterTypeTone(type: string): { bar: string; text: string } {
  switch (type) {
    case "NORMAL":
      return { bar: "bg-cyan-400", text: "text-cyan-300" };
    case "LUCK":
      return { bar: "bg-emerald-400", text: "text-emerald-300" };
    case "PREMIUM":
      return { bar: "bg-amber-400", text: "text-amber-300" };
    case "GODPACK":
      return { bar: "bg-fuchsia-400", text: "text-fuchsia-300" };
    default:
      return { bar: "bg-slate-400", text: "text-slate-300" };
  }
}

export function LeaderboardGlobalStats({
  stats,
  scoreFormatter,
}: {
  stats: LeaderboardGlobalStats;
  scoreFormatter: Intl.NumberFormat;
}) {
  const boosterOrder = ["NORMAL", "LUCK", "PREMIUM", "GODPACK"] as const;
  const distributionByType = new Map(
    stats.boosterDistribution.map((item) => [item.boosterType, item]),
  );
  const orderedBoosterDistribution = boosterOrder.map((type) => {
    const existing = distributionByType.get(type);
    return {
      boosterType: type,
      openingsCount: existing?.openingsCount ?? 0,
      share: existing?.share ?? 0,
    };
  });

  const maxBoosterOpenings = Math.max(
    1,
    ...orderedBoosterDistribution.map((item) => item.openingsCount),
  );

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/45 p-5 md:p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-cyan-300" />
        <h2 className="text-lg font-black uppercase italic text-white md:text-xl">
          Statistiques globales
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <article className="rounded-xl border border-slate-800 bg-slate-950/65 p-4">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            <Coins className="h-4 w-4 text-amber-300" />
            PC dépensés
          </p>
          <p className="mt-2 text-2xl font-black text-amber-300">
            {scoreFormatter.format(stats.totalPcSpent)}
          </p>
          <p className="text-xs text-slate-500">Achats de boosters (SHOP)</p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-950/65 p-4">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            <Package className="h-4 w-4 text-indigo-300" />
            Volume total de cartes
          </p>
          <p className="mt-2 text-2xl font-black text-indigo-300">
            {scoreFormatter.format(stats.totalCardsOpened)}
          </p>
          <p className="text-xs text-slate-500">
            {scoreFormatter.format(stats.totalOpenings)} ouvertures
          </p>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-800 bg-slate-950/65 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-300">
            <PieChart className="h-4 w-4 text-cyan-300" />
            Répartition des boosters
          </h3>

          {stats.boosterDistribution.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Aucune donnée.</p>
          ) : (
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="relative h-64 overflow-hidden rounded-lg border border-slate-800/80 bg-slate-900/70">
                <div className="absolute inset-0 grid grid-rows-4">
                  <div className="border-b border-slate-800/60" />
                  <div className="border-b border-slate-800/60" />
                  <div className="border-b border-slate-800/60" />
                  <div />
                </div>

                <div className="absolute inset-x-2 bottom-2 top-2 grid grid-cols-4 gap-2">
                  {orderedBoosterDistribution.map((item) => {
                    const tone = boosterTypeTone(item.boosterType);
                    const relativeHeight =
                      maxBoosterOpenings > 0
                        ? (item.openingsCount / maxBoosterOpenings) * 100
                        : 0;
                    const barHeight =
                      item.openingsCount === 0
                        ? 0
                        : Math.max(2, relativeHeight);

                    return (
                      <div
                        key={item.boosterType}
                        className="flex h-full items-end justify-center"
                      >
                        <div
                          className={`w-1/2 rounded-md ${tone.bar} shadow-[0_0_14px_rgba(15,23,42,0.35)]`}
                          style={{ height: `${barHeight}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                {orderedBoosterDistribution.map((item) => {
                  const tone = boosterTypeTone(item.boosterType);

                  return (
                    <div key={`${item.boosterType}-legend`}>
                      <p
                        className={`text-[10px] font-black uppercase ${tone.text}`}
                      >
                        {boosterTypeLabel(item.boosterType)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {scoreFormatter.format(item.openingsCount)} ·{" "}
                        {percentFormatter.format(item.share)}%
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-950/65 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-300">
            Cartes les plus tirées
          </h3>

          {stats.topDropCards.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Aucune donnée.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {stats.topDropCards.map((card) => {
                const imgSrc = resolveAssetUrl(card.cardImageUrl);
                return (
                  <li
                    key={card.cardId}
                    className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-2"
                  >
                    <div className="h-12 w-9 shrink-0 overflow-hidden rounded bg-black">
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={card.cardName}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-[10px] font-black uppercase tracking-wider ${rarityTextColor(card.cardRarity)}`}
                      >
                        {rarityLabel(card.cardRarity)}
                      </p>
                      <p className="truncate text-sm font-semibold text-white">
                        {card.cardName}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-cyan-300">
                      {scoreFormatter.format(card.dropsCount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </div>
    </section>
  );
}
