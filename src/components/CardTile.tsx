import { Shield } from "lucide-react";
import { rarityTone } from "../utils/rarity";
import type { CardWithRelations } from "../types";

interface CardTileProps {
  card: CardWithRelations;
  obtainedAt?: string;
  isOwned?: boolean;
}

export function CardTile({ card, obtainedAt, isOwned = true }: CardTileProps) {
  const isLegends = card.rarity === "LEGENDS";

  return (
    <article
      className={`group overflow-hidden rounded-xl bg-slate-900/80 shadow-lg transition hover:-translate-y-0.5 hover:shadow-2xl ${
        isLegends ? "holographic-border p-1" : rarityTone(card.rarity)
      }`}
    >
      <div
        className={`relative rounded-lg overflow-hidden ${isLegends ? "bg-slate-900" : ""}`}
      >
        <div
          className={`relative aspect-[3/4] overflow-hidden bg-slate-800 ${isLegends ? "holographic-foil" : ""}`}
        >
          <img
            src={card.imageUrl}
            alt={card.name}
            className={`h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] ${
              !isOwned ? "grayscale opacity-30" : ""
            }`}
            loading="lazy"
          />
          {!isOwned && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px]">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Not Owned
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2 p-3">
          <h3 className="line-clamp-1 text-sm font-semibold text-slate-100">
            {card.name}
          </h3>

          {card.game && (
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <img
                src={card.game.logoUrl}
                alt={card.game.name}
                className="h-4 w-4 rounded-sm object-cover"
              />
              <span className="line-clamp-1">{card.game.name}</span>
            </div>
          )}

          {card.nationality && (
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <img
                src={card.nationality.flagUrl}
                alt={card.nationality.code ?? "flag"}
                className="h-4 w-4 rounded-full"
              />
              <span>{card.nationality.code}</span>

              {card.team?.logoUrl ? (
                <img
                  src={card.team.logoUrl}
                  alt={card.team.name}
                  className="ml-auto h-6 w-6 rounded-sm object-contain"
                />
              ) : null}

              {card.role?.iconUrl ? (
                <img
                  src={card.role.iconUrl}
                  alt={card.role.name}
                  className="h-5 w-5 rounded-sm object-cover"
                />
              ) : (
                <Shield className="h-4 w-4 text-slate-500" />
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            {obtainedAt ? (
              <span>Obtained {new Date(obtainedAt).toLocaleDateString()}</span>
            ) : (
              <span></span>
            )}
            <span className="font-medium">{card.id}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
