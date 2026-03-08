import { Crown } from "lucide-react";
import type { LeaderboardRow } from "../../query/leaderboard";
import { PlayerAvatar } from "./PlayerAvatar";

const podiumMeta = [
  {
    rank: 2,
    pillar: "h-36 md:h-48",
    pillarBg:
      "bg-gradient-to-b from-slate-300/25 via-slate-500/18 to-slate-800/70",
    ring: "border-slate-400/60 from-slate-300 to-slate-600",
    text: "text-slate-300",
    glow: "",
  },
  {
    rank: 1,
    pillar: "h-48 md:h-64",
    pillarBg:
      "bg-gradient-to-b from-amber-300/35 via-amber-500/22 to-slate-800/78",
    ring: "border-amber-400/60 from-amber-300 to-amber-700",
    text: "text-amber-400",
    glow: "shadow-[0_0_30px_rgba(251,191,36,0.3)]",
  },
  {
    rank: 3,
    pillar: "h-28 md:h-40",
    pillarBg:
      "bg-gradient-to-b from-orange-300/30 via-orange-500/20 to-slate-800/72",
    ring: "border-orange-400/60 from-orange-300 to-orange-700",
    text: "text-orange-400",
    glow: "",
  },
] as const;

export function LeaderboardPodium({
  rows,
  scoreFormatter,
}: {
  rows: LeaderboardRow[];
  scoreFormatter: Intl.NumberFormat;
}) {
  if (rows.length < 3) {
    return null;
  }

  const podiumOrder = [rows[1], rows[0], rows[2]].filter(Boolean);

  return (
    <div className="flex items-end justify-center gap-3 md:gap-8">
      {podiumOrder.map((row, i) => {
        const meta = podiumMeta[i];
        return (
          <div
            key={row.userId}
            className="flex w-1/3 max-w-[220px] flex-col items-center"
          >
            <div className="relative mb-4">
              {meta.rank === 1 && (
                <Crown className="absolute -top-8 left-1/2 h-8 w-8 -translate-x-1/2 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.7)]" />
              )}
              <div
                className={`rounded-full border-2 bg-gradient-to-b p-1 ${meta.ring} ${meta.glow}`}
              >
                <PlayerAvatar
                  avatarUrl={row.avatarUrl}
                  username={row.username}
                  size="lg"
                />
              </div>
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-[10px] font-black text-white text-nowrap">
                {scoreFormatter.format(row.weightedScore)} pts
              </span>
            </div>

            <div
              className={`w-full rounded-t-2xl border-x border-t border-slate-700/50 ${meta.pillarBg} ${meta.pillar} flex flex-col items-center pt-5`}
            >
              <span className={`text-5xl font-black opacity-20 ${meta.text}`}>
                {meta.rank}
              </span>
              <div className="mt-auto pb-4 text-center">
                <p className="truncate px-2 text-sm font-bold text-white">
                  {row.username}
                </p>
                <p className="text-xs text-slate-400">
                  {row.totalCards} cartes
                </p>
                <p className="text-xs text-amber-300">
                  {row.achievementsUnlocked} achievements
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
