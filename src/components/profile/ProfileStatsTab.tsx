import {
  BarChart3,
  Dices,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { PublicProfileOverview } from "../../query/profile";
import {
  rarityBorderColor,
  rarityLabel,
  rarityTextColor,
} from "../../utils/rarity";

const percentFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatPercent(value: number): string {
  return `${Math.max(0, Math.round(value * 10) / 10)}%`;
}

function formatPercent2(value: number): string {
  return `${percentFormatter.format(Math.max(0, value))}%`;
}

export function ProfileStatsTab({
  overview,
  intFormatter,
  rarityCards,
}: {
  overview: PublicProfileOverview;
  intFormatter: Intl.NumberFormat;
  rarityCards: Array<{ label: string; value: number; tone: string }>;
}) {
  const luckyPullRate = overview.bigPullRate;
  const playerDuplicateRate = Math.min(
    100,
    Math.max(0, overview.duplicateRate),
  );
  const playerBigPullRate = Math.min(100, Math.max(0, luckyPullRate));
  const averageDuplicateRate = Math.min(
    100,
    Math.max(0, overview.globalAvgDuplicateRate),
  );
  const averageBigPullRate = Math.min(
    100,
    Math.max(0, overview.globalAvgBigPullRate),
  );

  const duplicateDelta = playerDuplicateRate - averageDuplicateRate;
  const bigPullDelta = playerBigPullRate - averageBigPullRate;

  const matrixHalfSpanX = Math.min(
    50,
    Math.max(10, Math.ceil(Math.abs(duplicateDelta) / 5) * 5 + 5),
  );
  const matrixHalfSpanY = Math.min(
    50,
    Math.max(10, Math.ceil(Math.abs(bigPullDelta) / 5) * 5 + 5),
  );

  const playerMatrixX = 50 + (duplicateDelta / matrixHalfSpanX) * 50;
  const playerMatrixY = 50 + (bigPullDelta / matrixHalfSpanY) * 50;
  const averageMatrixX = 50;
  const averageMatrixY = 50;

  const totalBoosterOpenings =
    overview.normalOpenings +
    overview.luckOpenings +
    overview.premiumOpenings +
    overview.godpackOpenings;

  const boosterTypeShares = [
    { label: "Normal", value: overview.normalOpenings, color: "bg-cyan-300" },
    { label: "Luck", value: overview.luckOpenings, color: "bg-emerald-300" },
    {
      label: "Premium",
      value: overview.premiumOpenings,
      color: "bg-amber-300",
    },
    {
      label: "Godpack",
      value: overview.godpackOpenings,
      color: "bg-fuchsia-300",
    },
  ];

  const maxBoosterShareValue = Math.max(
    1,
    ...boosterTypeShares.map((entry) => entry.value),
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
        <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.11em] text-white">
          <Dices className="h-4 w-4 text-emerald-300" />
          Chance matrix
        </h2>
        <div className="mt-3 rounded-xl border border-slate-700/70 bg-slate-950/55 p-3">
          <div className="relative h-64 overflow-hidden rounded-lg border border-slate-800 bg-[radial-gradient(circle_at_18%_10%,rgba(16,185,129,0.12),transparent_35%),radial-gradient(circle_at_82%_85%,rgba(244,63,94,0.12),transparent_35%)]">
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
              <div className="border-r border-b border-slate-800/70" />
              <div className="border-b border-slate-800/70" />
              <div className="border-r border-slate-800/70" />
              <div />
            </div>

            <p className="absolute left-2 top-2 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-300/90">
              Beni
            </p>
            <p className="absolute right-2 top-2 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-300/90">
              Abondant
            </p>
            <p className="absolute left-2 bottom-2 text-[10px] font-bold uppercase tracking-[0.1em] text-cyan-300/90">
              Discret
            </p>
            <p className="absolute right-2 bottom-2 text-[10px] font-bold uppercase tracking-[0.1em] text-rose-300/90">
              Poissard
            </p>

            <div
              className="absolute z-10 flex h-4 w-4 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.55)]"
              style={{
                left: `${Math.min(100, Math.max(0, playerMatrixX))}%`,
                bottom: `${Math.min(100, Math.max(0, playerMatrixY))}%`,
              }}
              title={`Joueur: ${formatPercent(playerDuplicateRate)} doublons / ${formatPercent(playerBigPullRate)} gros pull`}
            />

            <div
              className="absolute z-10 flex h-4 w-4 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-amber-300 shadow-[0_0_16px_rgba(252,211,77,0.55)]"
              style={{
                left: `${Math.min(100, Math.max(0, averageMatrixX))}%`,
                bottom: `${Math.min(100, Math.max(0, averageMatrixY))}%`,
              }}
              title={`Moyenne: ${formatPercent(averageDuplicateRate)} doublons / ${formatPercent(averageBigPullRate)} gros pull`}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 text-cyan-200">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
              Joueur ({formatPercent(playerDuplicateRate)} doublons /{" "}
              {formatPercent(playerBigPullRate)} gros pull)
            </span>
            <span className="inline-flex items-center gap-1 text-amber-200">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              Moyenne ({formatPercent(averageDuplicateRate)} doublons /{" "}
              {formatPercent(averageBigPullRate)} gros pull)
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-cyan-300/30 bg-cyan-400/10 p-3 text-xs text-cyan-100">
          <p className="inline-flex items-center gap-1 font-bold uppercase tracking-[0.1em]">
            <Sparkles className="h-3.5 w-3.5" />
            Lecture chance
          </p>
          <p className="mt-1 text-cyan-50/90">
            Un profil est plus chanceux quand son taux de gros pulls est
            au-dessus de la moyenne, avec un taux de doublons plus bas.
          </p>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
        <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.11em] text-white">
          <BarChart3 className="h-4 w-4 text-cyan-300" />
          Distribution boosters
        </h2>

        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <div className="relative h-64 overflow-hidden rounded-lg border border-slate-800/80 bg-slate-900/70">
            <div className="absolute inset-0 grid grid-rows-4">
              <div className="border-b border-slate-800/60" />
              <div className="border-b border-slate-800/60" />
              <div className="border-b border-slate-800/60" />
              <div />
            </div>

            <div className="absolute inset-x-2 bottom-2 top-2 grid grid-cols-4 gap-2">
              {boosterTypeShares.map((entry) => {
                const relativeHeight =
                  maxBoosterShareValue > 0
                    ? (entry.value / maxBoosterShareValue) * 100
                    : 0;
                const barHeight =
                  entry.value === 0 ? 0 : Math.max(2, relativeHeight);

                return (
                  <div
                    key={entry.label}
                    className="flex h-full items-end justify-center"
                  >
                    <div
                      className={`w-1/2 rounded-md ${entry.color} shadow-[0_0_14px_rgba(15,23,42,0.35)]`}
                      style={{ height: `${barHeight}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-2 grid grid-cols-4 gap-2 text-center">
            {boosterTypeShares.map((entry) => {
              const pct =
                totalBoosterOpenings > 0
                  ? (entry.value / totalBoosterOpenings) * 100
                  : 0;

              return (
                <div key={`${entry.label}-legend`}>
                  <div className="text-[10px] font-bold uppercase text-slate-300">
                    {entry.label}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {intFormatter.format(entry.value)} · {formatPercent2(pct)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-slate-700/70 bg-slate-950/55 p-2 text-slate-300">
            <p className="text-slate-500">PC depense</p>
            <p className="mt-0.5 font-black text-amber-300">
              {intFormatter.format(overview.totalPcSpent)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-700/70 bg-slate-950/55 p-2 text-slate-300">
            <p className="text-slate-500">Nombre d&apos;ouvertures</p>
            <p className="mt-0.5 font-black text-fuchsia-300">
              {intFormatter.format(overview.totalOpenings)}
            </p>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
        <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.11em] text-white">
          <ShieldCheck className="h-4 w-4 text-amber-300" />
          Stats cartes
        </h2>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {rarityCards.map((entry) => (
            <div
              key={entry.label}
              className="rounded-xl border border-slate-700/70 bg-slate-950/55 p-2"
            >
              <p className={`text-xs font-semibold ${entry.tone}`}>
                {entry.label}
              </p>
              <p className="mt-1 text-xl font-black text-white">
                {intFormatter.format(entry.value)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2 text-sm text-slate-300">
          <p>
            Jeu favori:
            <span className="ml-2 font-semibold text-cyan-200">
              {overview.favoriteGame ?? "N/A"}
            </span>
          </p>
          <p>
            Valeur moyenne recuperee par ouverture:
            <span className="ml-2 font-black text-cyan-200">
              {intFormatter.format(Math.round(overview.avgPcGained))} PC
            </span>
          </p>
          <p>
            Meilleure carte obtenue:
            <span className="ml-2 font-semibold text-white">
              {overview.bestCardName ?? "N/A"}
            </span>
            {overview.bestCardRarity ? (
              <span
                className={`ml-2 text-xs font-bold ${rarityTextColor(overview.bestCardRarity)}`}
              >
                {rarityLabel(overview.bestCardRarity)}
              </span>
            ) : null}
          </p>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
        <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.11em] text-white">
          <ScanSearch className="h-4 w-4 text-fuchsia-300" />
          Top drop cards
        </h2>

        {(overview.topDropCards ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">Aucune data de drops.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {(overview.topDropCards ?? []).map((card) => (
              <div
                key={card.cardId}
                className={`flex items-center gap-3 rounded-xl border bg-slate-950/55 p-2 ${rarityBorderColor(
                  card.cardRarity,
                )}`}
              >
                <div className="h-12 w-9 shrink-0 overflow-hidden rounded bg-black">
                  {card.cardImageUrl ? (
                    <img
                      src={card.cardImageUrl}
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
                <p className="text-xs font-black text-fuchsia-300">
                  x{intFormatter.format(card.dropsCount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
