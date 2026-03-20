import type { ReactNode } from "react";

const scoreFormatter = new Intl.NumberFormat("fr-FR");

function toSafeInt(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.round(value));
}

export function ScoreBreakdownTooltip({
  totalScore,
  cardScore,
  achievementScore,
  children,
  className,
  tooltipPositionClassName,
}: {
  totalScore: number;
  cardScore: number;
  achievementScore: number;
  children: ReactNode;
  className?: string;
  tooltipPositionClassName?: string;
}) {
  const safeTotal = toSafeInt(totalScore);
  const safeCardScore = toSafeInt(cardScore);
  const safeAchievementScore = toSafeInt(achievementScore);
  const computedTotal = safeCardScore + safeAchievementScore;
  const adjustment = safeTotal - computedTotal;

  return (
    <div className={`group ${className ?? ""}`.trim()}>
      {children}

      <div
        className={`pointer-events-none absolute z-20 mt-2 min-w-[220px] rounded-xl border border-slate-700/90 bg-slate-950/95 p-3 text-left opacity-0 shadow-[0_10px_32px_rgba(2,6,23,0.6)] transition duration-150 group-hover:opacity-100 group-focus-within:opacity-100 ${
          tooltipPositionClassName ?? "left-1/2 top-full -translate-x-1/2"
        }`}
        role="tooltip"
      >
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-200">
          Calcul du score
        </p>
        <div className="mt-2 space-y-1 text-xs">
          <div className="flex items-center justify-between gap-3 text-slate-300">
            <span>Points cartes</span>
            <span className="font-black text-white">
              {scoreFormatter.format(safeCardScore)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 text-slate-300">
            <span>Points achievements</span>
            <span className="font-black text-amber-300">
              {scoreFormatter.format(safeAchievementScore)}
            </span>
          </div>
          {adjustment !== 0 ? (
            <div className="flex items-center justify-between gap-3 text-slate-400">
              <span>Ajustement</span>
              <span className="font-black text-slate-200">
                {scoreFormatter.format(adjustment)}
              </span>
            </div>
          ) : null}
          <div className="my-1 h-px bg-slate-800" />
          <div className="flex items-center justify-between gap-3 text-slate-200">
            <span>Total</span>
            <span className="font-black text-cyan-200">
              {scoreFormatter.format(safeTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
