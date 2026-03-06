import { Clock3, LoaderCircle } from "lucide-react";
import type { RecentDrop } from "../../query/leaderboard";
import {
  rarityBorderColor,
  rarityLabel,
  rarityTextColor,
} from "../../utils/rarity";
import { PlayerAvatar } from "./PlayerAvatar";

export function RecentDropsPanel({
  drops,
  noMore,
  loadingMore,
  onLoadMore,
}: {
  drops: RecentDrop[];
  noMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
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
    <aside className="w-full space-y-3 lg:w-80 lg:shrink-0">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-300">
        <Clock3 className="h-4 w-4 text-cyan-300" />
        Dernieres ouvertures
      </h2>

      {drops.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
          Aucune ouverture recente.
        </div>
      ) : (
        <div className="space-y-3">
          {drops.map((drop) => (
            <article
              key={drop.openingId}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"
            >
              <div className="flex items-center gap-2.5">
                <PlayerAvatar
                  avatarUrl={drop.avatarUrl}
                  username={drop.username}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-indigo-300">
                    {drop.username}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {drop.boosterName} · {formatRelativeDate(drop.openedAt)}
                  </p>
                </div>
              </div>

              {drop.bestCardName && (
                <div
                  className={`mt-2 flex items-center gap-3 rounded-lg border bg-slate-950/60 p-2 ${rarityBorderColor(drop.bestCardRarity)}`}
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
            </article>
          ))}

          {!noMore && (
            <button
              disabled={loadingMore}
              onClick={onLoadMore}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-white/5 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              {loadingMore ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              Charger plus
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
