import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { AchievementNotification } from "../../query/achievements";

export interface AchievementToastItem extends AchievementNotification {
  id: string;
}

export function AchievementToasts({
  toasts,
}: {
  toasts: AchievementToastItem[];
}) {
  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[10020] flex w-[min(92vw,360px)] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.article
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 110, scale: 0.96, filter: "blur(4px)" }}
            animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: 130, scale: 0.96, filter: "blur(5px)" }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto relative overflow-hidden rounded-2xl border border-amber-300/45 bg-slate-900/95 p-3.5 shadow-[0_18px_40px_rgba(2,6,23,0.65)] backdrop-blur"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-amber-400/20 blur-2xl" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(251,191,36,0.16),transparent_40%,rgba(56,189,248,0.08))]" />

            <p className="relative text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">
              Achievement débloqué
            </p>
            <p className="relative mt-1 text-sm font-black uppercase italic text-white">
              {toast.name}
            </p>
            <p className="relative text-xs text-slate-200/90">
              {toast.reward_label}
            </p>
            <Link
              to="/achievements"
              className="relative mt-2 inline-flex items-center justify-center rounded-md border border-amber-200/70 bg-amber-100/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-900 transition hover:bg-white"
            >
              Voir achievements
            </Link>
          </motion.article>
        ))}
      </AnimatePresence>
    </div>
  );
}
