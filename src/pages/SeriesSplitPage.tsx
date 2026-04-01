import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { PageLoading } from "../components/PageLoading";
import {
  claimSeriesSplitMissionRpc,
  claimSeriesSplitTierRpc,
  markSeriesSplitSeenRpc,
  useSeriesSplitQuery,
} from "../query/series-split";
import {
  computeDuplicateIndices,
  fetchCardsByIds,
  getOwnedCardIds,
} from "../query/booster";
import { SeriesSplitHero } from "../components/series-split/SeriesSplitHero";
import { SeriesSplitTiersPanel } from "../components/series-split/SeriesSplitTiersPanel";
import { SeriesSplitMissionsPanel } from "../components/series-split/SeriesSplitMissionsPanel";

import { motion } from "framer-motion";

export function SeriesSplitPage() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const splitQuery = useSeriesSplitQuery(user?.id);
  const [claimingMissionCode, setClaimingMissionCode] = useState<string | null>(
    null,
  );
  const [claimingTierLevel, setClaimingTierLevel] = useState<number | null>(
    null,
  );

  const overview = splitQuery.data;

  // Compute next tier and progress values for the Hero component
  const sortedTiers = [...(overview?.tiers ?? [])].sort(
    (a, b) => a.pointsRequired - b.pointsRequired,
  );

  const nextTier =
    sortedTiers.find(
      (tier) => (overview?.totalPoints ?? 0) < tier.pointsRequired,
    ) ?? null;

  const currentTierFloorPoints = (() => {
    if (!overview || sortedTiers.length === 0) return 0;
    const reachedTiers = sortedTiers.filter(
      (tier) => tier.pointsRequired <= overview.totalPoints,
    );
    if (reachedTiers.length === 0) return 0;
    return reachedTiers[reachedTiers.length - 1].pointsRequired;
  })();

  const nextTierProgressPct = (() => {
    if (!overview) return 0;
    if (!nextTier) return 100;
    const denominator = nextTier.pointsRequired - currentTierFloorPoints;
    if (denominator <= 0) return 100;
    const numerator = overview.totalPoints - currentTierFloorPoints;
    return Math.max(0, Math.min(100, (numerator / denominator) * 100));
  })();

  const globalProgressPct = (() => {
    if (!overview || sortedTiers.length === 0) return 0;
    const maxPoints = sortedTiers[sortedTiers.length - 1].pointsRequired;
    if (maxPoints <= 0) return 0;
    return Math.max(0, Math.min(100, (overview.totalPoints / maxPoints) * 100));
  })();

  useEffect(() => {
    if (!user?.id || !overview) {
      return;
    }

    void markSeriesSplitSeenRpc(user.id)
      .then(() =>
        Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["series-split-unseen-count", user.id],
          }),
          queryClient.invalidateQueries({
            queryKey: ["series-split-notifications", user.id],
          }),
        ]),
      )
      .catch(() => undefined);
  }, [overview, queryClient, user?.id]);

  const claimMission = async (missionCode: string) => {
    if (!user || claimingMissionCode || claimingTierLevel !== null) {
      return;
    }

    setClaimingMissionCode(missionCode);
    try {
      await claimSeriesSplitMissionRpc(user.id, missionCode);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["series-split", user.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["series-split-unseen-count", user.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["series-split-notifications", user.id],
        }),
      ]);
    } finally {
      setClaimingMissionCode(null);
    }
  };

  const claimTier = async (tierLevel: number) => {
    if (!user || claimingTierLevel !== null || claimingMissionCode) {
      return;
    }

    setClaimingTierLevel(tierLevel);
    try {
      const ownedBefore = await getOwnedCardIds(user.id);
      const result = await claimSeriesSplitTierRpc(user.id, tierLevel);

      const syncAfterClaim = () =>
        Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["series-split", user.id],
          }),
          queryClient.invalidateQueries({
            queryKey: ["series-split-unseen-count", user.id],
          }),
          queryClient.invalidateQueries({
            queryKey: ["series-split-notifications", user.id],
          }),
          queryClient.invalidateQueries({ queryKey: ["collection", user.id] }),
          queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
          queryClient.invalidateQueries({
            queryKey: ["achievements-progress", user.id],
          }),
          refreshProfile(),
        ]);

      if (!result.opening || !overview) {
        await syncAfterClaim();
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
          boosterName: `Series Split S3 · Tier ${result.tierLevel}`,
          seriesName: overview.seriesName,
          seriesCode: overview.seriesCode,
          source: "ACHIEVEMENT",
        },
      });

      void syncAfterClaim().catch(() => undefined);
    } finally {
      setClaimingTierLevel(null);
    }
  };

  if (splitQuery.isLoading) {
    return <PageLoading title="Series Split" subtitle="Chargement..." />;
  }

  if (splitQuery.error) {
    return (
      <motion.section
        className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 text-rose-100"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        Impossible de charger le Series Split.
      </motion.section>
    );
  }

  if (!overview) {
    return (
      <motion.section
        className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h1 className="text-2xl font-black uppercase italic text-white">
          Series Split
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Aucun Series Split actif pour le moment.
        </p>
      </motion.section>
    );
  }

  return (
    <section className="space-y-6">
      <SeriesSplitHero
        overview={overview}
        nextTier={nextTier}
        nextTierProgressPct={nextTierProgressPct}
        globalProgressPct={globalProgressPct}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <SeriesSplitTiersPanel
          tiers={overview.tiers}
          totalPoints={overview.totalPoints}
          claimingTierLevel={claimingTierLevel}
          onClaimTier={(tierLevel) => {
            void claimTier(tierLevel);
          }}
        />

        <SeriesSplitMissionsPanel
          missions={overview.missions}
          claimingMissionCode={claimingMissionCode}
          onClaimMission={(missionCode) => {
            void claimMission(missionCode);
          }}
        />
      </div>
    </section>
  );
}
