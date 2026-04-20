import { Clock3, LoaderCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useInViewOnce } from "../../hooks/useInViewOnce";
import type { RecentDrop } from "../../query/leaderboard";
import { resolveBoosterTone } from "../rewards/reward-theme";
import {
  rarityBorderColor,
  rarityLabel,
  rarityTextColor,
} from "../../utils/rarity";
import { getTitleColorClass } from "../../utils/title-style";
import { PlayerAvatar } from "./PlayerAvatar";

function getOpeningTypeTone(openingType: RecentDrop["openingType"]): string {
  switch (openingType) {
    case "SHOP":
      return "text-cyan-200";
    case "DAILY":
      return "text-emerald-200";
    case "STREAK":
      return "text-fuchsia-200";
    case "ACHIEVEMENT":
      return "text-amber-200";
    case "COMPLETER":
      return "text-violet-200";
    default:
      return "text-slate-300";
  }
}

function getOpeningTypeLabel(openingType: RecentDrop["openingType"]): string {
  if (openingType === "COMPLETER") {
    return "COMPLÉTEUR";
  }

  return openingType;
}

function inferBoosterType(
  boosterName: string,
): "NORMAL" | "LUCK" | "PREMIUM" | "GODPACK" | null {
  const value = boosterName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (value.includes("godpack") || value.includes("god pack")) {
    return "GODPACK";
  }

  if (value.includes("premium")) {
    return "PREMIUM";
  }

  if (value.includes("luck")) {
    return "LUCK";
  }

  if (value.includes("normal")) {
    return "NORMAL";
  }

  return null;
}

export function RecentDropsPanel({
  drops,
  page,
  canPrev,
  canNext,
  loadingPage,
  onPrev,
  onNext,
}: {
  drops: RecentDrop[];
  page: number;
  canPrev: boolean;
  canNext: boolean;
  loadingPage: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const navigate = useNavigate();
  const { ref, hasBeenVisible } = useInViewOnce<HTMLElement>({
    threshold: 0.2,
    rootMargin: "0px 0px -8% 0px",
  });

  const formatRelativeDate = (dateIso: string) => {
    const d = new Date(dateIso);
    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <aside ref={ref} className="w-full space-y-3 lg:w-80 lg:shrink-0">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-300">
        <Clock3 className="h-4 w-4 text-cyan-300" />
        Dernières ouvertures
      </h2>

      {drops.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
          Aucune ouverture récente.
        </div>
      ) : (
        <div className="space-y-3">
          {drops.map((drop, index) => (
            <article
              key={drop.openingId}
              className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900/60 p-3 transition hover:border-cyan-300/40"
              onClick={() => {
                navigate(`/opening/${drop.openingId}`);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(`/opening/${drop.openingId}`);
                }
              }}
              role="button"
              tabIndex={0}
              style={{
                opacity: hasBeenVisible ? 1 : 0,
                transform: hasBeenVisible
                  ? "translateY(0px)"
                  : "translateY(24px)",
                transitionProperty: "opacity, transform",
                transitionDuration: "500ms",
                transitionTimingFunction: "ease-out",
                transitionDelay: `${80 + index * 60}ms`,
              }}
            >
              {(() => {
                const boosterType = inferBoosterType(drop.boosterName ?? "");
                const boosterTone = resolveBoosterTone(boosterType);
                const isCompleter = drop.openingType === "COMPLETER";

                return (
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em]">
                    <span className={getOpeningTypeTone(drop.openingType)}>
                      {getOpeningTypeLabel(drop.openingType)}
                    </span>
                    {!isCompleter && boosterType ? (
                      <span className={boosterTone.rewardTextClass}>
                        {boosterType}
                      </span>
                    ) : null}
                    {drop.boosterName ? (
                      <span className="text-slate-400">{drop.boosterName}</span>
                    ) : null}
                  </div>
                );
              })()}
              <div className="flex flex-row gap-3 justify-around items-center">
                <Link
                  to={`/profile/${drop.userId}`}
                  className="flex items-center gap-2.5 transition hover:text-cyan-100"
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <PlayerAvatar
                    avatarUrl={drop.avatarUrl}
                    username={drop.username}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-semibold ${getTitleColorClass(
                        drop.title,
                      )}`}
                    >
                      {drop.username}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatRelativeDate(drop.openedAt)}
                    </p>
                  </div>
                </Link>

                {drop.bestCardName && (
                  <div
                    className={`flex flex-1 items-center gap-3 rounded-lg border bg-slate-950/60 p-2 ${rarityBorderColor(drop.bestCardRarity)}`}
                  >
                    <div className="h-11 w-8 shrink-0 overflow-hidden rounded bg-black">
                      {drop.bestCardImageUrl && (
                        <img
                          src={drop.bestCardImageUrl}
                          alt={drop.bestCardName}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-[9px] font-black uppercase tracking-wider ${rarityTextColor(drop.bestCardRarity)}`}
                      >
                        {rarityLabel(drop.bestCardRarity)}
                      </p>
                      <p className="truncate text-xs font-bold text-white">
                        {drop.bestCardName}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))}

          <div className="grid grid-cols-3 items-center gap-2">
            <button
              disabled={!canPrev || loadingPage}
              onClick={onPrev}
              className="flex items-center justify-center rounded-xl border border-slate-800 bg-white/5 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              Précédent
            </button>

            <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400">
              Page {page + 1}
            </p>

            <button
              disabled={!canNext || loadingPage}
              onClick={onNext}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-white/5 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              {loadingPage ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              Suivant
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
