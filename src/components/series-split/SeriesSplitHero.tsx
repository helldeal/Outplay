import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock3, Rocket } from "lucide-react";
import type {
  SeriesSplitOverview,
  SeriesSplitTier,
} from "../../query/series-split";

const pointsFormatter = new Intl.NumberFormat("fr-FR");

function formatTimeLeft(endAt: string) {
  const milliseconds = new Date(endAt).getTime() - Date.now();
  if (milliseconds <= 0) {
    return "Termine";
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

export function SeriesSplitHero(props: {
  overview: SeriesSplitOverview;
  nextTier: SeriesSplitTier | null;
  nextTierProgressPct: number;
  globalProgressPct: number;
}) {
  const [animatedPoints, setAnimatedPoints] = useState(0);
  const [animatedNextTierPct, setAnimatedNextTierPct] = useState(0);
  const [animatedGlobalPct, setAnimatedGlobalPct] = useState(0);

  useEffect(() => {
    const durationMs = 800;
    const startedAt = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / durationMs, 1);
      const eased = 1 - (1 - progress) ** 3;

      setAnimatedPoints(Math.round(props.overview.totalPoints * eased));
      setAnimatedNextTierPct(Math.round(props.nextTierProgressPct * eased));
      setAnimatedGlobalPct(Math.round(props.globalProgressPct * eased));

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [
    props.overview.totalPoints,
    props.nextTierProgressPct,
    props.globalProgressPct,
  ]);

  return (
    <motion.div
      className="relative overflow-hidden rounded-3xl border border-cyan-200/40 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-6 shadow-[0_28px_90px_rgba(2,6,23,0.72)]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(34,211,238,0.2),transparent_42%),radial-gradient(circle_at_85%_0%,rgba(59,130,246,0.2),transparent_34%),linear-gradient(120deg,rgba(34,211,238,0.16)_0%,transparent_42%,rgba(56,189,248,0.1)_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background:linear-gradient(115deg,transparent_0,transparent_35%,rgba(255,255,255,0.35)_50%,transparent_65%,transparent_100%)]" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-cyan-400/30 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 -bottom-16 h-56 w-56 rounded-full bg-blue-400/20 blur-3xl" />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-2xl">
          <motion.p
            className="inline-flex items-center gap-1 rounded-full border border-cyan-200/60 bg-cyan-300/20 px-2.5 py-1 text-[10px] font-black tracking-[0.18em] uppercase text-cyan-100"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Rocket className="h-3.5 w-3.5" />
            Battle Pass
          </motion.p>
          <motion.h1
            className="mt-2 text-2xl font-black uppercase italic text-white md:text-4xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {props.overview.splitName}
          </motion.h1>
          <motion.p
            className="mt-1 text-sm text-slate-200/90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Gagne des points en ouvrant des boosters {props.overview.seriesCode}{" "}
            et en completant les missions.
          </motion.p>

          <motion.div
            className="mt-3 inline-flex items-center gap-1 rounded-full border border-cyan-200/50 bg-slate-950/40 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-cyan-100"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <Clock3 className="h-3.5 w-3.5" />
            Temps restant: {formatTimeLeft(props.overview.endsAt)}
          </motion.div>
        </div>

        <motion.div
          className="min-w-[220px] rounded-2xl border border-cyan-600/70 bg-slate-950/75 px-4 py-3 text-right backdrop-blur"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-300">
            Progression globale
          </p>
          <p className="mt-1 text-2xl font-black text-white">
            {pointsFormatter.format(animatedPoints)} pts
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400"
              initial={{ width: 0 }}
              animate={{ width: `${animatedGlobalPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <p className="mt-1 text-xs font-semibold text-cyan-200">
            {animatedGlobalPct}% du Split complété
          </p>
          <p className="mt-1 text-[11px] text-slate-300">
            {animatedNextTierPct}% vers Tier{" "}
            {props.nextTier?.tierLevel ?? "MAX"}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
