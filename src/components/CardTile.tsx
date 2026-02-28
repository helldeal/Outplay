import "../cards.css";
import type { CardWithRelations, Rarity } from "../types";
import { useCardHolo } from "../hooks/useCardHolo";

interface CardTileProps {
  card: CardWithRelations;
  obtainedAt?: string;
  isOwned?: boolean;
}

function rarityNameGradient(rarity: CardWithRelations["rarity"]) {
  switch (rarity) {
    case "LEGENDS":
      return "bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-400";
    case "WORLD_CLASS":
      return "bg-gradient-to-r from-orange-400 to-orange-600";
    case "CHAMPION":
      return "bg-gradient-to-r from-purple-400 to-purple-600";
    case "CHALLENGER":
      return "bg-gradient-to-r from-blue-400 to-blue-600";
    default:
      return "bg-gradient-to-r from-slate-200 to-slate-400";
  }
}

/**
 * Map our rarity system to the CSS data-rarity values
 * that trigger specific holographic effects in cards.css
 */
function mapRarityToCSS(rarity: Rarity): string {
  switch (rarity) {
    case "LEGENDS":
      return "rare rainbow";
    case "WORLD_CLASS":
      return "rare ultra";
    case "CHAMPION":
      return "rare holo vstar";
    case "CHALLENGER":
      return "rare secret";
    default:
      return "common";
  }
}

export function CardTile({ card, obtainedAt, isOwned = true }: CardTileProps) {
  const { cardRef, interacting, handlers } = useCardHolo();
  const cssRarity = mapRarityToCSS(card.rarity);
  const hasHolo = card.rarity !== "ROOKIE";

  return (
    <div
      ref={cardRef}
      className={`card ${interacting ? "interacting" : ""}`}
      data-rarity={cssRarity}
      data-supertype="pokémon"
      {...handlers}
    >
      <div className="card__translater">
        <div className="card__rotator">
          <div className="card__front">
            {/* ---- card content ---- */}
            <article className="card-content relative overflow-hidden rounded-xl bg-slate-900/80">
              <div className="relative overflow-hidden rounded-lg">
                <div className="relative aspect-[3/4] overflow-hidden bg-slate-800">
                  <img
                    src={card.imageUrl}
                    className={`h-full w-full object-cover ${
                      !isOwned ? "grayscale opacity-30" : ""
                    }`}
                    loading="lazy"
                  />

                  <div className="absolute right-3 bottom-3 z-[1] flex flex-col items-center gap-1.5">
                    {card.game?.logoUrl ? (
                      <img
                        src={card.game.logoUrl}
                        alt={card.game.name}
                        className="h-4 w-4 rounded-sm object-contain"
                      />
                    ) : null}

                    {card.nationality?.flagUrl ? (
                      <img
                        src={card.nationality.flagUrl}
                        alt={card.nationality.code ?? "flag"}
                        className="h-4 w-4 rounded-full object-cover"
                      />
                    ) : null}

                    {card.team?.logoUrl ? (
                      <img
                        src={card.team.logoUrl}
                        alt={card.team.name}
                        className="h-5 w-5 rounded-sm object-contain"
                      />
                    ) : null}

                    {card.role?.iconUrl ? (
                      <img
                        src={card.role.iconUrl}
                        alt={card.role.name}
                        className="h-5 w-5 rounded-sm object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-transparent px-3 pb-2 pt-8">
                    <h3
                      className={`inline-block max-w-full truncate text-lg font-bold leading-tight text-transparent bg-clip-text ${rarityNameGradient(card.rarity)}`}
                    >
                      {card.name}
                    </h3>
                  </div>
                </div>

                <div className="p-1.5 px-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    {obtainedAt ? (
                      <span>
                        Obtained {new Date(obtainedAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span></span>
                    )}
                    <span className="font-medium">{card.id}</span>
                  </div>
                </div>
              </div>

              {!isOwned && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px]">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider"></span>
                </div>
              )}
            </article>

            {/* ---- holographic overlays ---- */}
            {hasHolo && <div className="card__shine"></div>}
            <div className="card__glare"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
