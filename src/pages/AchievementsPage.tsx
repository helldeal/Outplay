import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, CheckCircle2, Lock, Sparkles, Target } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { PageLoading } from "../components/PageLoading";
import {
  claimAchievementRewardRpc,
  markAchievementsSeenRpc,
  useAchievementsProgressQuery,
  type AchievementProgressRow,
} from "../query/achievements";
import {
  computeDuplicateIndices,
  fetchCardsByIds,
  getOwnedCardIds,
} from "../query/booster";

const categoryOrder = [
  "Collection",
  "Rarete",
  "Booster",
  "Chance",
  "Economy",
  "Activite",
  "Serie",
  "Esport",
] as const;

function categoryLabel(category: string): string {
  return category;
}

function sortByCategory(a: string, b: string): number {
  const aIndex = categoryOrder.indexOf(a as (typeof categoryOrder)[number]);
  const bIndex = categoryOrder.indexOf(b as (typeof categoryOrder)[number]);

  if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
  if (aIndex === -1) return 1;
  if (bIndex === -1) return -1;
  return aIndex - bIndex;
}

function clampedPct(value: number): number {
  return Math.max(0, Math.min(100, Math.floor(value)));
}

function formatProgress(row: AchievementProgressRow): string {
  const target = Math.max(0, Number(row.target_value ?? 0));
  const current = Math.max(0, Number(row.current_value ?? 0));
  if (target <= 1) {
    return row.unlocked ? "Valide" : "En cours";
  }
  return `${Math.round(Math.min(current, target))}/${target}`;
}

export function AchievementsPage() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const progressQuery = useAchievementsProgressQuery(user?.id);
  const [claimingCode, setClaimingCode] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !progressQuery.data) {
      return;
    }

    void markAchievementsSeenRpc(user.id)
      .then(() =>
        Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["achievements-unseen-count", user.id],
          }),
          queryClient.invalidateQueries({
            queryKey: ["achievements-progress", user.id],
          }),
        ]),
      )
      .catch(() => undefined);
  }, [progressQuery.data, queryClient, user?.id]);

  const groups = useMemo(() => {
    const rows = progressQuery.data ?? [];
    const byCategory = new Map<string, AchievementProgressRow[]>();

    for (const row of rows) {
      const bucket = byCategory.get(row.category) ?? [];
      bucket.push(row);
      byCategory.set(row.category, bucket);
    }

    return Array.from(byCategory.entries())
      .sort(([a], [b]) => sortByCategory(a, b))
      .map(([category, entries]) => ({
        category,
        entries,
        unlockedCount: entries.filter((entry) => entry.unlocked).length,
      }));
  }, [progressQuery.data]);

  const summary = useMemo(() => {
    const rows = progressQuery.data ?? [];
    const total = rows.length;
    const unlocked = rows.filter((row) => row.unlocked).length;
    const pct = total === 0 ? 0 : Math.floor((unlocked / total) * 100);

    return { total, unlocked, pct };
  }, [progressQuery.data]);

  const claimAchievement = async (row: AchievementProgressRow) => {
    if (!user || !row.can_claim_reward || claimingCode) {
      return;
    }

    setClaimingCode(row.code);
    try {
      const ownedBefore = await getOwnedCardIds(user.id);
      const result = await claimAchievementRewardRpc(user.id, row.code);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["achievements-progress", user.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["achievements-unseen-count", user.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["achievements-notifications", user.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["collection", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
      ]);

      await refreshProfile();

      if (!result.opening) {
        return;
      }

      const cardIds = result.opening.cards ?? [];
      const openedCards = await fetchCardsByIds(cardIds);
      const duplicateCardIndices = computeDuplicateIndices(cardIds, ownedBefore);

      navigate("/booster-opening", {
        state: {
          openedCards,
          duplicateCardIndices,
          pcGained: result.opening.pcGained ?? 0,
          chargedPc: result.opening.chargedPc ?? 0,
          boosterName: `${row.name} Reward`,
        },
      });
    } finally {
      setClaimingCode(null);
    }
  };

  if (progressQuery.isLoading) {
    return (
      <PageLoading
        title="Achievements"
        subtitle="Chargement de ta progression..."
      />
    );
  }

  if (progressQuery.isError) {
    return (
      <section className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5 text-red-100">
        Impossible de charger les achievements.
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-amber-300/30 bg-slate-900/70 p-6">
        <div className="pointer-events-none absolute -right-16 -top-14 h-44 w-44 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/10 px-2.5 py-1 text-[10px] font-black tracking-[0.16em] uppercase text-amber-200">
              <Award className="h-3.5 w-3.5" />
              Hall of Fame
            </p>
            <h1 className="mt-2 text-2xl font-black uppercase italic text-white md:text-3xl">
              Achievements
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Debloque des objectifs, gagne des boosters et des PC bonus.
            </p>
          </div>

          <div className="min-w-[180px] rounded-2xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
              Progression
            </p>
            <p className="mt-1 text-xl font-black text-white">
              {summary.unlocked}/{summary.total}
            </p>
            <p className="text-xs text-cyan-300">{summary.pct}% complete</p>
          </div>
        </div>
      </div>

      {groups.map((group) => (
        <div
          key={group.category}
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-200">
              {categoryLabel(group.category)}
            </h2>
            <span className="text-xs text-slate-400">
              {group.unlockedCount}/{group.entries.length}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {group.entries.map((row) => {
              const progressPct = clampedPct(row.progress_pct);

              return (
                <article
                  key={row.achievement_id}
                  className={`rounded-xl border p-3 transition ${
                    row.unlocked
                      ? "border-emerald-400/35 bg-emerald-500/10"
                      : "border-slate-800 bg-slate-950/70"
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {row.name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {row.description}
                      </p>
                    </div>
                    {row.unlocked ? (
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
                          ? "bg-gradient-to-r from-emerald-300 to-emerald-500"
                          : "bg-gradient-to-r from-cyan-300 to-blue-500"
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Target className="h-3.5 w-3.5" />
                      {formatProgress(row)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-amber-300">
                      <Sparkles className="h-3.5 w-3.5" />
                      {row.reward_label}
                    </span>
                  </div>

                  {row.can_claim_reward ? (
                    <button
                      type="button"
                      disabled={claimingCode === row.code}
                      onClick={() => {
                        void claimAchievement(row);
                      }}
                      className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-amber-400 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {claimingCode === row.code ? "Claim..." : "Claim Reward"}
                    </button>
                  ) : row.reward_claimed ? (
                    <div className="mt-3 rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-200">
                      Reward claimed
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
