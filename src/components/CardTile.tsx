import { createPortal } from "react-dom";
import { Lock } from "lucide-react";
import "../cards.css";
import type { CSSProperties } from "react";
import type { CardWithRelations, Rarity } from "../types";
import { useCardHolo } from "../hooks/useCardHolo";
import { usePublicCardStatsQuery } from "../query/card-stats";

interface CardTileProps {
  card: CardWithRelations;
  obtainedAt?: string;
  isOwned?: boolean;
  disableExpand?: boolean;
}

const integerFormatter = new Intl.NumberFormat("fr-FR");
const percentFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatInt(value: number): string {
  return integerFormatter.format(Math.round(value));
}

function formatOneIn(value: number | null): string {
  if (value == null) {
    return "—";
  }

  return `1 / ${formatInt(Math.max(1, value))}`;
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

function rarityGlowVars(
  rarity: Rarity,
): CSSProperties & { "--glow"?: string; "--glow-accent"?: string } {
  switch (rarity) {
    case "LEGENDS":
      return {
        "--glow": "#facc15",
        "--glow-accent": "#fb923c",
      };
    case "WORLD_CLASS":
      return {
        "--glow": "#fb923c",
        "--glow-accent": "#f97316",
      };
    case "CHAMPION":
      return {
        "--glow": "#c084fc",
        "--glow-accent": "#a855f7",
      };
    case "CHALLENGER":
      return {
        "--glow": "#60a5fa",
        "--glow-accent": "#2563eb",
      };
    default:
      return {
        "--glow": "#94a3b8",
        "--glow-accent": "#64748b",
      };
  }
}

function CardInner({
  card,
  obtainedAt,
  isOwned,
  hasHolo,
}: {
  card: CardWithRelations;
  obtainedAt?: string;
  isOwned: boolean;
  hasHolo: boolean;
}) {
  return (
    <div className="card__front">
      {/* ---- card content ---- */}
      <article className="card-content relative overflow-hidden rounded-xl bg-slate-900/80 [container-type:inline-size]">
        <div className="relative overflow-hidden rounded-lg">
          <div className="relative aspect-[3/4] overflow-hidden bg-slate-800">
            <img
              src={card.imageUrl}
              alt={card.id}
              className={`h-full w-full object-cover ${
                !isOwned ? "grayscale opacity-30" : ""
              }`}
              loading="lazy"
              draggable={false}
            />

            <div className="absolute right-3 bottom-3 z-[1] flex flex-col items-center gap-1.5">
              {card.game?.logoUrl ? (
                <img
                  src={card.game.logoUrl}
                  alt={card.game.name}
                  className="h-[7cqw] w-[7cqw] rounded-sm object-contain"
                  draggable={false}
                />
              ) : null}

              {card.nationality?.flagUrl ? (
                <img
                  src={card.nationality.flagUrl}
                  alt={card.nationality.code ?? "flag"}
                  className="h-[7cqw] w-[7cqw] rounded-full object-cover"
                  draggable={false}
                />
              ) : null}

              {card.team?.logoUrl ? (
                <img
                  src={card.team.logoUrl}
                  alt={card.team.name}
                  className="h-[8.5cqw] w-[8.5cqw] rounded-sm object-contain"
                  draggable={false}
                />
              ) : null}

              {card.role?.iconUrl ? (
                <img
                  src={card.role.iconUrl}
                  alt={card.role.name}
                  className="h-[8.5cqw] w-[8.5cqw] rounded-sm object-cover"
                  draggable={false}
                />
              ) : null}
            </div>

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-transparent px-[6cqw] pb-[3.8cqw] pt-[16cqw]">
              <h3
                className={`inline-block max-w-full truncate text-[9cqw] font-bold leading-tight text-transparent bg-clip-text ${rarityNameGradient(card.rarity)}`}
              >
                {card.name}
              </h3>
            </div>
          </div>

          <div className="p-[1.4cqw] px-[5cqw]">
            <div className="flex items-center justify-between text-[4.6cqw] text-slate-500">
              {obtainedAt ? (
                <span>
                  Obtenue le {new Date(obtainedAt).toLocaleDateString()}
                </span>
              ) : (
                <span></span>
              )}
              <span className="font-medium">{card.id}</span>
            </div>
          </div>
        </div>

        {!isOwned && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-slate-950/60 backdrop-blur-[2px]">
            <Lock className="h-[16cqw] w-[16cqw] text-slate-400/80" />
          </div>
        )}
      </article>

      {/* ---- holographic overlays ---- */}
      {hasHolo && <div className="card__shine"></div>}
      <div className="card__glare"></div>
    </div>
  );
}

