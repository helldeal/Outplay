import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Award,
  CheckCircle2,
  Clock3,
  Gift,
  LoaderCircle,
  Rocket,
  Target,
} from "lucide-react";
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
import { BoosterTypeBadge } from "../components/rewards/reward-theme";

const pointsFormatter = new Intl.NumberFormat("fr-FR");

function formatTimeLeft(endAt: string) {
  const milliseconds = new Date(endAt).getTime() - Date.now();
  if (milliseconds <= 0) {
    return "Terminé";
  }

  const totalMinutes = Math.floor(milliseconds / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}j ${hours}h ${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

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

  const tiersByPoints = useMemo(
    () =>
      [...(overview?.tiers ?? [])].sort(
        (left, right) => left.pointsRequired - right.pointsRequired,
      ),
    [overview?.tiers],
  );

  const nextTier = useMemo(() => {
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
      <section className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 text-rose-100">
        Impossible de charger le Series Split.
      </section>
    );
  }

  if (!overview) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-black uppercase italic text-white">
          Series Split
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Aucun Series Split actif pour le moment.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(56,189,248,0.12),transparent_45%,rgba(251,191,36,0.08))]" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">
              Série {overview.seriesCode}
            </p>
            <h1 className="text-3xl font-black uppercase italic text-white md:text-4xl">
              {overview.splitName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Gagne des points en ouvrant des boosters {overview.seriesCode} et
              en complétant les missions du Series Split.
            </p>
          </div>
          <div className="rounded-xl border border-cyan-300/40 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              Temps restant: {formatTimeLeft(overview.endsAt)}
            </span>
          </div>
        </div>

        <div className="relative mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <Rocket className="h-3.5 w-3.5 text-cyan-300" />
              {pointsFormatter.format(overview.totalPoints)} points
            </span>
            <span>
              {pointsFormatter.format(overview.openingPoints)} ouverts ·{" "}
              {pointsFormatter.format(overview.missionPoints)} missions
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {nextTier ? (
            <p className="text-xs text-slate-400">
              Vers Tier {nextTier.tierLevel}:{" "}
              {pointsFormatter.format(
                overview.totalPoints - currentTierFloorPoints,
              )}
              /
              {pointsFormatter.format(
                nextTier.pointsRequired - currentTierFloorPoints,
              )}{" "}
              points ({pointsFormatter.format(pointsToNextTier)} restants).
            </p>
          ) : (
            <p className="text-xs text-emerald-300">
              Tous les paliers sont débloqués.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-200">
            Paliers
          </h2>
          <div className="space-y-3">
            {overview.tiers.map((tier) => (
              <article
                key={tier.tierLevel}
                className={`rounded-xl border p-3 ${
                  tier.claimed
                    ? "border-emerald-400/40 bg-emerald-500/10"
                    : tier.unlocked
                      ? "border-amber-300/45 bg-amber-500/10"
                      : "border-slate-800 bg-slate-950/70"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-cyan-300">
                      Tier {tier.tierLevel}
                    </p>
                    <p className="text-sm font-semibold text-white">
                      {pointsFormatter.format(tier.pointsRequired)} points
                    </p>
                  </div>
                  {tier.claimed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                  ) : (
                    <Award className="h-5 w-5 text-amber-300" />
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  {tier.rewardPc > 0 ? (
                    <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-2 py-1 text-emerald-200">
                      {pointsFormatter.format(tier.rewardPc)} PC
                    </span>
                  ) : null}
                  {tier.rewardBoosterType ? (
                    <BoosterTypeBadge boosterType={tier.rewardBoosterType} />
                  ) : null}
                  {tier.rewardTitle ? (
                    <span className="rounded-full border border-fuchsia-300/40 bg-fuchsia-300/10 px-2 py-1 text-fuchsia-200">
                      Titre: {tier.rewardTitle}
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void claimTier(tier.tierLevel);
                  }}
                  disabled={!tier.canClaim || claimingTierLevel !== null}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/70 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {claimingTierLevel === tier.tierLevel ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Réclamation...
                    </>
                  ) : tier.claimed ? (
                    "Réclamé"
                  ) : tier.canClaim ? (
                    "Réclamer"
                  ) : (
                    "Verrouillé"
                  )}
                </button>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-200">
            Missions
          </h2>
          <div className="space-y-3">
            {overview.missions.map((mission) => (
              <article
                key={mission.code}
                className={`rounded-xl border p-3 ${
                  mission.claimed
                    ? "border-emerald-400/40 bg-emerald-500/10"
                    : mission.completed
                      ? "border-amber-300/45 bg-amber-500/10"
                      : "border-slate-800 bg-slate-950/70"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {mission.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {mission.description}
                    </p>
                  </div>
                  <span className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-2 py-1 text-[11px] font-semibold text-cyan-200">
                    +{pointsFormatter.format(mission.rewardPoints)} pts
                  </span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-500"
                    style={{
                      width: `${Math.max(0, Math.min(100, mission.progressPct))}%`,
                    }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
                  <span className="inline-flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" />
                    {Math.round(mission.currentValue * 100) / 100}/
                    {Math.round(mission.targetValue * 100) / 100}
                  </span>

                  <button
                    type="button"
                    disabled={!mission.canClaim || claimingMissionCode !== null}
                    onClick={() => {
                      void claimMission(mission.code);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-cyan-400/70 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {claimingMissionCode === mission.code ? (
                      <>
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        Claim...
                      </>
                    ) : mission.claimed ? (
                      "Réclamé"
                    ) : mission.canClaim ? (
                      <>
                        <Gift className="h-3.5 w-3.5" />
                        Réclamer
                      </>
                    ) : (
                      "En cours"
                    )}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
