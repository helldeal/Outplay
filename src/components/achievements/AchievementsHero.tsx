import { Award, Crown } from "lucide-react";

export function AchievementsHero({
  claimableCount,
  unlocked,
  total,
  pct,
}: {
  claimableCount: number;
  unlocked: number;
  total: number;
  pct: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-200/40 bg-slate-900/80 p-6 shadow-[0_28px_90px_rgba(2,6,23,0.72)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(250,204,21,0.2),transparent_42%),radial-gradient(circle_at_85%_0%,rgba(59,130,246,0.2),transparent_34%),linear-gradient(120deg,rgba(251,191,36,0.16)_0%,transparent_42%,rgba(56,189,248,0.1)_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background:linear-gradient(115deg,transparent_0,transparent_35%,rgba(255,255,255,0.35)_50%,transparent_65%,transparent_100%)]" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 -bottom-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-1 rounded-full border border-amber-200/60 bg-amber-300/20 px-2.5 py-1 text-[10px] font-black tracking-[0.18em] uppercase text-amber-100">
            <Award className="h-3.5 w-3.5" />
            Hall of Fame
          </p>
          <h1 className="mt-2 text-2xl font-black uppercase italic text-white md:text-4xl">
            Achievements
          </h1>
          <p className="mt-1 text-sm text-slate-200/90">
            Debloque des objectifs, gagne des boosters et des PC bonus.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/50 bg-slate-950/40 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-amber-100">
              <Crown className="h-3.5 w-3.5" />
              {claimableCount} a claim
            </span>
          </div>
        </div>

        <div className="min-w-[220px] rounded-2xl border border-slate-600/70 bg-slate-950/75 px-4 py-3 text-right backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-300">
            Progression
          </p>
          <p className="mt-1 text-2xl font-black text-white">
            {unlocked}/{total}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 via-amber-200 to-cyan-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-xs font-semibold text-cyan-200">
            {pct}% complete
          </p>
        </div>
      </div>
    </div>
  );
}
