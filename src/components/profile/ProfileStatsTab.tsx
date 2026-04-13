import {
  BarChart3,
  Dices,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { PublicProfileOverview } from "../../query/profile";
import { rarityLabel, rarityTextColor } from "../../utils/rarity";

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
  radarStats,
}: {
  overview: PublicProfileOverview;
  intFormatter: Intl.NumberFormat;
  radarStats: {
    player: {
      duplicateRate: number;
      bigPullRate: number;
      avgPcGained: number;
      avgPcSpent: number;
      valueScoreRatio: number;
      avgBoosterOpeningsPerDay: number;
      avgBoosterProfitability: number;
    };
    average: {
      duplicateRate: number;
      bigPullRate: number;
      avgPcGained: number;
      avgPcSpent: number;
      valueScoreRatio: number;
      avgBoosterOpeningsPerDay: number;
      avgBoosterProfitability: number;
    };
    max: {
      duplicateRate: number;
      bigPullRate: number;
      avgPcGained: number;
      avgPcSpent: number;
      valueScoreRatio: number;
      avgBoosterOpeningsPerDay: number;
      avgBoosterProfitability: number;
    };
    min: {
      duplicateRate: number;
      bigPullRate: number;
      avgPcGained: number;
      avgPcSpent: number;
      valueScoreRatio: number;
      avgBoosterOpeningsPerDay: number;
      avgBoosterProfitability: number;
    };
  };
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

  const radarAxes = [
    {
      key: "duplicateRate",
      label: "% Doublons",
      player: Math.max(0, radarStats.player.duplicateRate),
      average: Math.max(0, radarStats.average.duplicateRate),
      max: Math.max(1, radarStats.max.duplicateRate),
      min: Math.max(0, radarStats.min.duplicateRate),
    },
    {
      key: "bigPullRate",
      label: "% Gros pull",
      player: Math.max(0, radarStats.player.bigPullRate),
      average: Math.max(0, radarStats.average.bigPullRate),
      max: Math.max(1, radarStats.max.bigPullRate),
      min: Math.max(0, radarStats.min.bigPullRate),
    },
    {
      key: "avgPcGained",
      label: "PC gagnés moyen",
      player: Math.max(0, radarStats.player.avgPcGained),
      average: Math.max(0, radarStats.average.avgPcGained),
      max: Math.max(1, radarStats.max.avgPcGained),
      min: Math.max(0, radarStats.min.avgPcGained),
    },
    {
      key: "avgPcSpent",
      label: "PC dépensés moyen",
      player: Math.max(0, radarStats.player.avgPcSpent),
      average: Math.max(0, radarStats.average.avgPcSpent),
      max: Math.max(1, radarStats.max.avgPcSpent),
      min: Math.max(0, radarStats.min.avgPcSpent),
    },
    {
      key: "valueScoreRatio",
      label: "Ratio score / valeur",
      player: Math.max(0, radarStats.player.valueScoreRatio),
      average: Math.max(0, radarStats.average.valueScoreRatio),
      max: Math.max(1, radarStats.max.valueScoreRatio),
      min: Math.max(0, radarStats.min.valueScoreRatio),
    },
    {
      key: "avgBoosterOpeningsPerDay",
      label: "Ouvertures / jour",
      player: Math.max(0, radarStats.player.avgBoosterOpeningsPerDay),
      average: Math.max(0, radarStats.average.avgBoosterOpeningsPerDay),
      max: Math.max(1, radarStats.max.avgBoosterOpeningsPerDay),
      min: Math.max(0, radarStats.min.avgBoosterOpeningsPerDay),
    },
    {
      key: "avgBoosterProfitability",
      label: "Rentabilité boosters",
      player: Math.max(0, radarStats.player.avgBoosterProfitability),
      average: Math.max(0, radarStats.average.avgBoosterProfitability),
      max: Math.max(1, radarStats.max.avgBoosterProfitability),
      min: Math.max(0, radarStats.min.avgBoosterProfitability),
    },
  ] as const;

  const radarSize = 360;
  const center = radarSize / 2;
  const outerRadius = 116;

  const axisPoints = radarAxes.map((axis, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / radarAxes.length;
    const axisMin = Math.min(axis.min, axis.max);
    const axisMax = Math.max(axis.max, axisMin);
    const span = axisMax - axisMin;
    const normalize = (value: number) => {
      if (span <= 0) {
        return 1;
      }

      const normalized = (value - axisMin) / span;
      return Math.min(1, Math.max(0, normalized));
    };

    return {
      ...axis,
      angle,
      axisMin,
      axisMax,
      x: center + Math.cos(angle) * outerRadius,
      y: center + Math.sin(angle) * outerRadius,
      labelX: center + Math.cos(angle) * (outerRadius + 44),
      labelY: center + Math.sin(angle) * (outerRadius + 44),
      labelAnchor:
        Math.cos(angle) > 0.35
          ? ("start" as const)
          : Math.cos(angle) < -0.35
            ? ("end" as const)
            : ("middle" as const),
      playerNorm: normalize(axis.player),
      averageNorm: normalize(axis.average),
    };
  });

  const formatRadarAxisValue = (
    axisKey: (typeof radarAxes)[number]["key"],
    value: number,
  ) => {
    if (axisKey === "duplicateRate" || axisKey === "bigPullRate") {
      return formatPercent2(value);
    }
    if (axisKey === "valueScoreRatio") {
      return value.toFixed(3);
    }
    if (
      axisKey === "avgBoosterOpeningsPerDay" ||
      axisKey === "avgBoosterProfitability"
    ) {
      return value.toFixed(2);
    }
    return intFormatter.format(Math.round(value));
  };

  const toPolygon = (values: number[]) =>
    values
      .map((value, index) => {
        const point = axisPoints[index];
        const x = center + Math.cos(point.angle) * outerRadius * value;
        const y = center + Math.sin(point.angle) * outerRadius * value;
        return `${x},${y}`;
      })
      .join(" ");

  const playerPolygon = toPolygon(axisPoints.map((point) => point.playerNorm));
  const averagePolygon = toPolygon(
    axisPoints.map((point) => point.averageNorm),
  );

  const playerDots = axisPoints.map((point) => ({
    key: point.key,
    x: center + Math.cos(point.angle) * outerRadius * point.playerNorm,
    y: center + Math.sin(point.angle) * outerRadius * point.playerNorm,
  }));

  const averageDots = axisPoints.map((point) => ({
    key: point.key,
    x: center + Math.cos(point.angle) * outerRadius * point.averageNorm,
    y: center + Math.sin(point.angle) * outerRadius * point.averageNorm,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
        <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.11em] text-white">
          <Dices className="h-4 w-4 text-emerald-300" />
          Matrice de chance
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
              Béni
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
              title={`Joueur: ${formatPercent(playerDuplicateRate)} doublons / ${formatPercent(playerBigPullRate)} gros tirages`}
            />

            <div
              className="absolute z-10 flex h-4 w-4 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-amber-300 shadow-[0_0_16px_rgba(252,211,77,0.55)]"
              style={{
                left: `${Math.min(100, Math.max(0, averageMatrixX))}%`,
                bottom: `${Math.min(100, Math.max(0, averageMatrixY))}%`,
              }}
              title={`Moyenne: ${formatPercent(averageDuplicateRate)} doublons / ${formatPercent(averageBigPullRate)} gros tirages`}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 text-cyan-200">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
              Joueur ({formatPercent(playerDuplicateRate)} doublons /{" "}
              {formatPercent(playerBigPullRate)} gros tirages)
            </span>
            <span className="inline-flex items-center gap-1 text-amber-200">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              Moyenne ({formatPercent(averageDuplicateRate)} doublons /{" "}
              {formatPercent(averageBigPullRate)} gros tirages)
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
          Répartition des boosters
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
            <p className="text-slate-500">PC dépensés</p>
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
          Stats joueur
        </h2>

        <div className="mt-3 rounded-xl border border-slate-700/70 bg-slate-950/55 p-3">
          <div className="mx-auto w-full max-w-[500px] overflow-visible">
            <svg
              viewBox={`0 0 ${radarSize} ${radarSize}`}
              className="h-[360px] w-full overflow-visible"
            >
              <defs>
                <radialGradient id="radar-core" cx="50%" cy="50%" r="65%">
                  <stop offset="0%" stopColor="rgba(56,189,248,0.14)" />
                  <stop offset="100%" stopColor="rgba(15,23,42,0.05)" />
                </radialGradient>
              </defs>

              <circle
                cx={center}
                cy={center}
                r={outerRadius + 8}
                fill="url(#radar-core)"
              />

              {[0.25, 0.5, 0.75, 1].map((level) => (
                <polygon
                  key={level}
                  points={toPolygon(axisPoints.map(() => level))}
                  fill="none"
                  stroke="rgba(100,116,139,0.42)"
                  strokeWidth="1"
                />
              ))}

              {axisPoints.map((point) => (
                <line
                  key={`line-${point.key}`}
                  x1={center}
                  y1={center}
                  x2={point.x}
                  y2={point.y}
                  stroke="rgba(100,116,139,0.35)"
                  strokeWidth="1"
                />
              ))}

              <polygon
                points={averagePolygon}
                fill="rgba(251,191,36,0.2)"
                stroke="rgba(251,191,36,0.9)"
                strokeWidth="2"
              />
              <polygon
                points={playerPolygon}
                fill="rgba(34,211,238,0.2)"
                stroke="rgba(34,211,238,0.95)"
                strokeWidth="2"
              />

              {averageDots.map((dot) => (
                <circle
                  key={`avg-dot-${dot.key}`}
                  cx={dot.x}
                  cy={dot.y}
                  r="3.2"
                  fill="rgba(251,191,36,1)"
                  stroke="rgba(15,23,42,0.9)"
                  strokeWidth="1"
                />
              ))}

              {playerDots.map((dot) => (
                <circle
                  key={`player-dot-${dot.key}`}
                  cx={dot.x}
                  cy={dot.y}
                  r="3.2"
                  fill="rgba(34,211,238,1)"
                  stroke="rgba(15,23,42,0.9)"
                  strokeWidth="1"
                />
              ))}

              {axisPoints.map((point) => (
                <text
                  key={`label-${point.key}`}
                  x={point.labelX}
                  y={point.labelY}
                  textAnchor={point.labelAnchor}
                  dominantBaseline="middle"
                  fill="rgba(241,245,249,0.96)"
                  fontSize="11"
                  fontWeight="700"
                  style={{
                    paintOrder: "stroke",
                    stroke: "rgba(2,6,23,0.9)",
                    strokeWidth: 2,
                  }}
                >
                  <tspan x={point.labelX} dy="0">
                    {point.label}
                  </tspan>
                  <tspan
                    x={point.labelX}
                    dy="12"
                    fill="rgba(34,211,238,0.95)"
                    fontSize="9.5"
                  >
                    J {formatRadarAxisValue(point.key, point.player)}
                  </tspan>
                  <tspan
                    x={point.labelX}
                    dy="11"
                    fill="rgba(251,191,36,0.95)"
                    fontSize="9.5"
                  >
                    M {formatRadarAxisValue(point.key, point.average)}
                  </tspan>
                </text>
              ))}
            </svg>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 text-cyan-200">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
              Joueur
            </span>
            <span className="inline-flex items-center gap-1 text-amber-200">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              Moyenne
            </span>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
        <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.11em] text-white">
          <ScanSearch className="h-4 w-4 text-fuchsia-300" />
          Stats cartes
        </h2>

        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.1em] text-emerald-300">
              Top 5 meilleures cartes
            </p>
            {(overview.topBestScoreCards ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">Aucune donnée.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {(overview.topBestScoreCards ?? []).map((card) => (
                  <div
                    key={`best-${card.cardId}`}
                    className={`flex items-center gap-3 rounded-xl border bg-slate-950/55 p-2 border-slate-800`}
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
                    <p className="text-xs font-black text-emerald-300">
                      {intFormatter.format(card.scoreValue)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.1em] text-rose-300">
              Top 5 pires cartes
            </p>
            {(overview.topWorstScoreCards ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">Aucune donnée.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {(overview.topWorstScoreCards ?? []).map((card) => (
                  <div
                    key={`worst-${card.cardId}`}
                    className={`flex items-center gap-3 rounded-xl border bg-slate-950/55 p-2 border-slate-800`}
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
                    <p className="text-xs font-black text-rose-300">
                      {intFormatter.format(card.scoreValue)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
