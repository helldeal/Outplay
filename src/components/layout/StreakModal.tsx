import {
  CheckCircle2,
  Crown,
  Flame,
  Lock,
  LoaderCircle,
  X,
} from "lucide-react";
import { RewardTypeBadge, resolveRewardTone } from "../rewards/reward-theme";
import type { LoginStreakStatus } from "../../query/booster";

const streakRewards = [
  { day: 1, label: "500 PC", rewardPc: 500, rewardBoosterType: null },
  { day: 2, label: "750 PC", rewardPc: 750, rewardBoosterType: null },
  {
    day: 3,
    label: "Normal Booster",
    rewardPc: 0,
    rewardBoosterType: "NORMAL" as const,
  },
  { day: 4, label: "1000 PC", rewardPc: 1000, rewardBoosterType: null },
  {
    day: 5,
    label: "Luck Booster",
    rewardPc: 0,
    rewardBoosterType: "LUCK" as const,
  },
  { day: 6, label: "1500 PC", rewardPc: 1500, rewardBoosterType: null },
  {
    day: 7,
    label: "Premium Booster",
    rewardPc: 0,
    rewardBoosterType: "PREMIUM" as const,
  },
];

export function StreakModal({
  isOpen,
  onClose,
  isClaiming,
  canClaim,
  onClaim,
  countdown,
  streakStatus,
  targetSeriesCode,
}: {
  isOpen: boolean;
  onClose: () => void;
  isClaiming: boolean;
  canClaim: boolean;
  onClaim: () => void;
  countdown: string;
  streakStatus: LoginStreakStatus | null | undefined;
  targetSeriesCode?: string;
}) {
  if (!isOpen) {
    return null;
  }

  const claimedDaysInCycle = streakStatus
    ? streakStatus.can_claim_today
      ? Math.max(0, streakStatus.next_day - 1)
      : Math.max(0, streakStatus.current_day)
    : 0;

  const claimableDay = streakStatus?.can_claim_today
    ? streakStatus.next_day
    : null;

  return (
    <div
      className="fixed inset-0 z-[10030] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
      onClick={() => {
        if (!isClaiming) {
          onClose();
        }
      }}
    >
      <section
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-amber-300/35 bg-slate-900/95 p-5 shadow-[0_28px_80px_rgba(2,6,23,0.7)]"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(251,191,36,0.2),transparent_35%),radial-gradient(circle_at_86%_0%,rgba(56,189,248,0.18),transparent_30%),linear-gradient(120deg,rgba(251,191,36,0.12),transparent_45%,rgba(56,189,248,0.1))]" />

        <div className="relative mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1 rounded-full border border-amber-200/55 bg-amber-300/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100">
              <Flame className="h-3.5 w-3.5" />
              Login Streak
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase italic text-white">
              7-Day Streak
            </h2>
            <p className="text-sm text-slate-300">
              Claim quotidien. Si tu rates un jour, le cycle reset.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isClaiming}
            className="rounded-md border border-slate-600 bg-slate-800/80 p-1.5 text-slate-300 transition hover:border-slate-400 hover:bg-slate-700 disabled:opacity-60"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {streakRewards.map((reward) => {
            const isClaimed = reward.day <= claimedDaysInCycle;
            const isCurrent = claimableDay === reward.day;
            const tone = resolveRewardTone({
              rewardPc: reward.rewardPc,
              rewardBoosterType: reward.rewardBoosterType,
            });

            return (
              <article
                key={reward.day}
                className={`rounded-xl border p-3 ${
                  isCurrent
                    ? tone.streakCurrentClass
                    : isClaimed
                      ? "border-emerald-400/35 bg-emerald-500/10"
                      : "border-slate-700 bg-slate-950/70"
                }`}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-200">
                    Day {reward.day}
                  </p>
                  {isCurrent ? (
                    <Crown className="h-4 w-4 text-amber-300" />
                  ) : isClaimed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  ) : (
                    <Lock className="h-4 w-4 text-slate-500" />
                  )}
                </div>
                <RewardTypeBadge
                  rewardPc={reward.rewardPc}
                  rewardBoosterType={reward.rewardBoosterType}
                  label={reward.label}
                  className="rounded-md border px-2 py-1 text-[11px]"
                />
              </article>
            );
          })}
        </div>

        <div className="relative mt-4 rounded-xl border border-slate-700/70 bg-slate-950/65 p-3">
          <p className="text-xs text-slate-300">
            Serie booster cible: {targetSeriesCode ?? "N/A"}
          </p>
          <p className="text-xs text-slate-400">
            {streakStatus?.can_claim_today
              ? `Jour actuel claimable: Day ${streakStatus.next_day}`
              : `Deja claim aujourd'hui. Prochain reset dans ${countdown}`}
          </p>
        </div>

        <div className="relative mt-4 flex justify-end">
          <button
            type="button"
            disabled={!canClaim}
            onClick={onClaim}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-300 to-amber-500 px-4 py-2 text-sm font-black text-slate-950 shadow-[0_10px_24px_rgba(251,191,36,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isClaiming ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Flame className="h-4 w-4" />
            )}
            {isClaiming
              ? "Claim..."
              : streakStatus?.can_claim_today
                ? `Claim Day ${streakStatus.next_day}`
                : `Disponible dans ${countdown}`}
          </button>
        </div>
      </section>
    </div>
  );
}
