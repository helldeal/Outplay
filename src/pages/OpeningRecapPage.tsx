import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Clock3,
  Coins,
  PackageOpen,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { CardTile } from "../components/CardTile";
import { PlayerAvatar } from "../components/leaderboard/PlayerAvatar";
import { PageLoading } from "../components/PageLoading";
import { fetchCardsByIds } from "../query/booster";
import { usePublicOpeningRecapQuery } from "../query/opening-recap";
import type { Rarity } from "../types";
import { rarityLabel, rarityTextColor } from "../utils/rarity";

const intFormatter = new Intl.NumberFormat("fr-FR");

function formatOpenedAt(value: string): string {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function rarityOrder(rarity: Rarity): number {
  switch (rarity) {
    case "ROOKIE":
      return 0;
    case "CHALLENGER":
      return 1;
    case "CHAMPION":
      return 2;
    case "WORLD_CLASS":
      return 3;
    case "LEGENDS":
      return 4;
    default:
      return 99;
  }
}

function computeDuplicateCardIndices(
  cards: Array<{ id: string; pc_value: number }>,
  duplicateCount: number,
  pcGained: number,
): number[] {
  if (duplicateCount <= 0 || cards.length === 0) {
    return [];
  }

  const repeatedIndices: number[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < cards.length; index++) {
    const cardId = cards[index].id;
    if (seen.has(cardId)) {
      repeatedIndices.push(index);
    }
    seen.add(cardId);
  }

  if (repeatedIndices.length === duplicateCount) {
    const repeatedPc = repeatedIndices.reduce(
      (sum, index) => sum + cards[index].pc_value,
      0,
    );
    if (repeatedPc === pcGained) {
      return repeatedIndices;
    }
  }

  const solutions: number[][] = [];
  const current: number[] = [];

  const search = (start: number, left: number, sum: number) => {
    if (left === 0) {
      if (sum === pcGained) {
        solutions.push([...current]);
      }
      return;
    }

    for (let index = start; index <= cards.length - left; index++) {
      current.push(index);
      search(index + 1, left - 1, sum + cards[index].pc_value);
      current.pop();
    }
  };

  search(0, duplicateCount, 0);

  return solutions[0] ?? [];
}

export function OpeningRecapPage() {
  const { openingId } = useParams();
  const openingQuery = usePublicOpeningRecapQuery(openingId);

  const cardsQuery = useQuery({
    queryKey: ["opening-recap-cards", openingId, openingQuery.data?.cardIds],
    enabled: Boolean(openingQuery.data && openingQuery.data.cardIds.length > 0),
    queryFn: () => fetchCardsByIds(openingQuery.data!.cardIds),
  });

  const rarityDistribution = useMemo(() => {
    const cards = cardsQuery.data ?? [];
    const counts = new Map<Rarity, number>();

    for (const card of cards) {
      counts.set(card.rarity, (counts.get(card.rarity) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([rarity, count]) => ({
        rarity,
        count,
        share: cards.length > 0 ? Math.round((count / cards.length) * 100) : 0,
      }))
      .sort((a, b) => rarityOrder(a.rarity) - rarityOrder(b.rarity));
  }, [cardsQuery.data]);

  if (!openingId) {
    return (
      <p className="text-sm text-rose-300">ID d&apos;ouverture invalide.</p>
    );
  }

  if (openingQuery.isLoading) {
    return <PageLoading subtitle="Chargement du recap d'ouverture..." />;
  }

  if (openingQuery.error) {
    return (
      <p className="text-sm text-rose-300">
        {(openingQuery.error as Error).message}
      </p>
    );
  }

  const opening = openingQuery.data;

  if (!opening) {
    return <p className="text-sm text-slate-400">Ouverture introuvable.</p>;
  }

  const cards = cardsQuery.data ?? [];

  const duplicateCardIndexSet = new Set(
    computeDuplicateCardIndices(
      cards,
      opening.duplicateCards,
      opening.pcGained,
    ),
  );

  const sortedCards = [...cards]
    .map((card, index) => ({ card, index }))
    .sort((a, b) => rarityOrder(a.card.rarity) - rarityOrder(b.card.rarity));

  const wasPaidOpening =
    opening.openingType === "SHOP" && opening.boosterPricePc > 0;
  const netPc = opening.pcGained - opening.boosterPricePc;

  return (
    <section className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-900/75 p-5 shadow-[0_20px_60px_rgba(2,6,23,0.55)] md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(34,211,238,0.24),transparent_40%),radial-gradient(circle_at_90%_15%,rgba(251,191,36,0.14),transparent_35%)]" />

        <div className="relative space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">
                Recap ouverture
              </p>
              <h1 className="mt-1 text-2xl font-black text-white md:text-3xl">
                {opening.boosterName ?? "Booster"}
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                {opening.seriesName ?? "Serie inconnue"} · {opening.openingType}
              </p>
            </div>

            <Link
              to={`/profile/${opening.userId}`}
              className="inline-flex items-center gap-2.5 text-sm font-semibold text-white transition hover:text-cyan-100"
            >
              <PlayerAvatar
                avatarUrl={opening.avatarUrl}
                username={opening.username}
                size="md"
              />
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">
                  Ouvert par
                </p>
                <span className="text-lg font-bold text-white">
                  {opening.username}
                </span>
              </div>
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-3">
              <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-slate-400">
                <Clock3 className="h-3.5 w-3.5 text-cyan-300" />
                Date
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {formatOpenedAt(opening.openedAt)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-3">
              <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-slate-400">
                <Coins className="h-3.5 w-3.5 text-amber-300" />
                PC recuperes
              </p>
              <p className="mt-2 text-sm font-black text-amber-300">
                +{intFormatter.format(opening.pcGained)} PC
              </p>
            </div>

            <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-3">
              <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-slate-400">
                <PackageOpen className="h-3.5 w-3.5 text-fuchsia-300" />
                Doublons
              </p>
              <p className="mt-2 text-sm font-black text-fuchsia-200">
                {intFormatter.format(opening.duplicateCards)} / 5
              </p>
            </div>

            <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-3">
              <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-slate-400">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />
                Rentabilite
              </p>
              {wasPaidOpening ? (
                <div className="mt-2 flex flex-row items-end gap-3">
                  <p
                    className={`text-sm font-black ${netPc >= 0 ? "text-emerald-300" : "text-rose-300"}`}
                  >
                    {netPc >= 0 ? "+" : ""}
                    {intFormatter.format(netPc)} PC
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Sur{" "}
                    <span className="text-amber-300 font-semibold">
                      {intFormatter.format(opening.boosterPricePc)} PC
                    </span>{" "}
                    investis
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm font-black text-cyan-200">
                  Ouverture gratuite
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <article className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
        <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.11em] text-white">
          <BarChart3 className="h-4 w-4 text-emerald-300" />
          Distribution des raretes
        </h2>

        {cardsQuery.isLoading ? (
          <p className="mt-3 text-sm text-slate-400">Calcul des raretes...</p>
        ) : cardsQuery.error ? (
          <p className="mt-3 text-sm text-rose-300">
            {(cardsQuery.error as Error).message}
          </p>
        ) : rarityDistribution.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">Aucune carte trouvee.</p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {rarityDistribution.map((entry) => (
              <div
                key={entry.rarity}
                className="rounded-xl border border-slate-700/70 bg-slate-950/55 p-3"
              >
                <p className="mt-1 text-xl font-black text-white">
                  {intFormatter.format(entry.count)}x{" "}
                  <span
                    className={`font-black uppercase ${rarityTextColor(entry.rarity)}`}
                  >
                    {rarityLabel(entry.rarity)}
                  </span>
                </p>
                <p className="text-xs text-slate-400">{entry.share}% du pack</p>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
        <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.11em] text-white">
          <Sparkles className="h-4 w-4 text-cyan-300" />
          Les 5 cartes obtenues
        </h2>

        {cardsQuery.isLoading ? (
          <p className="mt-3 text-sm text-slate-400">
            Chargement des cartes...
          </p>
        ) : cardsQuery.error ? (
          <p className="mt-3 text-sm text-rose-300">
            {(cardsQuery.error as Error).message}
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {sortedCards.map(({ card, index }) => (
              <div key={`${card.id}-${index}`} className="relative">
                <CardTile card={card} isOwned disableExpand={false} />
                {duplicateCardIndexSet.has(index) && (
                  <div className="absolute -top-3 -right-3 z-30 flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 text-xs font-bold text-white shadow-lg shadow-emerald-500/30">
                    <Coins className="h-3.5 w-3.5" />+
                    {intFormatter.format(card.pc_value)} PC
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
