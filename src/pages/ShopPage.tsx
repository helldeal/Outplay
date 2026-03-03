import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Gift, LoaderCircle, ShoppingBag, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
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

  const boosters = boostersQuery.data ?? [];
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

  if (boostersQuery.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-400">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Chargement de la boutique...
      </p>
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
      <section className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
            <ShoppingBag className="h-6 w-6 text-cyan-300" />
            Boutique
          </h1>
          <p className="text-sm text-slate-400">
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
                <h2 className="text-lg font-semibold text-white">
                  {entry.name}
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {entry.boosters.map((booster) => (
                  <article
                    key={booster.id}
                    className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70"
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
                      <h3 className="text-lg font-semibold text-white">
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
                          className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
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
          <div className="rounded-md border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-400">
            Aucun booster achetable disponible.
          </div>
        ) : null}
      </section>

      {dropRatesBooster ? (
        <div
          className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => {
            setDropRatesModalBoosterId(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.08em] text-cyan-300">
                  Taux de drop
                </p>
                <h3 className="text-lg font-semibold text-white">
                  {dropRatesBooster.name}
                </h3>
              </div>
              <button
                className="rounded-md p-1 text-slate-300 transition hover:bg-slate-800 hover:text-white"
                onClick={() => {
                  setDropRatesModalBoosterId(null);
                }}
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ul className="space-y-1 rounded-md border border-slate-700 bg-slate-800/70 p-3 text-sm text-slate-200">
              {dropRateOrder
                .filter(
                  (rarity) => dropRatesBooster.drop_rates[rarity] !== undefined,
                )
                .map((rarity) => (
                  <li
                    key={rarity}
                    className="flex items-center justify-between"
                  >
                    <span className="text-slate-300">{rarity}</span>
                    <span className="text-amber-300">
                      {dropRatesBooster.drop_rates[rarity]}%
                    </span>
                  </li>
                ))}
            </ul>

            {dropRateOrder.every(
              (rarity) => dropRatesBooster.drop_rates[rarity] === undefined,
            ) ? (
              <p className="mt-3 text-sm text-slate-400">
                Aucun taux disponible.
              </p>
            ) : null}

            <div className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-400">
              D'autres informations sur le booster seront ajoutées ici.
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
