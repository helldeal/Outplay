import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { PackageOpen, Sparkles, Wallet } from "lucide-react";
import { CardTile } from "../components/CardTile";
import { useSequentialReveal } from "../hooks/useSequentialReveal";
import type { CardWithRelations } from "../types";

interface BoosterOpeningNavigationState {
  openedCards: CardWithRelations[];
  pcGained: number;
  chargedPc: number;
  boosterName?: string;
  seriesName?: string;
}

export function BoosterPage() {
  const location = useLocation();
  const opening =
    (location.state as BoosterOpeningNavigationState | null) ?? null;
  const openedCards =
    opening?.openedCards.sort((a, b) => a.id.localeCompare(b.id)) ?? [];
  const pcGained = opening?.pcGained ?? 0;
  const chargedPc = opening?.chargedPc ?? 0;
  const revealedCount = useSequentialReveal(
    openedCards.length,
    openedCards.map((card) => card.id).join("|"),
  );

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
          <PackageOpen className="h-6 w-6 text-cyan-300" />
          Booster Opening
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {opening
            ? `${opening.seriesName ?? "Série"} • ${opening.boosterName ?? "Booster"}`
            : "Ouvre un booster depuis la boutique ou le daily du header."}
        </p>
      </div>

      {openedCards.length > 0 ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-sm text-slate-200">
            <span className="mr-4 inline-flex items-center gap-1">
              <Wallet className="h-4 w-4" />
              PC spent: {chargedPc}
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <Sparkles className="h-4 w-4" />
              PC gained (duplicates): +{pcGained}
            </span>
          </div>

          <div
            className="grid grid-cols-1 gap-4 md:grid-cols-5"
            style={{ perspective: "1200px" }}
          >
            {openedCards.map((card, index) => {
              const isRevealed = index < revealedCount;

              return (
                <motion.div
                  key={`${card.id}-${index}`}
                  initial={{ opacity: 0, rotateY: 180, scale: 0.92 }}
                  animate={
                    isRevealed
                      ? {
                          opacity: 1,
                          rotateY: 0,
                          scale: 1,
                        }
                      : {
                          opacity: 0.2,
                          rotateY: 180,
                          scale: 0.95,
                        }
                  }
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="transform-gpu"
                >
                  {isRevealed ? (
                    <CardTile card={card} />
                  ) : (
                    <div className="flex aspect-[3/4] items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-sm text-slate-500">
                      Hidden
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-300">
          Aucune ouverture en cours.
          <Link to="/shop" className="ml-2 text-cyan-300 hover:text-cyan-200">
            Aller à la boutique
          </Link>
        </div>
      )}
    </section>
  );
}
