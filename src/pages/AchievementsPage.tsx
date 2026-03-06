import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { AchievementCategorySection } from "../components/achievements/AchievementCategorySection";
import { AchievementsHero } from "../components/achievements/AchievementsHero";
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

const achievementCodeOrder = [
  "FIRST_CARD",
  "COLLECTOR_I",
  "COLLECTOR_II",
  "COLLECTOR_III",
  "COLLECTOR_IV",
  "COMPLETIONIST",
  "ARCHIVIST",
  "CHALLENGER_RISING",
  "CHALLENGER_ELITE",
  "CHAMPION_RISING",
  "CHAMPION_ELITE",
  "WORLD_CLASS",
  "WORLD_CLASS_ELITE",
  "LEGEND_HUNTER",
  "LEGEND_COLLECTOR",
  "LEGEND_ARCHIVE",
  "PACK_OPENER_I",
  "PACK_OPENER_II",
  "PACK_OPENER_III",
  "PACK_OPENER_IV",
  "PACK_MANIAC",
  "LUCKY_PULL",
  "INSANE_LUCK",
  "LEGENDARY_MOMENT",
  "GOD_OF_LUCK",
  "FIRST_DUPLICATE",
  "SCRAP_DEALER",
  "PC_COLLECTOR",
  "PC_INVESTOR",
  "PC_TYCOON",
  "DAILY_PLAYER",
  "DEDICATED_FAN",
  "LOYAL_COLLECTOR",
  "ESPORT_ADDICT",
  "SERIES_STARTER",
  "SERIES_CHALLENGER",
  "SERIES_CHAMPION",
  "SERIES_LEGEND",
  "LEC_COLLECTOR",
  "GLOBAL_TALENT",
  "TEAM_BUILDER",
  "ROLE_MASTER",
] as const;

const achievementOrderIndex = new Map<string, number>(
  achievementCodeOrder.map((code, index) => [code, index]),
);

const categoryTone: Record<string, string> = {
  Collection: "from-cyan-400/30 via-cyan-300/10 to-transparent",
  Rarete: "from-fuchsia-400/30 via-fuchsia-300/10 to-transparent",
  Booster: "from-amber-400/30 via-amber-300/10 to-transparent",
  Chance: "from-violet-400/30 via-violet-300/10 to-transparent",
  Economy: "from-emerald-400/30 via-emerald-300/10 to-transparent",
  Activite: "from-orange-400/30 via-orange-300/10 to-transparent",
  Serie: "from-sky-400/30 via-sky-300/10 to-transparent",
  Esport: "from-rose-400/30 via-rose-300/10 to-transparent",
};

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
        entries: [...entries].sort((a, b) => {
          const aOrder =
            achievementOrderIndex.get(a.code) ?? Number.MAX_SAFE_INTEGER;
          const bOrder =
            achievementOrderIndex.get(b.code) ?? Number.MAX_SAFE_INTEGER;

          if (aOrder !== bOrder) {
            return aOrder - bOrder;
          }

          if (a.target_value !== b.target_value) {
            return a.target_value - b.target_value;
          }

          return a.name.localeCompare(b.name);
        }),
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

  const claimableCount = useMemo(
    () =>
      (progressQuery.data ?? []).filter((row) => row.can_claim_reward).length,
    [progressQuery.data],
  );

  const claimAchievement = async (row: AchievementProgressRow) => {
    if (!user || !row.can_claim_reward || claimingCode) {
      return;
    }

    setClaimingCode(row.code);
    try {
      const ownedBefore = await getOwnedCardIds(user.id);
      const result = await claimAchievementRewardRpc(user.id, row.code);

      const syncPostClaim = () =>
        Promise.all([
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
          refreshProfile(),
        ]);

      if (!result.opening) {
        await syncPostClaim();
        return;
      }

      const cardIds = result.opening.cards ?? [];
      const openedCards = await fetchCardsByIds(cardIds);
      const duplicateCardIndices = computeDuplicateIndices(
        cardIds,
        ownedBefore,
      );

      navigate("/booster-opening", {
        state: {
          openedCards,
          duplicateCardIndices,
          pcGained: result.opening.pcGained ?? 0,
          chargedPc: result.opening.chargedPc ?? 0,
          boosterName: `${row.name} Reward`,
        },
      });

      void syncPostClaim().catch(() => undefined);
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
      <AchievementsHero
        claimableCount={claimableCount}
        unlocked={summary.unlocked}
        total={summary.total}
        pct={summary.pct}
      />

      {groups.map((group) => (
        <AchievementCategorySection
          key={group.category}
          group={{
            category: categoryLabel(group.category),
            entries: group.entries,
            unlockedCount: group.unlockedCount,
          }}
          categoryTone={categoryTone}
          claimingCode={claimingCode}
          onClaim={(row) => {
            void claimAchievement(row);
          }}
        />
      ))}
    </section>
  );
}
