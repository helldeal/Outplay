import { Coins, Dices, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useInViewOnce } from "../../hooks/useInViewOnce";
import { PlayerAvatar } from "./PlayerAvatar";
import type { LeaderboardMatrixPlayer } from "../../query/leaderboard";
import { Link } from "react-router-dom";
import { getTitleColorClass } from "../../utils/title-style";

interface MatrixPoint {
  userId: string;
  username: string;
  title: string | null;
  avatarUrl: string | null;
  isCurrentUser: boolean;
  xPct: number;
  yPct: number;
  xValue: number;
  yValue: number;
}

const MATRIX_EDGE_PADDING = 6;
const MATRIX_SPREAD_MULTIPLIER = 2;

function clampPercent(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeDeltaToPct(
  delta: number,
  halfSpan: number,
  spreadMultiplier = 1,
): number {
  const safeSpan = Math.max(halfSpan, 1e-6);
  const usableHalf = (100 - MATRIX_EDGE_PADDING * 2) / 2;
  const centered = 50 + ((delta * spreadMultiplier) / safeSpan) * usableHalf;

  return clampPercent(centered, MATRIX_EDGE_PADDING, 100 - MATRIX_EDGE_PADDING);
}

function getHalfSpanFromAverage(
  values: number[],
  average: number,
  minHalfSpan: number,
): number {
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const distanceToMin = Math.abs(average - minValue);
  const distanceToMax = Math.abs(maxValue - average);

  return Math.max(minHalfSpan, distanceToMin, distanceToMax);
}

function buildCenteredPoints(
  players: LeaderboardMatrixPlayer[],
  currentUserId: string,
  xAccessor: (player: LeaderboardMatrixPlayer) => number,
  yAccessor: (player: LeaderboardMatrixPlayer) => number,
  minSpan: { x: number; y: number },
): MatrixPoint[] {
  if (players.length === 0) {
    return [];
  }

  const averageX =
    players.reduce((sum, player) => sum + xAccessor(player), 0) /
    players.length;
  const averageY =
    players.reduce((sum, player) => sum + yAccessor(player), 0) /
    players.length;

  const xValues = players.map((player) => xAccessor(player));
  const yValues = players.map((player) => yAccessor(player));

  const deltas = players.map((player) => ({
    player,
    deltaX: xAccessor(player) - averageX,
    deltaY: yAccessor(player) - averageY,
  }));

  const halfSpanX = getHalfSpanFromAverage(xValues, averageX, minSpan.x);
  const halfSpanY = getHalfSpanFromAverage(yValues, averageY, minSpan.y);

  return deltas.map(({ player, deltaX, deltaY }) => ({
    userId: player.userId,
    username: player.username,
    title: player.title,
    avatarUrl: player.avatarUrl,
    isCurrentUser: player.userId === currentUserId,
    xPct: normalizeDeltaToPct(deltaX, halfSpanX, MATRIX_SPREAD_MULTIPLIER),
    yPct: normalizeDeltaToPct(deltaY, halfSpanY, MATRIX_SPREAD_MULTIPLIER),
    xValue: xAccessor(player),
    yValue: yAccessor(player),
  }));
}

function formatPercent(value: number): string {
  return `${Math.max(0, value).toFixed(2)}%`;
}

function formatPc(value: number): string {
  return `${Math.max(0, value).toFixed(1)} PC`;
}

function formatRatio(value: number): string {
  return `${Math.max(0, value).toFixed(2)}x`;
}

function safeRatio(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || numerator <= 0) {
    return 0;
  }

  if (!Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }

  return numerator / denominator;
}

