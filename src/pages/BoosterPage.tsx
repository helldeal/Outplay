import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Coins } from "lucide-react";
import { useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { CardTile } from "../components/CardTile";
import { normalizeCard } from "../lib/normalize";
import { supabase } from "../lib/supabase";
import type { Booster, CardWithRelations, Series } from "../types";

interface OpenBoosterResponse {
  openingId: string;
  boosterId: string;
  seriesId: string;
  cards: string[];
  pcGained: number;
  chargedPc: number;
  type: "SHOP" | "DAILY";
}

export function BoosterPage() {
  const { series: seriesSlug = "" } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [openingError, setOpeningError] = useState<string | null>(null);
  const [openedCards, setOpenedCards] = useState<CardWithRelations[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [pcGained, setPcGained] = useState(0);
  const [chargedPc, setChargedPc] = useState(0);
  const [openingBoosterId, setOpeningBoosterId] = useState<string | null>(null);

  const seriesQuery = useQuery({
    queryKey: ["booster-series", seriesSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("series")
        .select("id, name, slug, code, coverImage")
        .or(`slug.eq.${seriesSlug},code.eq.${seriesSlug}`)
        .single();

      if (error) {
        throw error;
      }

      return data as Series;
    },
  });

  const boostersQuery = useQuery({
    queryKey: ["booster-list", seriesQuery.data?.id],
    enabled: Boolean(seriesQuery.data?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boosters")
        .select("id, name, type, price_pc, image_url, is_daily_only")
        .eq("series_id", seriesQuery.data!.id)
        .eq("is_daily_only", false)
        .order("price_pc", { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []) as Booster[];
    },
  });

  useEffect(() => {
    if (openedCards.length === 0) {
      return;
    }

    setRevealedCount(1);
    const timer = window.setInterval(() => {
      setRevealedCount((current) => {
        if (current >= openedCards.length) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, 650);

    return () => window.clearInterval(timer);
  }, [openedCards]);

  const openBooster = async (booster: Booster) => {
    if (!user) {
      setOpeningError("Tu dois être connecté pour ouvrir un booster.");
      return;
    }

    setOpeningError(null);
    setOpeningBoosterId(booster.id);

    try {
      const { data, error } = await supabase.rpc("open_booster", {
        p_booster_id: booster.id,
        p_user_id: user.id,
      });

      if (error) {
        throw error;
      }

      const result = data as OpenBoosterResponse;
      const cardIds = result.cards ?? [];

      const { data: cardRows, error: cardError } = await supabase
        .from("cards")
        .select(
          `
            id,
            name,
            rarity,
            imageUrl,
            pc_value,
            game:games(name, logoUrl),
            team:teams(name, logoUrl),
            nationality:nationalities(code, flagUrl),
            role:roles(name, iconUrl)
          `,
        )
        .in("id", cardIds);

      if (cardError) {
        throw cardError;
      }

      const normalizedCards = (cardRows ?? []).map((row) =>
        normalizeCard(row as never),
      );
      const cardById = new Map(
        normalizedCards.map((card: CardWithRelations) => [card.id, card]),
      );
      const ordered = cardIds
        .map((id) => cardById.get(id))
        .filter((card): card is CardWithRelations => Boolean(card));

      setOpenedCards(ordered);
      setPcGained(result.pcGained ?? 0);
      setChargedPc(result.chargedPc ?? 0);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["collection", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
      ]);
    } catch (err) {
      setOpeningError(
        err instanceof Error ? err.message : "Impossible d’ouvrir ce booster.",
      );
    } finally {
      setOpeningBoosterId(null);
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    }
  };

  if (seriesQuery.isLoading) {
    return <p className="text-sm text-slate-400">Chargement des boosters...</p>;
  }

  if (seriesQuery.error) {
    return (
      <p className="text-sm text-rose-300">
        {(seriesQuery.error as Error).message}
      </p>
    );
  }

  const series = seriesQuery.data;
  const boosters = boostersQuery.data ?? [];

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <h1 className="text-2xl font-semibold text-white">
          Booster Opening • {series?.name}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Flow: Open → RPC `open_booster` → reveal animé (fade + flip) carte par
          carte.
        </p>
      </div>

      {openingError ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          {openingError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {boosters.map((booster) => (
          <div
            key={booster.id}
            className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"
          >
            <img
              src={booster.image_url ?? series?.coverImage ?? ""}
              alt={booster.name}
              className="h-28 w-full rounded-md object-cover"
            />
            <h2 className="mt-3 text-lg font-semibold text-white">
              {booster.name}
            </h2>
            <p className="text-sm text-slate-400">{booster.type}</p>
            <div className="mt-2 flex items-center gap-1 text-sm text-amber-300">
              <Coins className="h-4 w-4" />
              {booster.price_pc} PC
            </div>
            <button
              onClick={() => void openBooster(booster)}
              disabled={!user || openingBoosterId !== null}
              className="mt-4 w-full rounded-md bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {openingBoosterId === booster.id ? "Opening..." : "Open"}
            </button>
          </div>
        ))}
      </div>

      {openedCards.length > 0 ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-sm text-slate-200">
            <span className="mr-4">PC spent: {chargedPc}</span>
            <span className="text-emerald-300">
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
      ) : null}
    </section>
  );
}
