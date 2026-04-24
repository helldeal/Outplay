import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CardTile } from "../components/CardTile";
import type { CardWithRelations } from "../types";

export interface CardCompleterOpeningNavigationState {
  sequence: CardWithRelations[];
  winner: CardWithRelations;
  winnerIndex: number;
  chargedPc: number;
}

export function CardCompleterOpeningPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state =
    (location.state as CardCompleterOpeningNavigationState | null) ?? null;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [showReveal, setShowReveal] = useState(false);

  const sequence = useMemo(() => state?.sequence ?? [], [state?.sequence]);
  const winner = state?.winner;
  const winnerIndex = state?.winnerIndex ?? 0;
  const chargedPc = state?.chargedPc ?? 0;

  const CARD_WIDTH = 120;
  const CARD_GAP = 12;
  const STEP = CARD_WIDTH + CARD_GAP;

  useEffect(() => {
    if (!state) {
      return;
    }

    setCurrentIndex(0);
    setIsDone(false);
    setShowReveal(false);

    let cancelled = false;
    let timeoutId: number | undefined;

    const spinStep = (index: number) => {
      if (cancelled) {
        return;
      }

      if (index >= winnerIndex) {
        setCurrentIndex(winnerIndex);
        setIsDone(true);
        return;
      }

      const nextIndex = index + 1;
      setCurrentIndex(nextIndex);

      const progress = winnerIndex > 0 ? nextIndex / winnerIndex : 1;
      const delayMs =
        progress < 0.75
          ? 45
          : Math.round(45 + Math.pow((progress - 0.75) / 0.25, 2) * (300 - 45));

      timeoutId = window.setTimeout(() => {
        spinStep(nextIndex);
      }, delayMs);
    };

    timeoutId = window.setTimeout(() => {
      spinStep(0);
    }, 40);

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [state, winnerIndex]);

  if (!state || !winner || sequence.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="space-y-3 text-center">
          <p className="text-sm text-slate-400">
            Aucune ouverture compléteur en cours.
          </p>
          <Link
            to="/shop"
            className="inline-block text-sm text-cyan-300 hover:text-cyan-200"
          >
            Retour au shop →
          </Link>
        </div>
      </div>
    );
  }

  const trackTranslate = `calc(50% - ${CARD_WIDTH / 2}px - ${currentIndex * STEP}px)`;

  return (
    <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-slate-950 p-4">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-amber-300/35 bg-slate-950/95 p-5 shadow-[0_30px_80px_rgba(2,6,23,0.75)]">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-amber-400/20 blur-3xl" />

        <div className="relative mb-4 text-center">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-200">
            Compléteur de cartes
          </p>
          <h1 className="mt-1 text-2xl font-black uppercase italic text-white">
            {showReveal
              ? "Carte obtenue"
              : isDone
                ? "Carte sélectionnée"
                : "Les cartes manquantes défilent..."}
          </h1>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-10">
          <div className="pointer-events-none absolute inset-y-2 left-1/2 z-20 -translate-x-1/2">
            <div className="h-full w-[2px] bg-gradient-to-b from-amber-300/0 via-amber-300 to-amber-300/0" />
            <div className="absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 border-l-[8px] border-r-[8px] border-t-[12px] border-l-transparent border-r-transparent border-t-amber-300" />
            <div className="absolute bottom-0 left-1/2 h-0 w-0 -translate-x-1/2 border-l-[8px] border-r-[8px] border-b-[12px] border-l-transparent border-r-transparent border-b-amber-300" />
          </div>

          <div
            className="flex gap-3 transition-transform duration-75 ease-linear"
            style={{ transform: `translateX(${trackTranslate})` }}
          >
            {sequence.map((card, index) => (
              <div
                key={`${card.id}-${index}`}
                className={`w-[120px] shrink-0 overflow-hidden rounded-lg border transition ${
                  index === currentIndex
                    ? "border-amber-300 shadow-[0_0_26px_rgba(251,191,36,0.45)]"
                    : "border-slate-700"
                }`}
              >
                <CardTile card={card} disableExpand />
              </div>
            ))}
          </div>
        </div>

        {showReveal ? (
          <div className="mt-4 flex flex-col items-center gap-3">
            <div className="w-[220px]">
              <CardTile card={winner} disableExpand />
            </div>
          </div>
        ) : null}

        <div className="relative mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-300">
            Coût:{" "}
            <span className="font-black text-amber-300">{chargedPc} PC</span>
          </p>
          <button
            type="button"
            disabled={!isDone}
            onClick={() => {
              if (!showReveal) {
                setShowReveal(true);
                return;
              }

              navigate("/shop", { replace: true });
            }}
            className="inline-flex items-center justify-center rounded-md border border-amber-300/60 bg-amber-300/20 px-4 py-2 text-sm font-black uppercase tracking-[0.08em] text-amber-100 transition hover:bg-amber-300/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {!isDone
              ? "Défilement en cours..."
              : showReveal
                ? "Continuer"
                : "Voir la carte"}
          </button>
        </div>
      </div>
    </div>
  );
}
