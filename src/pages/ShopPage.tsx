import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Gift, LoaderCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { PageLoading } from "../components/PageLoading";
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

export function ShopPage() {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const boostersQuery = useShopBoostersQuery();
  const [openingError, setOpeningError] = useState<string | null>(null);
  const [openingBoosterId, setOpeningBoosterId] = useState<string | null>(null);
  const [dropRatesModalBoosterId, setDropRatesModalBoosterId] = useState<
    string | null
  >(null);

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

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["collection", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
      ]);

      await refreshProfile();

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

  if (boostersQuery.isLoading || !areBoosterAssetsReady) {
    return (
      <PageLoading title="Boutique" subtitle="Chargement de la boutique…" />
    );
  }

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
          <h1 className="flex items-center justify-center gap-2 text-4xl font-black uppercase italic tracking-tight text-white md:text-6xl">
            Boutique
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">
            Tous les boosters achetables par série. Les daily sont disponibles
            via le bouton du header.
          </p>
        </div>

        {openingError ? (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
            {openingError}
          </div>
        ) : null}

        <div className="space-y-8">
          {Array.from(boostersBySeries.entries()).map(([seriesId, entry]) => (
            <div key={seriesId} className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">
                  Series {entry.code}
                </p>
                <h2 className="text-xl font-black uppercase italic text-white">
                  {entry.name}
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {entry.boosters.map((booster) => (
                  <article
                    key={booster.id}
                    className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50"
                  >
                    <div className="p-4 pb-0">
                      {(booster.image_url ?? entry.coverImage) ? (
                        <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
                          <div className="aspect-[3/4]">
                            <img
                              src={booster.image_url ?? entry.coverImage ?? ""}
                              alt={booster.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-[3/4] rounded-lg border border-slate-700 bg-slate-800" />
                      )}
                    </div>
                    <div className="space-y-2 p-4">
                      <h3 className="text-lg font-black uppercase italic text-white">
                        {booster.name}
                      </h3>
                      <p className="text-sm text-slate-400">{booster.type}</p>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => {
                            void openShopBooster(booster);
                          }}
                          disabled={!user || openingBoosterId !== null}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {openingBoosterId === booster.id ? (
                            <>
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                              Opening...
                            </>
                          ) : (
                            <>
                              <Gift className="h-4 w-4" />
                              Acheter {booster.price_pc} PC
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setDropRatesModalBoosterId(booster.id);
                          }}
                          className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-200 transition hover:bg-slate-700"
                        >
                          Voir les taux
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>

        {boosters.length === 0 ? (
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
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-cyan-400/25 bg-slate-950/95 p-5 shadow-[0_30px_80px_rgba(2,6,23,0.75)]"
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
                  Probabilites par rarete pour ce booster
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

            <ul className="relative space-y-2 rounded-2xl border border-slate-800/90 bg-slate-900/60 p-3 text-sm text-slate-200">
              {dropRateOrder
                .filter(
                  (rarity) => dropRatesBooster.drop_rates[rarity] !== undefined,
                )
                .map((rarity) => {
                  const pct = Number(dropRatesBooster.drop_rates[rarity] ?? 0);
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
                          {pct}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${rarityBarTone[rarity] ?? "from-cyan-300 to-cyan-500"}`}
                          style={{
                            width: `${Math.max(0, Math.min(100, pct))}%`,
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