function MatrixCard({
  title,
  subtitle,
  icon,
  points,
  cornerLabels,
  tooltipFormatter,
  selectedUserId,
  onSelectUser,
  animationDelay,
  hasBeenVisible,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  points: MatrixPoint[];
  cornerLabels: {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
  };
  tooltipFormatter: (point: MatrixPoint) => string;
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
  animationDelay: number;
  hasBeenVisible: boolean;
}) {
  const topPlayers = points.filter((point) => !point.isCurrentUser);

  return (
    <article
      className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4"
      style={{
        opacity: hasBeenVisible ? 1 : 0,
        transform: hasBeenVisible ? "translateY(0px)" : "translateY(32px)",
        transitionProperty: "opacity, transform",
        transitionDuration: "600ms",
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        transitionDelay: `${animationDelay}ms`,
      }}
    >
      <h3 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.11em] text-white">
        {icon}
        {title}
      </h3>
      <p className="mt-1 text-xs text-slate-400">{subtitle}</p>

      <div className="mt-3 rounded-xl border border-slate-700/70 bg-slate-950/55 p-3">
        <div className="relative h-64 overflow-hidden rounded-lg border border-slate-800 bg-[radial-gradient(circle_at_18%_10%,rgba(34,211,238,0.14),transparent_38%),radial-gradient(circle_at_82%_85%,rgba(168,85,247,0.14),transparent_38%)]">
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            <div className="border-r border-b border-slate-800/70" />
            <div className="border-b border-slate-800/70" />
            <div className="border-r border-slate-800/70" />
            <div />
          </div>

          {topPlayers.map((point) => {
            const isSelected = selectedUserId === point.userId;

            return (
              <button
                key={point.userId}
                type="button"
                className={`absolute z-10 -translate-x-1/2 translate-y-1/2 rounded-full transition ${isSelected ? "ring-2 ring-cyan-200/90" : "ring-0"}`}
                style={{ left: `${point.xPct}%`, bottom: `${point.yPct}%` }}
                title={tooltipFormatter(point)}
                onClick={() => onSelectUser(point.userId)}
              >
                <PlayerAvatar
                  avatarUrl={point.avatarUrl}
                  username={point.username}
                  size="xs"
                />
              </button>
            );
          })}

          {points
            .filter((point) => point.isCurrentUser)
            .map((point) => {
              const isSelected = selectedUserId === point.userId;

              return (
                <button
                  key={point.userId}
                  type="button"
                  className={`absolute z-20 -translate-x-1/2 translate-y-1/2 rounded-full transition ${isSelected ? "ring-2 ring-amber-200" : "ring-0"}`}
                  style={{ left: `${point.xPct}%`, bottom: `${point.yPct}%` }}
                  title={tooltipFormatter(point)}
                  onClick={() => onSelectUser(point.userId)}
                >
                  <PlayerAvatar
                    avatarUrl={point.avatarUrl}
                    username={point.username}
                    size="xs"
                  />
                </button>
              );
            })}

          <p className="absolute left-2 top-2 z-30 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-300/90">
            {cornerLabels.topLeft}
          </p>
          <p className="absolute right-2 top-2 z-30 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-300/90">
            {cornerLabels.topRight}
          </p>
          <p className="absolute left-2 bottom-2 z-30 text-[10px] font-bold uppercase tracking-[0.1em] text-cyan-300/90">
            {cornerLabels.bottomLeft}
          </p>
          <p className="absolute right-2 bottom-2 z-30 text-[10px] font-bold uppercase tracking-[0.1em] text-rose-300/90">
            {cornerLabels.bottomRight}
          </p>
        </div>
      </div>
    </article>
  );
}

