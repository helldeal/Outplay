import { motion } from "framer-motion";
import {
  CheckCircle2,
  Gift,
  ListChecks,
  LoaderCircle,
  Target,
} from "lucide-react";
import type { SeriesSplitMission } from "../../query/series-split";

const pointsFormatter = new Intl.NumberFormat("fr-FR");

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
    },
  },
};

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

export function SeriesSplitMissionsPanel(props: {
  missions: SeriesSplitMission[];
  claimingMissionCode: string | null;
  onClaimMission: (missionCode: string) => void;
}) {
  return (
    <motion.aside
      className="space-y-3 lg:sticky lg:top-20"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-slate-200">
          <ListChecks className="h-4 w-4 text-cyan-300" />
          Missions
        </h2>
        <p className="text-xs text-slate-400">
          {props.missions.filter((mission) => mission.canClaim).length} a
          réclamer
        </p>
      </div>

      <motion.div className="space-y-3">
        {props.missions.map((mission) => (
          <motion.article
            variants={itemVariants}
            key={mission.code}
            className={`rounded-xl border p-3 ${
              mission.claimed
                ? "border-emerald-400/40 bg-emerald-500/10 relative overflow-hidden"
                : mission.completed
                  ? "border-amber-300/45 bg-amber-500/10 relative overflow-hidden"
                  : "border-slate-800 bg-slate-950/70"
            }`}
          >
            {mission.completed ? (
              <motion.div
                className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/10 blur-2xl"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            ) : null}

            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {mission.name}
                </h3>
                <p className="text-xs text-slate-400">{mission.description}</p>
              </div>
              <motion.span
                className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-2 py-1 text-[11px] font-semibold text-cyan-200 whitespace-nowrap"
                whileHover={{ scale: 1.08 }}
              >
                +{pointsFormatter.format(mission.rewardPoints)} pts
              </motion.span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-500"
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.max(0, Math.min(100, mission.progressPct))}%`,
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
              <motion.span
                className="inline-flex items-center gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Target className="h-3.5 w-3.5" />
                {Math.round(
                  Math.min(mission.currentValue, mission.targetValue) * 100,
                ) / 100}
                /{Math.round(mission.targetValue * 100) / 100}
              </motion.span>

              <motion.button
                type="button"
                disabled={
                  !mission.canClaim || props.claimingMissionCode !== null
                }
                onClick={() => {
                  props.onClaimMission(mission.code);
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-cyan-400/70 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
              >
                {props.claimingMissionCode === mission.code ? (
                  <>
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    Claim...
                  </>
                ) : mission.claimed ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Réclamé
                  </>
                ) : mission.canClaim ? (
                  <>
                    <Gift className="h-3.5 w-3.5" />
                    Réclamer
                  </>
                ) : (
                  "En cours"
                )}
              </motion.button>
            </div>
          </motion.article>
        ))}
      </motion.div>
    </motion.aside>
  );
}
