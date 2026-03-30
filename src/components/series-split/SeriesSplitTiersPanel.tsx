import { motion } from "framer-motion";
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crown,
  LoaderCircle,
  Lock,
  Sparkles,
} from "lucide-react";
import { RewardTypeBadge } from "../rewards/reward-theme";
import type { SeriesSplitTier } from "../../query/series-split";

const pointsFormatter = new Intl.NumberFormat("fr-FR");

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

export function SeriesSplitTiersPanel(props: {
  nextTier: SeriesSplitTier | null;
  pointsToNextTier: number;
  canGoPrevTierPage: boolean;
  canGoNextTierPage: boolean;
  onPrevTierPage: () => void;
  onNextTierPage: () => void;
  visibleTrackProgressPct: number;
  visibleTiers: SeriesSplitTier[];
  visibleTierRangeLabel: string;
  claimingTierLevel: number | null;
  onClaimTier: (tierLevel: number) => void;
}) {
  return (
    <motion.div
      className="space-y-3"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-slate-200">
          <Award className="h-4 w-4 text-amber-300" />
          Paliers
        </h2>
      </div>

      <p className="text-xs text-slate-400">
        {props.nextTier
          ? `${pointsFormatter.format(props.pointsToNextTier)} points avant le prochain tier`
          : "Tous les tiers sont debloques"}
      </p>

      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/65 p-4">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(34,211,238,0.08),transparent_45%,rgba(251,191,36,0.06))]" />

        <button
          type="button"
          onClick={props.onPrevTierPage}
          disabled={!props.canGoPrevTierPage}
          className="absolute left-2 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-400/50 bg-slate-950/85 text-cyan-200 transition hover:scale-105 hover:border-cyan-300 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Voir les tiers precedents"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={props.onNextTierPage}
          disabled={!props.canGoNextTierPage}
          className="absolute right-2 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-400/50 bg-slate-950/85 text-cyan-200 transition hover:scale-105 hover:border-cyan-300 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Voir les tiers suivants"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="relative pb-2">
          <motion.div
            className="relative px-12 pb-14 pt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="pointer-events-none absolute bottom-4 left-12 right-12 h-1 rounded-full bg-cyan-950/90" />
            <motion.div
              className="pointer-events-none absolute bottom-4 left-12 h-1 rounded-full bg-gradient-to-r from-cyan-300 to-blue-500"
              initial={{ width: 0 }}
              animate={{
                width: `calc((100% - 6rem) * ${props.visibleTrackProgressPct / 100})`,
              }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
              {props.visibleTiers.map((tier) => {
                const rewardBadges = [] as Array<{
                  key: string;
                  rewardPc: number;
                  rewardBoosterType:
                    | "NORMAL"
                    | "LUCK"
                    | "PREMIUM"
                    | "GODPACK"
                    | undefined;
                  label: string;
                }>;

                if (tier.rewardPc > 0) {
                  rewardBadges.push({
                    key: `${tier.tierLevel}-pc`,
                    rewardPc: tier.rewardPc,
                    rewardBoosterType: undefined,
                    label: `${pointsFormatter.format(tier.rewardPc)} PC`,
                  });
                }

                if (tier.rewardBoosterType) {
                  rewardBadges.push({
                    key: `${tier.tierLevel}-booster`,
                    rewardPc: 0,
                    rewardBoosterType: tier.rewardBoosterType,
                    label: `${tier.rewardBoosterType} Booster`,
                  });
                }

                if (tier.rewardTitle) {
                  rewardBadges.push({
                    key: `${tier.tierLevel}-title`,
                    rewardPc: 0,
                    rewardBoosterType: undefined,
                    label: `Titre: ${tier.rewardTitle}`,
                  });
                }

                const cappedRewardBadges = rewardBadges.slice(0, 3);

                return (
                  <article
                    key={tier.tierLevel}
                    className={`relative mb-4 flex h-40 flex-col justify-between rounded-lg border p-2.5 text-left ${
                      tier.claimed
                        ? "border-emerald-400/35 bg-emerald-500/10"
                        : tier.unlocked
                          ? "border-amber-300/40 bg-amber-500/10"
                          : "border-slate-800 bg-slate-950/80"
                    }`}
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-cyan-300">
                        {pointsFormatter.format(tier.pointsRequired)} pts
                      </p>
                      {tier.canClaim ? (
                        <button
                          type="button"
                          disabled={props.claimingTierLevel !== null}
                          onClick={() => {
                            props.onClaimTier(tier.tierLevel);
                          }}
                          title="Reclamer la recompense"
                          className="group inline-flex h-6 w-6 items-center justify-center rounded-full border border-amber-300/70 bg-amber-300/20 text-amber-200 transition hover:scale-110 hover:bg-amber-300/30 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {props.claimingTierLevel === tier.tierLevel ? (
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Crown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      ) : tier.claimed ? (
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-300" />
                      ) : tier.unlocked ? (
                        <Sparkles className="h-4.5 w-4.5 text-amber-300" />
                      ) : (
                        <Lock className="h-4.5 w-4.5 text-slate-500" />
                      )}
                    </div>

                    <div className="flex min-h-[72px] flex-col items-start gap-1.5">
                      {cappedRewardBadges.map((badge) => (
                        <RewardTypeBadge
                          key={badge.key}
                          rewardPc={badge.rewardPc}
                          rewardBoosterType={badge.rewardBoosterType}
                          label={badge.label}
                          className="bg-transparent"
                        />
                      ))}
                    </div>

                    <div className="relative mt-auto flex items-center justify-center pt-2">
                      <div
                        className={`z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-black ${
                          tier.claimed
                            ? "border-emerald-300 bg-emerald-300/20 text-emerald-100"
                            : tier.unlocked
                              ? "border-amber-300 bg-amber-300/20 text-amber-100"
                              : "border-cyan-700 bg-slate-900 text-cyan-200"
                        }`}
                        style={{ transform: "translateY(8px)" }}
                      >
                        {tier.tierLevel}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </motion.div>
        </div>

        <div className="mt-2 text-center text-[11px] font-semibold text-cyan-200">
          Tiers {props.visibleTierRangeLabel}
        </div>
      </div>
    </motion.div>
  );
}
