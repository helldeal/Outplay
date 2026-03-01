import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronsUp, Coins, Sparkles } from "lucide-react";
import { CardTile } from "../components/CardTile";
import type { CardWithRelations, Rarity } from "../types";
import { rarityRank } from "../utils/rarity";

/* ─────────────────────── Types ─────────────────────── */

export interface BoosterOpeningNavigationState {
  openedCards: CardWithRelations[];
  duplicateCardIndices: number[];
  pcGained: number;
  chargedPc: number;
  boosterName?: string;
  seriesName?: string;
  seriesSlug?: string;
  seriesCode?: string;
}

interface CardEntry {
  card: CardWithRelations;
  isDuplicate: boolean;
}

/* ─────────────────────── Constants ─────────────────────── */

const CARD_W = 240;
const CARD_H = Math.round((CARD_W * 4) / 3);
const CARD_GAP = 14;

/* ─────────────────────── Helpers ─────────────────────── */

function isAboveChallenger(rarity: Rarity): boolean {
  return rarityRank(rarity) > rarityRank("CHALLENGER");
}

function rarityGlowColor(rarity: Rarity): string {
  switch (rarity) {
    case "LEGENDS":
      return "rgba(255,215,0,0.45)";
    case "WORLD_CLASS":
      return "rgba(249,115,22,0.45)";
    case "CHAMPION":
      return "rgba(168,85,247,0.45)";
    default:
      return "rgba(56,189,248,0.25)";
  }
}

/* ─────────────────────── FUT-style Reveal ─────────────────────── */

interface Hint {
  key: string;
  imgSrc: string;
  alt: string;
  label: string;
  round?: boolean;
}

function buildHints(card: CardWithRelations): Hint[] {
  const h: Hint[] = [];
  if (card.game?.logoUrl)
    h.push({
      key: "game",
      imgSrc: card.game.logoUrl,
      alt: card.game.name,
      label: "Jeu",
    });
  if (card.nationality?.flagUrl)
    h.push({
      key: "country",
      imgSrc: card.nationality.flagUrl,
      alt: card.nationality.code ?? "",
      label: "Pays",
      round: true,
    });
  if (card.team?.logoUrl)
    h.push({
      key: "team",
      imgSrc: card.team.logoUrl,
      alt: card.team.name,
      label: "Équipe",
    });
  if (card.role?.iconUrl)
    h.push({
      key: "role",
      imgSrc: card.role.iconUrl,
      alt: card.role.name,
      label: "Poste",
    });
  return h;
}

