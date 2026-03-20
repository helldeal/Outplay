import {
  CheckCircle2,
  Crown,
  LoaderCircle,
  Lock,
  Sparkles,
  Target,
} from "lucide-react";
import { RewardTypeBadge } from "../rewards/reward-theme";
import type { AchievementProgressRow } from "../../query/achievements";

export interface AchievementGroup {
  category: string;
  entries: AchievementProgressRow[];
  unlockedCount: number;
}

export function AchievementCategorySection({
  group,
  categoryTone,
  claimingCode,
  onClaim,
}: {
  group: AchievementGroup;
  categoryTone: Record<string, string>;
  claimingCode: string | null;
  onClaim: (row: AchievementProgressRow) => void;
}) {
  return (
    <div
      key={group.category}
      className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${categoryTone[group.category] ?? "from-slate-500/15 via-transparent to-transparent"}`}
      />
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-200">
          {group.category}
        </h2>
        <span className="text-xs text-slate-400">
          {group.unlockedCount}/{group.entries.length}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {group.entries.map((row) => {
          const progressPct = row.unlocked
            ? 100
            : Math.max(0, Math.min(100, Math.floor(row.progress_pct)));
          const target = Math.max(0, Number(row.target_value ?? 0));
          const current = row.unlocked
            ? target
            : Math.max(0, Number(row.current_value ?? 0));
          const progressLabel = `${Math.round(Math.min(current, target) * 100) / 100}/${target}`;
          const rewardBadges = [] as Array<{
            key: string;
            rewardPc: number;
            rewardBoosterType:
              | AchievementProgressRow["reward_booster_type"]
              | undefined;
            label: string;
          }>;

          if (row.reward_pc > 0) {
            rewardBadges.push({
              key: `${row.achievement_id}-pc`,
              rewardPc: row.reward_pc,
              rewardBoosterType: undefined,
              label: `${row.reward_pc} PC`,
            });
          }

          if (row.reward_booster_type) {
            rewardBadges.push({
              key: `${row.achievement_id}-booster`,
              rewardPc: 0,
              rewardBoosterType: row.reward_booster_type,
              label: `${row.reward_booster_type} Booster`,
            });
          }

          if (row.reward_title) {
            rewardBadges.push({
              key: `${row.achievement_id}-title`,
              rewardPc: 0,
              rewardBoosterType: undefined,
              label: `Titre: ${row.reward_title}`,
            });
          }

          return (
            <article
              key={row.achievement_id}
              className={`relative overflow-hidden rounded-xl border p-3 transition ${
                row.unlocked
                  ? row.reward_claimed
                    ? "border-emerald-400/35 bg-emerald-500/10"
                    : "border-amber-300/45 bg-amber-500/10"
                  : "border-slate-800 bg-slate-950/75"
              }`}
            >
              {row.unlocked ? (
                <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
              ) : null}

              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {row.name}
                  </h3>
                  <p className="text-xs text-slate-400">{row.description}</p>
                </div>
                {row.can_claim_reward ? (
                  <button
                    type="button"
                    disabled={claimingCode === row.code}
                    onClick={() => onClaim(row)}
                    title="Réclamer la récompense"
                    className="group inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-300/70 bg-amber-300/20 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.28)] transition hover:scale-110 hover:bg-amber-300/30 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {claimingCode === row.code ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Crown className="h-4 w-4 animate-pulse transition group-hover:-rotate-6" />
                    )}
                  </button>
                ) : row.unlocked ? (
                  row.reward_claimed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                  ) : (
                    <Sparkles className="h-5 w-5 text-amber-300" />
                  )
                ) : (
                  <Lock className="h-5 w-5 text-slate-500" />
                )}
              </div>

              <div className="mb-2 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all ${
                    row.unlocked
                      ? row.reward_claimed
                        ? "bg-gradient-to-r from-emerald-300 to-emerald-500"
                        : "bg-gradient-to-r from-amber-300 to-amber-500"
                      : "bg-gradient-to-r from-cyan-300 to-blue-500"
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <Target className="h-3.5 w-3.5" />
                  {progressLabel}
                </span>
                <span className="text-[11px] font-semibold text-cyan-200">
                  {row.leaderboard_points} AP
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                {rewardBadges.map((badge) => (
                  <RewardTypeBadge
                    key={badge.key}
                    rewardPc={badge.rewardPc}
                    rewardBoosterType={badge.rewardBoosterType}
                    label={badge.label}
                    className="text-[11px] bg-transparent"
                  />
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
