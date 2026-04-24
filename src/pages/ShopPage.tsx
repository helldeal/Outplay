import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Gift, Info, LoaderCircle, Sparkles, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
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
  openCardCompleterRpc,
  openBoosterRpc,
  useCardCompleterOfferQuery,
  useShopBoostersQuery,
} from "../query/booster";
import type { ShopBoosterWithSeries } from "../query/booster";
import { useSeriesSplitQuery } from "../query/series-split";
import type { CardCompleterOpeningNavigationState } from "./CardCompleterOpeningPage";

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
  const cardCompleterOfferQuery = useCardCompleterOfferQuery(user?.id);
  const seriesSplitQuery = useSeriesSplitQuery(user?.id);
  const [openingError, setOpeningError] = useState<string | null>(null);
  const [openingBoosterId, setOpeningBoosterId] = useState<string | null>(null);
  const [openingCompleter, setOpeningCompleter] = useState(false);
  const [completerError, setCompleterError] = useState<string | null>(null);
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

  const boosters = useMemo(
    () => boostersQuery.data ?? [],
    [boostersQuery.data],
  );
  const cardCompleterOffer = cardCompleterOfferQuery.data;
  const activeSplitSeriesCode = seriesSplitQuery.data?.seriesCode ?? null;
  const orderedBoosters = useMemo(() => {
    if (!activeSplitSeriesCode) {
      return boosters;
    }

    return [...boosters].sort((left, right) => {
      const leftIsSplit = left.series.code === activeSplitSeriesCode;
      const rightIsSplit = right.series.code === activeSplitSeriesCode;

      if (leftIsSplit === rightIsSplit) {
        return left.series.code.localeCompare(right.series.code);
      }

      return leftIsSplit ? -1 : 1;
    });
  }, [activeSplitSeriesCode, boosters]);
  const preloadUrls = useMemo(
    () =>
      orderedBoosters.map(
        (booster) => booster.image_url ?? booster.series.coverImage,
      ),
    [orderedBoosters],
  );
  const { isReady: areBoosterAssetsReady } = useImagePreload(preloadUrls);
  const isBoostersLoading = boostersQuery.isLoading;
  const dropRatesBooster =
    dropRatesModalBoosterId === null
      ? null
      : (boosters.find((booster) => booster.id === dropRatesModalBoosterId) ??
        null);
  const boostersBySeries = orderedBoosters.reduce<
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

  const openCardCompleter = async () => {
    if (!user) {
      setCompleterError("Tu dois être connecté pour utiliser le compléteur.");
      return;
    }

    if (!cardCompleterOffer?.canPurchase) {
      setCompleterError("Ta collection est déjà complète.");
      return;
    }

    const currentPcBalance = profile?.pc_balance ?? 0;
    if (cardCompleterOffer.pricePc > currentPcBalance) {
      setCompleterError(
        `PC insuffisants: il faut ${cardCompleterOffer.pricePc} PC pour utiliser le compléteur.`,
      );
      return;
    }

    setCompleterError(null);
    setOpeningCompleter(true);

    try {
      const result = await openCardCompleterRpc(user.id);
      const winnerCards = await fetchCardsByIds(result.cards ?? []);
      const winner = winnerCards[0];

      if (!winner) {
        throw new Error("Impossible de récupérer la carte gagnée.");
      }

      const previewCardIds = cardCompleterOffer.missingCardIds.slice(0, 120);
      const previewCards = await fetchCardsByIds(previewCardIds);
      const candidates = previewCards.length > 0 ? previewCards : [winner];

      const sequenceLength = 70;
      const sequence = Array.from({ length: sequenceLength }, (_, index) => {
        const candidate =
          candidates[Math.floor(Math.random() * candidates.length)];
        if (index === sequenceLength - 6) {
          return winner;
        }
        return candidate;
      });

      const winnerIndex = sequence.length - 6;

      navigate("/card-completer-opening", {
        state: {
          sequence,
          winner,
          winnerIndex,
          chargedPc: result.chargedPc ?? cardCompleterOffer.pricePc,
        } satisfies CardCompleterOpeningNavigationState,
      });

      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["collection", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
        queryClient.invalidateQueries({
          queryKey: ["card-completer-offer", user.id],
        }),
        refreshProfile(),
      ]).catch(() => undefined);
    } catch (error) {
      setCompleterError(
        error instanceof Error
          ? error.message
          : "Impossible d'utiliser le compléteur.",
      );
    } finally {
      setOpeningCompleter(false);
    }
  };

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
          boosterType: booster.type,
          shopBoosterPricePc: booster.price_pc,
          seriesName: booster.series.name,
          seriesSlug: booster.series.slug,
          seriesCode: booster.series.code,
          source: "SHOP",
          shopBoosterId: booster.id,
        },
      });

      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["collection", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
        queryClient.invalidateQueries({ queryKey: ["series-split", user.id] }),
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
            Shop
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">
            Tous les boosters achetables par série.
          </p>
        </div>

        {openingError ? (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
            {openingError}
          </div>
        ) : null}

        {completerError ? (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
            {completerError}
          </div>
        ) : null}

        <div className="relative overflow-hidden rounded-2xl border border-amber-300/35 bg-[linear-gradient(160deg,rgba(146,64,14,0.25),rgba(15,23,42,0.96))] p-4 shadow-[0_14px_38px_rgba(2,6,23,0.52)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(251,191,36,0.18),transparent_45%)]" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">
                <Sparkles className="h-3 w-3" />
                Compléteur
              </p>
              <h2 className="mt-2 text-xl font-black uppercase italic text-white">
                Cartes manquantes
              </h2>
              <p className="mt-1 text-xs text-slate-300">
                Une carte manquante garantie. Rareté tirée avec les probabilités
                d’un premium booster.
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Manquantes: {cardCompleterOffer?.missingCount ?? 0} · Prix:{" "}
                <span className="font-black text-amber-300">
                  {cardCompleterOffer?.pricePc ?? 0} PC
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void openCardCompleter();
              }}
              disabled={
                !user ||
                openingBoosterId !== null ||
                openingCompleter ||
                cardCompleterOfferQuery.isLoading ||
                !cardCompleterOffer?.canPurchase ||
                (profile?.pc_balance ?? 0) < (cardCompleterOffer?.pricePc ?? 0)
              }
              className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-md border border-amber-300/55 bg-amber-300/20 px-4 py-2 text-sm font-black uppercase tracking-[0.08em] text-amber-100 transition hover:bg-amber-300/30 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {openingCompleter ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Ouverture...
                </>
              ) : cardCompleterOfferQuery.isLoading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Calcul du prix...
                </>
              ) : !cardCompleterOffer?.canPurchase ? (
                "Collection complète"
              ) : (profile?.pc_balance ?? 0) <
                (cardCompleterOffer?.pricePc ?? 0) ? (
                "PC insuffisants"
              ) : (
                <>
                  <Gift className="h-4 w-4" />
                  Acheter
                </>
              )}
            </button>
          </div>
        </div>

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
                id={`shop-series-${entry.code.toLowerCase()}`}
                className={`relative overflow-hidden rounded-2xl border p-4 shadow-[0_12px_38px_rgba(2,6,23,0.45)] ${
                  entry.code === activeSplitSeriesCode
                    ? "border-cyan-300/50 bg-cyan-500/10"
                    : "border-slate-800/90 bg-slate-900/55"
                }`}
              >
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(56,189,248,0.08),transparent_35%,rgba(251,191,36,0.08))]" />

                <div className="relative mb-4 space-y-1">
                  <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">
                    Série {entry.code}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black uppercase italic text-white">
                      {entry.name}
                    </h2>
                    {entry.code === activeSplitSeriesCode ? (
                      <Link
                        to="/series-split"
                        className="ml-2 rounded-full border border-cyan-200/70 bg-cyan-100/95 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-900 hover:bg-white transition"
                      >
                        Split en cours
                      </Link>
                    ) : null}
                  </div>
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
                                  Ouverture...
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
                  Taux de drop
                </p>
                <h3 className="text-xl font-black uppercase italic text-white">
                  {dropRatesBooster.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Compare les probabilités par carte et par booster
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
                ? "Par carte: probabilité qu'une carte tirée soit de cette rareté."
                : `Par booster: probabilité d'obtenir au moins une carte de cette rareté sur ${BOOSTER_DRAW_COUNT} tirages.`}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
