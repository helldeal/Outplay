import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Coins, Gift, LoaderCircle, ShoppingBag } from "lucide-react";
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

  const boosters = boostersQuery.data ?? [];
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
    <section className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
          <ShoppingBag className="h-6 w-6 text-cyan-300" />
          Boutique
        </h1>
        <p className="text-sm text-slate-400">
          Tous les boosters achetables par série. Les daily sont disponibles via
          le bouton du header.
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
              <h2 className="text-lg font-semibold text-white">{entry.name}</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {entry.boosters.map((booster) => (
                <article
                  key={booster.id}
                  className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70"
                >
                  {(booster.image_url ?? entry.coverImage) ? (
                    <img
                      src={booster.image_url ?? entry.coverImage ?? ""}
                      alt={booster.name}
                      className="h-36 w-full object-cover"
                    />
                  ) : (
                    <div className="h-20 bg-slate-800" />
                  )}
                  <div className="space-y-2 p-4">
                    <h3 className="text-lg font-semibold text-white">
                      {booster.name}
                    </h3>
                    <p className="text-sm text-slate-400">{booster.type}</p>
                    <div className="inline-flex items-center gap-1 text-sm text-amber-300">
                      <Coins className="h-4 w-4" />
                      {booster.price_pc} PC
                    </div>
                    <button
                      onClick={() => {
                        void openShopBooster(booster);
                      }}
                      disabled={!user || openingBoosterId !== null}
                      className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {openingBoosterId === booster.id ? (
                        <>
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          Opening...
                        </>
                      ) : (
                        <>
                          <Gift className="h-4 w-4" />
                          Acheter et ouvrir
                        </>
                      )}
                    </button>
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
  );
}
