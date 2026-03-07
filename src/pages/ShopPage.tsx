import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Gift, Info, LoaderCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import {
  BoosterTypeBadge,
  resolveBoosterTone,
} from "../components/rewards/reward-theme";
import { useImagePreload } from "../hooks/useImagePreload";
import { rarityLabel, rarityTextColor } from "../utils/rarity";
import {
  computeDuplicateIndices,
  fetchCardsByIds,
  getOwnedCardIds,
  openBoosterRpc,
  useShopBoostersQuery,
} from "../query/booster";
import type { ShopBoosterWithSeries } from "../query/booster";

const BOOSTER_DRAW_COUNT = 5;

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function atLeastOneInBoosterRate(singleDrawPercent: number) {
  const p = clampPercent(singleDrawPercent) / 100;
  return (1 - Math.pow(1 - p, BOOSTER_DRAW_COUNT)) * 100;
}

export function ShopPage() {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const boostersQuery = useShopBoostersQuery();
  const [openingError, setOpeningError] = useState<string | null>(null);
  const [openingBoosterId, setOpeningBoosterId] = useState<string | null>(null);
  const [dropRatesModalBoosterId, setDropRatesModalBoosterId] = useState<
    string | null
  >(null);
  const [dropRatesModalView, setDropRatesModalView] = useState<
    "CARD" | "BOOSTER"
  >("CARD");

  const dropRateOrder = [
    "LEGENDS",
    "WORLD_CLASS",
    "CHAMPION",
    "CHALLENGER",
    "ROOKIE",
  ];
  const rarityBarTone: Record<string, string> = {
    LEGENDS: "from-amber-300 via-amber-400 to-amber-500",
    WORLD_CLASS: "from-orange-300 via-orange-400 to-orange-500",
    CHAMPION: "from-purple-300 via-purple-400 to-purple-500",
    CHALLENGER: "from-blue-300 via-blue-400 to-blue-500",
    ROOKIE: "from-zinc-300 via-zinc-400 to-zinc-500",
  };

  const boosters = boostersQuery.data ?? [];
  const preloadUrls = useMemo(
    () =>
      boosters.map((booster) => booster.image_url ?? booster.series.coverImage),
    [boosters],
  );
  const { isReady: areBoosterAssetsReady } = useImagePreload(preloadUrls);
  const isBoostersLoading = boostersQuery.isLoading;
  const dropRatesBooster =
    dropRatesModalBoosterId === null
      ? null
      : (boosters.find((booster) => booster.id === dropRatesModalBoosterId) ??
        null);
  const boostersBySeries = boosters.reduce<
    Map<
      string,
      {
        name: string;
        code: string;
        coverImage?: string | null;
        boosters: ShopBoosterWithSeries[];
      }
    >
  >((accumulator, booster) => {
    const existing = accumulator.get(booster.series.id);
    if (existing) {
      existing.boosters.push(booster);
      return accumulator;
    }

    accumulator.set(booster.series.id, {
      name: booster.series.name,
      code: booster.series.code,
      coverImage: booster.series.coverImage,
      boosters: [booster],
    });

    return accumulator;
  }, new Map());

  const openShopBooster = async (booster: ShopBoosterWithSeries) => {
    if (!user) {
      setOpeningError("Tu dois être connecté pour ouvrir un booster.");
      return;
    }

    const currentPcBalance = profile?.pc_balance ?? 0;
    if (booster.price_pc > currentPcBalance) {
      setOpeningError(
        `PC insuffisants: il faut ${booster.price_pc} PC pour ouvrir ce booster.`,
      );
      return;
    }

    setOpeningError(null);
    setOpeningBoosterId(booster.id);

    try {
      const ownedBefore = await getOwnedCardIds(user.id);
      const result = await openBoosterRpc(booster.id, user.id);
      const cardIds = result.cards ?? [];
      const openedCards = await fetchCardsByIds(cardIds);
      const duplicateCardIndices = computeDuplicateIndices(
        cardIds,
        ownedBefore,
      );

      navigate("/booster-opening", {
        state: {
          openedCards,
          duplicateCardIndices,
          pcGained: result.pcGained ?? 0,
          chargedPc: result.chargedPc ?? 0,
          boosterName: booster.name,
          seriesName: booster.series.name,
          seriesSlug: booster.series.slug,
          seriesCode: booster.series.code,
        },
      });

      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["collection", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
        refreshProfile(),
      ]).catch(() => undefined);
    } catch (error) {
      setOpeningError(
        error instanceof Error
          ? error.message
          : "Impossible d’ouvrir ce booster.",
      );
    } finally {
      setOpeningBoosterId(null);
    }
  };

  if (boostersQuery.error) {
    return (
      <p className="text-sm text-rose-300">
        {(boostersQuery.error as Error).message}
      </p>
    );
  }

  return (
    <>
      <section className="space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-black uppercase italic tracking-tight text-white md:text-6xl">
            Boutique
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">
            Tous les boosters achetables par serie.
          </p>
        </div>

        {openingError ? (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
            {openingError}
          </div>
        ) : null}

        <div className="space-y-8">
          {isBoostersLoading && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-[3/4] animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60"
                />
              ))}
            </div>
          )}

          {!isBoostersLoading &&
            Array.from(boostersBySeries.entries()).map(([seriesId, entry]) => (
              <div
                key={seriesId}
                className="relative overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-900/55 p-4 shadow-[0_12px_38px_rgba(2,6,23,0.45)]"
              >
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(56,189,248,0.08),transparent_35%,rgba(251,191,36,0.08))]" />

                <div className="relative mb-4 space-y-1">
                  <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">
                    Series {entry.code}
                  </p>
                  <h2 className="text-xl font-black uppercase italic text-white">
                    {entry.name}
                  </h2>
                </div>

                <div className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {entry.boosters.map((booster) => {
                    const tone = resolveBoosterTone(booster.type);
                    const coverUrl =
                      booster.image_url ?? entry.coverImage ?? "";
                    const canAfford =
                      (profile?.pc_balance ?? 0) >= booster.price_pc;

                    return (
                      <article
                        key={booster.id}
                        className={`group relative isolate flex h-full flex-col overflow-hidden rounded-[18px] border border-slate-700/80 bg-[linear-gradient(160deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))] p-2.5 shadow-[0_12px_30px_rgba(2,6,23,0.48)] transition duration-300 hover:-translate-y-0.5 ${tone.shopCardHoverClass}`}
                      >
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(255,255,255,0.1),transparent_36%),linear-gradient(130deg,rgba(255,255,255,0.06),transparent_42%,rgba(255,255,255,0.02))] opacity-70" />
                        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <div className="absolute -left-1/2 top-0 h-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-90 transition-transform duration-700 group-hover:translate-x-[420%]" />
                        </div>

                        <div className="relative rounded-xl border border-slate-700/80 bg-slate-950/85 p-1.5 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.1)]">
                          {coverUrl ? (
                            <div className="overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900/90">
                              <div className="aspect-[3/4]">
                                <img
                                  src={coverUrl}
                                  alt={booster.name}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="aspect-[3/4] rounded-xl border border-slate-700/70 bg-slate-900/80" />
                          )}
                        </div>

                        <div className="relative mt-2.5 flex grow flex-col space-y-2 px-1 pb-1">
                          <h3 className="line-clamp-1 text-base font-black uppercase italic text-white">
                            {booster.name}
                          </h3>
                          <div className="flex items-center justify-between gap-2">
                            <BoosterTypeBadge boosterType={booster.type} />
                            <span className="text-xs font-black uppercase tracking-[0.14em] text-amber-300">
                              {booster.price_pc} PC
                            </span>
                          </div>

                          <div className="mt-auto flex gap-2 pt-2">
                            <button
                              onClick={() => {
                                void openShopBooster(booster);
                              }}
                              disabled={
                                !user || openingBoosterId !== null || !canAfford
                              }
                              title={
                                canAfford
                                  ? "Ouvrir ce booster"
                                  : `PC insuffisants (${booster.price_pc} requis)`
                              }
                              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${tone.shopBuyButtonClass}`}
                            >
                              {openingBoosterId === booster.id ? (
                                <>
                                  <LoaderCircle className="h-4 w-4 animate-spin" />
                                  Opening...
                                </>
                              ) : (
                                <>
                                  <Gift className="h-4 w-4" />
                                  {canAfford ? "Acheter" : "PC insuffisants"}
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setDropRatesModalView("CARD");
                                setDropRatesModalBoosterId(booster.id);
                              }}
                              className="inline-flex items-center justify-center rounded-md border border-slate-600 bg-slate-800/90 px-2.5 py-2 text-slate-200 transition hover:border-cyan-400/70 hover:bg-slate-700 hover:text-cyan-100"
                              aria-label={`Informations des taux pour ${booster.name}`}
                              title="Informations des taux"
                            >
                              <Info className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}

          {!isBoostersLoading && !areBoosterAssetsReady && (
            <p className="text-xs text-slate-400">
              Préchargement des visuels en cours...
            </p>
          )}
        </div>

        {!isBoostersLoading && boosters.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
            Aucun booster achetable disponible.
          </div>
        ) : null}
      </section>

      {dropRatesBooster ? (
        <div
          className="fixed inset-0 z-[10010] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
          onClick={() => {
            setDropRatesModalBoosterId(null);
          }}
        >
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-cyan-400/25 bg-slate-950/95 p-5 shadow-[0_30px_80px_rgba(2,6,23,0.75)]"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />

            <div className="relative mb-4 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="inline-flex rounded-full border border-cyan-300/40 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
                  Drop Rates
                </p>
                <h3 className="text-xl font-black uppercase italic text-white">
                  {dropRatesBooster.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Compare les probabilites par carte et par booster
                </p>
              </div>
              <button
                className="rounded-md border border-slate-700 bg-slate-900/80 p-1.5 text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white"
                onClick={() => {
                  setDropRatesModalBoosterId(null);
                }}
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative mb-3 inline-flex rounded-xl border border-slate-700/80 bg-slate-900/80 p-1">
              <button
                type="button"
                onClick={() => {
                  setDropRatesModalView("CARD");
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] transition ${
                  dropRatesModalView === "CARD"
                    ? "bg-cyan-400 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Par carte
              </button>
              <button
                type="button"
                onClick={() => {
                  setDropRatesModalView("BOOSTER");
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] transition ${
                  dropRatesModalView === "BOOSTER"
                    ? "bg-cyan-400 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Par booster
              </button>
            </div>

            <ul className="relative space-y-2 rounded-2xl border border-slate-800/90 bg-slate-900/60 p-3 text-sm text-slate-200">
              {dropRateOrder
                .filter(
                  (rarity) => dropRatesBooster.drop_rates[rarity] !== undefined,
                )
                .map((rarity) => {
                  const cardPct = Number(
                    dropRatesBooster.drop_rates[rarity] ?? 0,
                  );
                  const displayPct =
                    dropRatesModalView === "CARD"
                      ? clampPercent(cardPct)
                      : atLeastOneInBoosterRate(cardPct);

                  return (
                    <li
                      key={rarity}
                      className="rounded-xl border border-slate-800 bg-slate-950/80 p-2.5"
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-black uppercase tracking-wide ${rarityTextColor(rarity)}`}
                        >
                          {rarityLabel(rarity)}
                        </span>
                        <span className="text-sm font-black text-white">
                          {displayPct.toFixed(2)}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${rarityBarTone[rarity] ?? "from-cyan-300 to-cyan-500"}`}
                          style={{
                            width: `${displayPct}%`,
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
            </ul>

            {dropRateOrder.every(
              (rarity) => dropRatesBooster.drop_rates[rarity] === undefined,
            ) ? (
              <p className="mt-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-400">
                Aucun taux disponible.
              </p>
            ) : null}

            <p className="mt-3 text-xs text-slate-400">
              {dropRatesModalView === "CARD"
                ? "Par carte: probabilite qu'une carte tiree soit de cette rarete."
                : `Par booster: probabilite d'obtenir au moins une carte de la rarete sur ${BOOSTER_DRAW_COUNT} tirages.`}
            </p>

            <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-[11px] uppercase tracking-wide text-slate-500">
              <span>Data live</span>
              <span>Outplay odds panel</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