export function CardTile({
  card,
  obtainedAt,
  isOwned = true,
  disableExpand = false,
}: CardTileProps) {
  const { cardRef, interacting, active, closing, close, handlers } =
    useCardHolo({ disabled: !isOwned || disableExpand });
  const statsQuery = usePublicCardStatsQuery(
    active ? card.id : undefined,
    active && isOwned,
  );
  const cssRarity = mapRarityToCSS(card.rarity);
  const glowStyle = rarityGlowVars(card.rarity);
  const hasHolo = card.rarity !== "ROOKIE";
  const showOverlay = active || closing;
  const stats = statsQuery.data;

  const statItems = stats
    ? [
        {
          slot: "top-left",
          label: "Chance",
          value: `${percentFormatter.format(stats.dropRatePct)}% · ${formatOneIn(stats.oneIn)}`,
          kind: "default" as const,
        },
        {
          slot: "top-right",
          label: "Collection",
          value: `${formatInt(stats.ownersCount)} · ${formatInt(stats.totalCardDrops)}`,
          meta: "Possesseurs · Drops",
          kind: "default" as const,
        },
        {
          slot: "bottom-left",
          label: "Top drop",
          value: stats.topHolder?.username ?? "—",
          avatarUrl: stats.topHolder?.avatarUrl ?? null,
          meta: stats.topHolder
            ? `${formatInt(stats.topHolder.drops)} drops`
            : null,
          kind: "profile" as const,
        },
        {
          slot: "bottom-right",
          label: "Premier drop",
          value: stats.firstHolder?.username ?? "—",
          avatarUrl: stats.firstHolder?.avatarUrl ?? null,
          meta: stats.firstHolder?.obtainedAt
            ? new Date(stats.firstHolder.obtainedAt).toLocaleDateString()
            : null,
          kind: "profile" as const,
        },
      ]
    : [];

  return (
    <>
      {/* Invisible placeholder to keep grid slot reserved while active */}
      {active && (
        <div
          data-card-placeholder={card.id}
          className="invisible"
          style={{ aspectRatio: "3/4" }}
        />
      )}

      <div
        ref={cardRef}
        className={`card select-none ${interacting ? "interacting" : ""} ${active ? "active" : ""} ${!isOwned ? "not-owned pointer-events-auto cursor-default" : "cursor-pointer"}`}
        data-rarity={cssRarity}
        data-supertype="pokémon"
        data-card-id={card.id}
        style={glowStyle}
        onDragStart={(event) => event.preventDefault()}
        {...handlers}
      >
        {active && !closing && (
          <div className="card-stats-orbit" aria-live="polite">
            {statsQuery.isLoading && (
              <div className="card-stats-badge card-stats-badge--center card-stats-badge--delay-1">
                <span className="card-stats-badge__label">Stats</span>
                <span className="card-stats-badge__value">Chargement…</span>
              </div>
            )}

            {statsQuery.isError && (
              <div className="card-stats-badge card-stats-badge--center card-stats-badge--delay-1">
                <span className="card-stats-badge__label">Stats</span>
                <span className="card-stats-badge__value">Indisponibles</span>
              </div>
            )}

            {!statsQuery.isLoading &&
              !statsQuery.isError &&
              statItems.map((item, index) => (
                <div
                  key={`${card.id}-${item.slot}`}
                  className={`card-stats-badge card-stats-badge--${item.slot} card-stats-badge--delay-${index + 1}`}
                >
                  <span className="card-stats-badge__label">{item.label}</span>
                  {item.kind === "profile" ? (
                    <div className="card-stats-profile">
                      {item.avatarUrl ? (
                        <img
                          src={item.avatarUrl}
                          alt={item.value}
                          className="card-stats-profile__avatar"
                          loading="lazy"
                          draggable={false}
                        />
                      ) : (
                        <div className="card-stats-profile__avatar card-stats-profile__avatar--placeholder">
                          ?
                        </div>
                      )}
                      <div className="card-stats-profile__text">
                        <span className="card-stats-badge__value">
                          {item.value}
                        </span>
                        {item.meta ? (
                          <span className="card-stats-profile__meta">
                            {item.meta}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="card-stats-badge__value">
                        {item.value}
                      </span>
                      {item.meta ? (
                        <span className="card-stats-profile__meta">
                          {item.meta}
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
              ))}
          </div>
        )}

        <div className="card__translater">
          <div className="card__rotator">
            <CardInner
              card={card}
              obtainedAt={obtainedAt}
              isOwned={isOwned}
              hasHolo={hasHolo}
            />
          </div>
        </div>
      </div>

      {/* Backdrop overlay */}
      {showOverlay &&
        createPortal(
          <div
            className={`card-backdrop ${closing ? "card-backdrop--closing" : ""}`}
            onClick={close}
            aria-hidden="true"
          />,
          document.body,
        )}
    </>
  );
}
