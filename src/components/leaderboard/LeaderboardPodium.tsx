import { Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { useInViewOnce } from "../../hooks/useInViewOnce";
import type { LeaderboardRow } from "../../query/leaderboard";
import { getTitleColorClass } from "../../utils/title-style";
import { ScoreBreakdownTooltip } from "../score/ScoreBreakdownTooltip";
import { PlayerAvatar } from "./PlayerAvatar";

const podiumMeta = [
  {
    rank: 2,
    pillar: "h-36 md:h-48",
    pillarBg:
      "bg-gradient-to-b from-slate-300/25 via-slate-500/18 to-slate-800/70",
    ring: "border-slate-400/60 from-slate-300 to-slate-600",
    text: "text-slate-300",
    border: "border-slate-600",
    pointsBg: "bg-slate-300/35 backdrop-blur-sm",
    glow: "",
  },
  {
    rank: 1,
    pillar: "h-48 md:h-64",
    pillarBg:
      "bg-gradient-to-b from-amber-300/35 via-amber-500/22 to-slate-800/78",
    ring: "border-amber-400/60 from-amber-300 to-amber-700",
    text: "text-amber-400",
    border: "border-amber-600",
    pointsBg: "bg-amber-300/35 backdrop-blur-sm",
    glow: "shadow-[0_0_30px_rgba(251,191,36,0.3)]",
  },
  {
    rank: 3,
    pillar: "h-28 md:h-40",
    pillarBg:
      "bg-gradient-to-b from-orange-300/30 via-orange-500/20 to-slate-800/72",
    ring: "border-orange-400/60 from-orange-300 to-orange-700",
    text: "text-orange-400",
    border: "border-orange-600",
    pointsBg: "bg-orange-300/35 backdrop-blur-sm",
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
  const { ref, hasBeenVisible } = useInViewOnce<HTMLDivElement>({
    threshold: 0.3,
    rootMargin: "0px 0px -10% 0px",
  });

  if (rows.length < 3) {
    return null;
  }

  const podiumOrder = [rows[1], rows[0], rows[2]].filter(Boolean);

  return (
    <div ref={ref} className="flex items-end justify-center gap-3 md:gap-8">
      {podiumOrder.map((row, i) => {
        const meta = podiumMeta[i];
        const delayMs = (meta.rank - 1) * 120;

        return (
          <div
            key={row.userId}
            className="flex w-1/3 max-w-[220px] flex-col items-center"
            style={{
              opacity: hasBeenVisible ? 1 : 0,
              transform: hasBeenVisible
                ? "translateY(0px)"
                : "translateY(48px)",
              transitionProperty: "opacity, transform",
              transitionDuration: "650ms",
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
              transitionDelay: `${delayMs}ms`,
            }}
          >
            <Link
              to={`/profile/${row.userId}`}
              className="relative mb-4 transition hover:scale-[1.02]"
            >
              {meta.rank === 1 && (
                <div className="absolute -top-8 left-0 w-full flex justify-center">
                  <Crown className="h-8 w-8 animate-bounce text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.7)]" />
                </div>
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
              <ScoreBreakdownTooltip
                totalScore={row.weightedScore}
                cardScore={row.cardScore}
                achievementScore={row.achievementScore}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2"
                tooltipPositionClassName="left-1/2 top-full -translate-x-1/2"
              >
                <span
                  className={`cursor-help rounded-full border ${meta.border} ${meta.pointsBg} px-2.5 py-0.5 text-[12px] font-black text-nowrap ${meta.text} uppercase`}
                >
                  {scoreFormatter.format(row.weightedScore)} pts
                </span>
              </ScoreBreakdownTooltip>
            </Link>

            <div
              className={`w-full rounded-t-2xl border-x border-t ${meta.border} ${meta.pillarBg} ${meta.pillar} flex flex-col items-center pt-5`}
            >
              <span className={`text-6xl font-black opacity-20 ${meta.text}`}>
                {meta.rank}
              </span>
              <div className="mt-auto pb-4 text-center">
                <p
                  className={`truncate px-2 text-lg font-bold ${getTitleColorClass(
                    row.title,
                  )}`}
                >
                  {row.username}
                </p>
                <p className={`text-xs font-bold uppercase ${meta.text}`}>
                  {row.totalCards} cartes
                </p>
                <p className={`text-xs font-bold uppercase ${meta.text}`}>
                  {row.achievementsUnlocked} achv.
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