function FutReveal({
  card,
  onComplete,
}: {
  card: CardWithRelations;
  onComplete: () => void;
}) {
  const hints = useMemo(() => buildHints(card), [card]);
  const [step, setStep] = useState(0);
  const glow = rarityGlowColor(card.rarity);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const isLast = step >= hints.length;
    if (isLast) {
      const t = setTimeout(() => onCompleteRef.current(), 750);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), 1700);
    return () => clearTimeout(t);
  }, [step, hints.length]);

  const hint = step < hints.length ? hints[step] : null;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex select-none items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      onClick={() => {
        if (step < hints.length) setStep((s) => s + 1);
      }}
    >
      {/* Dark backdrop */}
      <div className="absolute inset-0 bg-black/95" />

      {/* Pulsing rarity glow */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{
          background: [
            `radial-gradient(circle at 50% 50%,${glow} 0%,transparent 55%)`,
            `radial-gradient(circle at 50% 50%,${glow} 0%,transparent 35%)`,
          ],
        }}
        transition={{ duration: 1.6, repeat: Infinity, repeatType: "reverse" }}
      />

      {/* Hint sequence */}
      <AnimatePresence mode="wait">
        {hint && (
          <motion.div
            key={hint.key}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0, filter: "blur(8px)" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative z-10 flex flex-col items-center gap-5"
          >
            <img
              src={hint.imgSrc}
              alt={hint.alt}
              className={`${hint.round ? "h-24 w-24 rounded-full" : "h-28 w-28"} object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.25)]`}
            />
            <span className="text-sm font-medium tracking-[0.3em] uppercase text-white/40">
              {hint.label}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─────────────────────── Card Back ─────────────────────── */

function CardBack() {
  return (
    <article className="card-content relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800">
      <div className="relative overflow-hidden rounded-lg">
        <div className="relative aspect-[3/4] overflow-hidden ">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(56,189,248,0.15),transparent_55%)]" />

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-500/40 bg-gradient-to-br from-cyan-500/15 to-purple-500/15">
              <span className="text-xl font-bold text-slate-400/80">O</span>
            </div>
            <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-slate-500/60">
              OUTPLAY
            </span>
          </div>
        </div>

        <div className="p-1.5 px-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>&nbsp;</span>
            <span className="font-medium">&nbsp;</span>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ─────────────────────── Page ─────────────────────── */

export function BoosterPage() {
  const location = useLocation();
  const opening =
    (location.state as BoosterOpeningNavigationState | null) ?? null;
  const pcGained = opening?.pcGained ?? 0;
  const legendexSeriesParam = opening?.seriesSlug ?? opening?.seriesCode;

  /* Build sorted card entries: low rarity → high rarity for dramatic reveal */
  const cards: CardEntry[] = useMemo(() => {
    const raw = opening?.openedCards ?? [];
    const dupSet = new Set(opening?.duplicateCardIndices ?? []);
    return raw
      .map((card, i) => ({ card, isDuplicate: dupSet.has(i) }))
      .sort((a, b) => rarityRank(a.card.rarity) - rarityRank(b.card.rarity));
  }, [opening]);

  const count = cards.length;

  /* State */
  const [phase, setPhase] = useState<"stack" | "spread">("stack");
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [futRevealed, setFutRevealed] = useState<Set<number>>(new Set());
  const [futIdx, setFutIdx] = useState<number | null>(null);

  /* Responsive scale – fit all spread cards in viewport width */
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth;
      const need = count * CARD_W + Math.max(0, count - 1) * CARD_GAP;
      setScale(Math.min(1, Math.max(0.45, (vw - 48) / need)));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [count]);

  /* Derived */
  const cardRevealed = useCallback(
    (i: number) => flipped.has(i) || futRevealed.has(i),
    [flipped, futRevealed],
  );

  const nextIdx = useMemo(() => {
    for (let i = 0; i < count; i++) if (!cardRevealed(i)) return i;
    return -1;
  }, [count, cardRevealed]);

  const allDone = count > 0 && flipped.size + futRevealed.size >= count;

  /* Handlers */
  const onCardClick = useCallback(
    (idx: number) => {
      if (futIdx !== null) return;

      if (phase === "stack") {
        setPhase("spread");
        return;
      }

      if (cardRevealed(idx) || idx !== nextIdx) return;

      const entry = cards[idx];
      if (isAboveChallenger(entry.card.rarity)) {
        setFutIdx(idx);
      } else {
        setFlipped((p) => new Set([...p, idx]));
      }
    },
    [futIdx, phase, cardRevealed, nextIdx, cards],
  );

  const onFutDone = useCallback(() => {
    if (futIdx !== null) {
      setFutRevealed((p) => new Set([...p, futIdx]));
      setFutIdx(null);
    }
  }, [futIdx]);

  /* ─── Empty state ─── */
  if (!opening || count === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="space-y-3 text-center">
          <p className="text-sm text-slate-400">Aucune ouverture en cours.</p>
          <Link
            to="/shop"
            className="inline-block text-sm text-cyan-300 hover:text-cyan-200"
          >
            Aller à la boutique →
          </Link>
        </div>
      </div>
    );
  }

  /* ─── Layout ─── */
  const totalW = count * CARD_W + Math.max(0, count - 1) * CARD_GAP;
  const center = (count - 1) / 2;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-slate-950">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(15,23,42,1)_0%,rgba(2,6,23,1)_100%)]" />

      {/* Top bar */}
      <header className="relative z-10 px-6 py-4">
        <span className="text-xs tracking-widest uppercase text-slate-500">
          {opening.seriesName ?? "Série"} · {opening.boosterName ?? "Booster"}
        </span>
      </header>

      {/* Card area */}
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <div
          className="relative"
          style={{
            width: totalW,
            height: CARD_H + 24,
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          {cards.map((entry, i) => {
            const { card, isDuplicate } = entry;
            const revealed = cardRevealed(i);
            const isFutRev = futRevealed.has(i);
            const isNext = i === nextIdx && futIdx === null;

            /* Spread: side by side */
            const spreadX = (i - center) * (CARD_W + CARD_GAP);
            /* Stack: overlapping pile */
            const stackX = (i - center) * 5;
            const stackY = (count - 1 - i) * -3;
            const stackRot = (i - center) * 1.5;

            return (
              <motion.div
                key={i}
                className="absolute left-1/2 top-1/2"
                style={{
                  width: CARD_W,
                  marginLeft: -CARD_W / 2,
                  marginTop: -CARD_H / 2,
                  zIndex:
                    phase === "spread"
                      ? revealed
                        ? 20 + i
                        : 10 + i
                      : count - i,
                }}
                animate={{
                  x: phase === "spread" ? spreadX : stackX,
                  y: phase === "spread" ? 0 : stackY,
                  rotate: phase === "spread" ? 0 : stackRot,
                }}
                transition={{
                  type: "spring",
                  stiffness: 230,
                  damping: 28,
                  delay: phase === "spread" ? i * 0.07 : 0,
                }}
              >
                <div
                  className={
                    phase === "stack" || isNext ? "cursor-pointer" : ""
                  }
                  onClick={() => onCardClick(i)}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {revealed ? (
                      <motion.div
                        key="front"
                        initial={isFutRev ? false : { rotateY: -90 }}
                        animate={{ rotateY: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="relative"
                      >
                        <CardTile card={card} />
                        {isDuplicate && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                              delay: isFutRev ? 0.1 : 0.3,
                              type: "spring",
                              stiffness: 400,
                              damping: 15,
                            }}
                            className="absolute -top-3 -right-3 z-30 flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 text-xs font-bold text-white shadow-lg shadow-emerald-500/30"
                          >
                            <Coins className="h-3.5 w-3.5" />+{card.pc_value} PC
                          </motion.div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        className="relative"
                        key="back"
                        exit={{
                          rotateY: 90,
                          transition: { duration: 0.25 },
                        }}
                        whileHover={
                          isNext || phase === "stack"
                            ? { scale: 1.04, y: -6 }
                            : undefined
                        }
                        whileTap={
                          isNext || phase === "stack"
                            ? { scale: 0.97 }
                            : undefined
                        }
                      >
                        <CardBack />

                        {phase === "spread" && isNext && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{
                              opacity: [0.7, 1, 0.7],
                              y: [0, -8, 0],
                            }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              repeatType: "reverse",
                            }}
                            className="flex pointer-events-none absolute left-0 right-0 -bottom-12 justify-center z-30  text-cyan-200"
                          >
                            <ChevronsUp className="h-8 w-8 drop-shadow-[0_0_12px_rgba(34,211,238,0.65)]" />
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Prompts */}
        {phase === "stack" && (
          <motion.p
            className="absolute bottom-16 select-none text-sm text-slate-500"
            animate={{ opacity: [0.4, 1] }}
            transition={{
              duration: 1,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          >
            Cliquez pour ouvrir
          </motion.p>
        )}

        {phase === "spread" && !allDone && futIdx === null && (
          <motion.p
            className="absolute bottom-16 select-none text-xs text-slate-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Cliquez sur la carte suivante
          </motion.p>
        )}
      </div>

      {/* Summary footer */}
      <AnimatePresence>
        {allDone && (
          <motion.footer
            className="relative z-10 flex flex-col items-center gap-4 px-6 pb-8 pt-2"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {pcGained > 0 && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-300">
                <Sparkles className="h-4 w-4" />+{pcGained} PC (doublons)
              </span>
            )}
            <div className="flex gap-3">
              <Link
                to={
                  legendexSeriesParam
                    ? `/legendex?series=${encodeURIComponent(legendexSeriesParam)}`
                    : "/legendex"
                }
                className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                Legendex
              </Link>
              <Link
                to="/shop"
                className="rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Continuer
              </Link>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>

      {/* FUT Reveal overlay */}
      <AnimatePresence>
        {futIdx !== null && (
          <FutReveal card={cards[futIdx].card} onComplete={onFutDone} />
        )}
      </AnimatePresence>
    </div>
  );
}
