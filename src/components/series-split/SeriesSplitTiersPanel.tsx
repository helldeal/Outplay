import { motion } from "framer-motion";
import {
  Award,
  CheckCircle2,
  Coins,
  Crown,
  Gift,
  LoaderCircle,
  Lock,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  resolveRewardTone,
  type RewardBoosterType,
} from "../rewards/reward-theme";
import type { SeriesSplitTier } from "../../query/series-split";

const pointsFormatter = new Intl.NumberFormat("fr-FR");

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.22,
    },
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
};

function RewardIcon({ type }: { type: "pc" | "booster" | "title" }) {
  switch (type) {
    case "pc":
      return <Coins className="h-3.5 w-3.5" />;
    case "booster":
      return <Gift className="h-3.5 w-3.5" />;
    case "title":
      return <Trophy className="h-3.5 w-3.5" />;
  }
}

function TierRewardBadge(props: {
  type: "pc" | "booster" | "title";
  label: string;
  rewardPc: number;
  rewardBoosterType: RewardBoosterType | undefined;
}) {
  const tone = resolveRewardTone({
    rewardPc: props.rewardPc,
    rewardBoosterType: props.rewardBoosterType,
  });
  const titleClass =
    props.type === "title"
      ? "bg-purple-400/15 text-purple-200"
      : tone.rewardBadgeClass;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${titleClass}`}
    >
      <RewardIcon type={props.type} />
      <span>{props.label}</span>
    </span>
  );
}

export function SeriesSplitTiersPanel(props: {
  tiers: SeriesSplitTier[];
  totalPoints: number;
  claimingTierLevel: number | null;
  onClaimTier: (tierLevel: number) => void;
}) {
  const sortedTiers = [...props.tiers].sort(
    (a, b) => a.pointsRequired - b.pointsRequired,
  );
  const nextTierIndex = sortedTiers.findIndex(
    (tier) => props.totalPoints < tier.pointsRequired,
  );
  const currentTierFloorPoints =
    nextTierIndex > 0 ? sortedTiers[nextTierIndex - 1].pointsRequired : 0;
  const nextTierProgressPct =
    nextTierIndex >= 0
      ? Math.max(
          0,
          Math.min(
            100,
            ((props.totalPoints - currentTierFloorPoints) /
              Math.max(
                1,
                sortedTiers[nextTierIndex].pointsRequired -
                  currentTierFloorPoints,
              )) *
              100,
          ),
        )
      : 100;

  return (
    <motion.div
      className="space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-slate-200">
          <Award className="h-4 w-4 text-amber-300" />
          Paliers
        </h2>
      </div>

      {/* Vertical Battle Pass Track */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-b from-slate-900 to-slate-950">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.06),transparent_60%)]" />

        <div className="relative p-4">
          <motion.div
            className="relative flex flex-col gap-1"
            variants={containerVariants}
          >
            {sortedTiers.map((tier, index) => {
              const isReached = props.totalPoints >= tier.pointsRequired;
              const isNextTier = index === nextTierIndex;
              const isClaimingThisTier =
                props.claimingTierLevel === tier.tierLevel;

              const rewards = [] as Array<{
                key: string;
                type: "pc" | "booster" | "title";
                label: string;
                rewardPc: number;
                rewardBoosterType: RewardBoosterType | undefined;
              }>;

              if (tier.rewardPc > 0) {
                rewards.push({
                  key: `${tier.tierLevel}-pc`,
                  type: "pc",
                  label: `${pointsFormatter.format(tier.rewardPc)} PC`,
                  rewardPc: tier.rewardPc,
                  rewardBoosterType: undefined,
                });
              }

              if (tier.rewardBoosterType) {
                rewards.push({
                  key: `${tier.tierLevel}-booster`,
                  type: "booster",
                  label: tier.rewardBoosterType,
                  rewardPc: 0,
                  rewardBoosterType: tier.rewardBoosterType,
                });
              }

              if (tier.rewardTitle) {
                rewards.push({
                  key: `${tier.tierLevel}-title`,
                  type: "title",
                  label: tier.rewardTitle,
                  rewardPc: 0,
                  rewardBoosterType: undefined,
                });
              }

              return (
                <motion.div
                  key={tier.tierLevel}
                  className="relative flex items-center gap-3 py-2"
                  variants={itemVariants}
                >
                  {/* Tier node */}
                  <div className="relative z-10 flex-shrink-0">
                    {tier.canClaim && (
                      <motion.div
                        className="absolute inset-0 rounded-full bg-amber-400/50"
                        animate={{
                          scale: [1, 1.6, 1],
                          opacity: [0.6, 0, 0.6],
                        }}
                        transition={{
                          duration: 1.4,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    )}

                    {tier.canClaim ? (
                      <button
                        type="button"
                        disabled={props.claimingTierLevel !== null}
                        onClick={() => props.onClaimTier(tier.tierLevel)}
                        className="cursor-pointer"
                        aria-label={`Claim tier ${tier.tierLevel}`}
                      >
                        <div
                          className={`relative flex h-10 w-10 items-center justify-center rounded-full border-[3px] transition-all duration-200 ${"border-amber-400 bg-gradient-to-r from-amber-300 to-amber-500  text-amber-700 shadow-[0_0_16px_rgba(251,191,36,0.4)]"}`}
                        >
                          {isClaimingThisTier ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <Crown className="h-4 w-4" />
                          )}
                        </div>
                      </button>
                    ) : (
                      <div
                        className={`relative flex h-10 w-10 items-center justify-center rounded-full border-[3px] transition-all duration-200 ${
                          tier.claimed
                            ? "border-emerald-400 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_0_16px_rgba(16,185,129,0.4)]"
                            : isReached
                              ? "border-cyan-400 bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-[0_0_12px_rgba(34,211,238,0.3)]"
                              : "border-slate-700 bg-slate-900 text-slate-500"
                        }`}
                      >
                        {tier.claimed ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : isReached ? (
                          <Sparkles className="h-4 w-4" />
                        ) : (
                          <span className="text-xs font-black">
                            {tier.tierLevel}
                          </span>
                        )}
                      </div>
                    )}

                    {!isReached && (
                      <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 ring-2 ring-slate-900">
                        <Lock className="h-2 w-2 text-slate-500" />
                      </div>
                    )}
                  </div>

                  {/* Tier content card */}
                  <div
                    className={`relative overflow-hidden flex flex-1 items-center justify-between rounded-xl border px-3 py-2 transition-all duration-200 ${
                      tier.claimed
                        ? "border-emerald-500/20 bg-emerald-950/40"
                        : tier.canClaim
                          ? "border-amber-400/35 bg-amber-500/10"
                          : isReached
                            ? "border-cyan-500/20 bg-cyan-950/30"
                            : "border-slate-800 bg-slate-900/50"
                    }`}
                  >
                    {isNextTier ? (
                      <div className="pointer-events-none absolute inset-0">
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400/20 via-sky-400/15 to-transparent"
                          initial={{ width: 0 }}
                          animate={{ width: `${nextTierProgressPct}%` }}
                          transition={{ duration: 0.35, ease: "easeOut" }}
                        />
                      </div>
                    ) : null}

                    {/* Left: Tier info & rewards */}
                    <div className="relative z-10 flex items-center gap-3">
                      <div className="text-center">
                        <span
                          className={`text-lg font-black ${
                            tier.claimed
                              ? "text-emerald-400"
                              : tier.canClaim
                                ? "text-amber-400"
                                : isReached
                                  ? "text-cyan-400"
                                  : "text-slate-500"
                          }`}
                        >
                          {tier.tierLevel}
                        </span>
                        <p className="text-[9px] uppercase tracking-wider text-slate-500">
                          tier
                        </p>
                      </div>

                      <div className="h-8 w-px bg-slate-700/50" />

                      <div className="flex flex-wrap items-center gap-1.5">
                        {rewards.map((reward) => (
                          <TierRewardBadge
                            key={reward.key}
                            type={reward.type}
                            label={reward.label}
                            rewardPc={reward.rewardPc}
                            rewardBoosterType={reward.rewardBoosterType}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Right: Points & state */}
                    <div className="relative z-10 flex items-center gap-3">
                      <span className="text-[10px] font-medium text-slate-500">
                        {pointsFormatter.format(tier.pointsRequired)} pts
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