export function LeaderboardMatrices({
  players,
  currentUserId,
}: {
  players: LeaderboardMatrixPlayer[];
  currentUserId: string;
}) {
  const { ref, hasBeenVisible } = useInViewOnce<HTMLElement>({
    threshold: 0.18,
    rootMargin: "0px 0px -6% 0px",
  });
  const sortedPlayers = players
    .slice()
    .sort((a, b) => a.leaderboardPosition - b.leaderboardPosition);

  const chancePoints = buildCenteredPoints(
    sortedPlayers,
    currentUserId,
    (player) => player.duplicateRate,
    (player) => player.bigPullRate,
    { x: 8, y: 8 },
  );

  const profitPoints = buildCenteredPoints(
    sortedPlayers,
    currentUserId,
    (player) => safeRatio(player.avgPcGained, player.avgPcSpent),
    (player) => safeRatio(player.totalCardValue, player.cardScore),
    { x: 0.4, y: 0.2 },
  );

  const current = sortedPlayers.find(
    (player) => player.userId === currentUserId,
  );
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    current?.userId ?? sortedPlayers[0]?.userId ?? null,
  );

  const selectedUser = useMemo(() => {
    if (!selectedUserId) {
      return null;
    }

    return (
      sortedPlayers.find((player) => player.userId === selectedUserId) ?? null
    );
  }, [selectedUserId, sortedPlayers]);

  return (
    <section
      ref={ref}
      className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/45 p-5 md:p-6"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-cyan-300" />
        <h2 className="text-lg font-black uppercase italic text-white md:text-xl">
          Matrices leaderboard
        </h2>
      </div>

      <p className="text-xs text-slate-400">
        Matrices centrées sur la moyenne du panel (top 10 + joueur) pour mieux
        visualiser les écarts entre joueurs. Cliquez sur un point pour voir les
        stats détaillées du joueur.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <MatrixCard
          title="Matrice de chance"
          subtitle="Taux de gros tirages (Y) vs taux de doublons (X)"
          icon={<Dices className="h-4 w-4 text-emerald-300" />}
          points={chancePoints}
          cornerLabels={{
            topLeft: "Béni",
            topRight: "Abondant",
            bottomLeft: "Discret",
            bottomRight: "Poissard",
          }}
          tooltipFormatter={(point) =>
            `${point.username} · ${formatPercent(point.xValue)} doublons / ${formatPercent(point.yValue)} gros tirages`
          }
          selectedUserId={selectedUserId}
          onSelectUser={setSelectedUserId}
          animationDelay={80}
          hasBeenVisible={hasBeenVisible}
        />

        <MatrixCard
          title="Matrice de rentabilité"
          subtitle="Ratio valeur cartes / score réel cartes (Y) vs ratio gain / dépense (X)"
          icon={<Coins className="h-4 w-4 text-amber-300" />}
          points={profitPoints}
          cornerLabels={{
            topLeft: "Efficient",
            topRight: "Gagnant",
            bottomLeft: "Stable",
            bottomRight: "Sous-optimal",
          }}
          tooltipFormatter={(point) =>
            `${point.username} · ${formatRatio(point.xValue)} gain/dépense · ${formatRatio(point.yValue)} valeur/score réel cartes`
          }
          selectedUserId={selectedUserId}
          onSelectUser={setSelectedUserId}
          animationDelay={340}
          hasBeenVisible={hasBeenVisible}
        />
      </div>

      {selectedUser ? (
        <div
          className="rounded-xl border border-slate-800 bg-slate-950/65 p-3"
          style={{
            opacity: hasBeenVisible ? 1 : 0,
            transform: hasBeenVisible ? "translateY(0px)" : "translateY(24px)",
            transitionProperty: "opacity, transform",
            transitionDuration: "600ms",
            transitionTimingFunction: "ease-out",
            transitionDelay: "500ms",
          }}
        >
          <Link
            to={`/profile/${selectedUser.userId}`}
            className="flex items-center gap-3 transition hover:opacity-80"
          >
            <PlayerAvatar
              avatarUrl={selectedUser.avatarUrl}
              username={selectedUser.username}
              size="sm"
            />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.1em] text-amber-200">
                Joueur sélectionné
              </p>
              <p
                className={`text-sm ${getTitleColorClass(selectedUser.title)}`}
              >
                {selectedUser.username} · #{selectedUser.leaderboardPosition}
              </p>
            </div>
          </Link>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500">
                Doublons
              </p>
              <p className="text-sm font-black text-cyan-200">
                {formatPercent(selectedUser.duplicateRate)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500">
                Gros pulls
              </p>
              <p className="text-sm font-black text-emerald-200">
                {formatPercent(selectedUser.bigPullRate)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500">
                PC gagnés moyen
              </p>
              <p className="text-sm font-black text-fuchsia-200">
                {formatPc(selectedUser.avgPcGained)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500">
                PC dépensés moyen
              </p>
              <p className="text-sm font-black text-amber-200">
                {formatPc(selectedUser.avgPcSpent)}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
