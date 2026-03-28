import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { SeriesSplitNotification } from "../../query/series-split";

export interface SeriesSplitToastItem extends SeriesSplitNotification {
  id: string;
}

function toneForNotification(type: "MISSION" | "TIER") {
  if (type === "MISSION") {
    return {
      border: "border-cyan-300/45",
      glow: "bg-cyan-400/20",
      gradient:
        "bg-[linear-gradient(120deg,rgba(56,189,248,0.18),transparent_40%,rgba(99,102,241,0.08))]",
      eyebrow: "text-cyan-200",
      button: "border-cyan-200/70 bg-cyan-100/95 text-cyan-900 hover:bg-white",
      label: "Mission Split débloquée",
    };
  }

  return {
    border: "border-fuchsia-300/45",
    glow: "bg-fuchsia-400/20",
    gradient:
      "bg-[linear-gradient(120deg,rgba(244,114,182,0.18),transparent_40%,rgba(168,85,247,0.08))]",
    eyebrow: "text-fuchsia-200",
    button:
      "border-fuchsia-200/70 bg-fuchsia-100/95 text-fuchsia-900 hover:bg-white",
    label: "Palier Split débloqué",
  };
}

export function SeriesSplitToasts({
  toasts,
}: {
  toasts: SeriesSplitToastItem[];
}) {
  return (
    <div className="pointer-events-none fixed right-4 top-[172px] z-[10019] flex w-[min(92vw,360px)] flex-col gap-2 md:top-20">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const tone = toneForNotification(toast.notificationType);

          return (
            <motion.article
              key={toast.id}
              layout
              initial={{
                opacity: 0,
                x: 110,
                scale: 0.96,
                filter: "blur(4px)",
              }}
              animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: 130, scale: 0.96, filter: "blur(5px)" }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              className={`pointer-events-auto relative overflow-hidden rounded-2xl border ${tone.border} bg-slate-900/95 p-3.5 shadow-[0_18px_40px_rgba(2,6,23,0.65)] backdrop-blur`}
            >
              <div
                className={`pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full ${tone.glow} blur-2xl`}
              />
              <div
                className={`pointer-events-none absolute inset-0 ${tone.gradient}`}
              />

              <p
                className={`relative text-[10px] font-black uppercase tracking-[0.16em] ${tone.eyebrow}`}
              >
                {tone.label}
              </p>
              <p className="relative mt-1 text-sm font-black uppercase italic text-white">
                {toast.title}
              </p>
              <p className="relative text-xs text-slate-200/90">
                {toast.rewardLabel}
              </p>
              <Link
                to="/series-split"
                className={`relative mt-2 inline-flex items-center justify-center rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] transition ${tone.button}`}
              >
                Voir split
              </Link>
            </motion.article>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
