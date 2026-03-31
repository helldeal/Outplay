import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { PageLoading } from "../components/PageLoading";
import {
  claimSeriesSplitMissionRpc,
  claimSeriesSplitTierRpc,
  markSeriesSplitSeenRpc,
  type SeriesSplitTier,
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
  const [tierPageIndex, setTierPageIndex] = useState(0);
  const [claimingMissionCode, setClaimingMissionCode] = useState<string | null>(
    null,
  );
  const [claimingTierLevel, setClaimingTierLevel] = useState<number | null>(
    null,
  );

  const overview = splitQuery.data;

  const tiersByPoints = useMemo(
    () =>
      [...(overview?.tiers ?? [])].sort(
        (left, right) => left.pointsRequired - right.pointsRequired,
      ),
    [overview?.tiers],
  );

  const nextTier = useMemo<SeriesSplitTier | null>(() => {
    if (!overview) {
      return null;
    }

    return (
      tiersByPoints.find(
        (tier) => overview.totalPoints < tier.pointsRequired,
      ) ?? null
    );
  }, [overview, tiersByPoints]);

  const currentTierFloorPoints = useMemo(() => {
    if (!overview || tiersByPoints.length === 0) {
      return 0;
    }

    const reachedTiers = tiersByPoints.filter(
      (tier) => tier.pointsRequired <= overview.totalPoints,
    );

    if (reachedTiers.length === 0) {
      return 0;
    }

    return reachedTiers[reachedTiers.length - 1].pointsRequired;
  }, [overview, tiersByPoints]);

  const progressPct = useMemo(() => {
    if (!overview) {
      return 0;
    }

    if (!nextTier) {
      return 100;
    }

    const denominator = nextTier.pointsRequired - currentTierFloorPoints;
    if (denominator <= 0) {
      return 100;
    }

    const numerator = overview.totalPoints - currentTierFloorPoints;
    return Math.max(0, Math.min(100, (numerator / denominator) * 100));
  }, [currentTierFloorPoints, nextTier, overview]);

  const pointsToNextTier =
    overview && nextTier
      ? Math.max(0, nextTier.pointsRequired - overview.totalPoints)
      : 0;

  const tierPages = useMemo(() => {
    const pages: Array<typeof tiersByPoints> = [];
    for (let index = 0; index < tiersByPoints.length; index += 5) {
      pages.push(tiersByPoints.slice(index, index + 5));
    }
    return pages;
  }, [tiersByPoints]);

  useEffect(() => {
    if (tierPages.length === 0) {
      if (tierPageIndex !== 0) {
        setTierPageIndex(0);
      }
      return;
    }

    if (tierPageIndex > tierPages.length - 1) {
      setTierPageIndex(Math.max(0, tierPages.length - 1));
    }
  }, [tierPageIndex, tierPages]);

  const visibleTiers = useMemo(() => {
    return tierPages[tierPageIndex] ?? [];
  }, [tierPageIndex, tierPages]);

  const canGoPrevTierPage = tierPageIndex > 0;
  const canGoNextTierPage = tierPageIndex < tierPages.length - 1;

  const visibleTierRangeLabel = useMemo(() => {
    if (visibleTiers.length === 0) {
      return "Aucun palier";
    }

    return `${visibleTiers[0].tierLevel}-${visibleTiers[visibleTiers.length - 1].tierLevel}`;
  }, [visibleTiers]);

  const visibleTrackProgressPct = useMemo(() => {
    if (!overview || visibleTiers.length === 0) {
      return 0;
    }

    if (visibleTiers.length === 1) {
      return overview.totalPoints >= visibleTiers[0].pointsRequired ? 100 : 0;
    }

    const minPoints = visibleTiers[0].pointsRequired;
    const maxPoints = visibleTiers[visibleTiers.length - 1].pointsRequired;
    const denominator = maxPoints - minPoints;

    if (denominator <= 0) {
      return overview.totalPoints >= maxPoints ? 100 : 0;
    }

    return Math.max(
      0,
      Math.min(100, ((overview.totalPoints - minPoints) / denominator) * 100),
    );
  }, [overview, visibleTiers]);

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
        progressPct={progressPct}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <SeriesSplitTiersPanel
          nextTier={nextTier}
          pointsToNextTier={pointsToNextTier}
          canGoPrevTierPage={canGoPrevTierPage}
          canGoNextTierPage={canGoNextTierPage}
          onPrevTierPage={() => {
            setTierPageIndex((current) => Math.max(0, current - 1));
          }}
          onNextTierPage={() => {
            setTierPageIndex((current) =>
              Math.min(tierPages.length - 1, current + 1),
            );
          }}
          visibleTrackProgressPct={visibleTrackProgressPct}
          visibleTiers={visibleTiers}
          visibleTierRangeLabel={visibleTierRangeLabel}
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
