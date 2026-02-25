import { Shield } from "lucide-react";
import { rarityTone } from "../lib/rarity";
import type { CardWithRelations } from "../types";

interface CardTileProps {
  card: CardWithRelations;
  obtainedAt?: string;
}

export function CardTile({ card, obtainedAt }: CardTileProps) {
  return (
    <article
      className={`group overflow-hidden rounded-xl border bg-slate-900/80 shadow-lg shadow-slate-950 transition hover:-translate-y-0.5 hover:shadow-xl ${rarityTone(card.rarity)}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-slate-800">
        <img
          src={card.imageUrl}
          alt={card.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
        <span className="absolute left-2 top-2 rounded bg-slate-950/80 px-2 py-1 text-[10px] font-medium text-slate-200">
          {card.rarity}
        </span>
      </div>

      <div className="space-y-2 p-3">
        <h3 className="line-clamp-1 text-sm font-semibold text-slate-100">
          {card.name}
        </h3>

        <div className="flex items-center gap-2 text-xs text-slate-300">
          <img
            src={card.game.logoUrl}
            alt={card.game.name}
            className="h-4 w-4 rounded-sm object-cover"
          />
          <span className="line-clamp-1">{card.game.name}</span>
        </div>

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
              className="ml-auto h-4 w-4 rounded-sm object-cover"
            />
          ) : null}

          {card.role?.iconUrl ? (
            <img
              src={card.role.iconUrl}
              alt={card.role.name}
              className="h-4 w-4 rounded-sm object-cover"
            />
          ) : (
            <Shield className="h-4 w-4 text-slate-500" />
          )}
        </div>

        {obtainedAt ? (
          <p className="text-[11px] text-slate-500">
            Obtained {new Date(obtainedAt).toLocaleDateString()}
          </p>
        ) : null}
      </div>
    </article>
  );
}
