import { Coins, Dices, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { PlayerAvatar } from "./PlayerAvatar";
import type { LeaderboardMatrixPlayer } from "../../query/leaderboard";
import { Link } from "react-router-dom";

interface MatrixPoint {
  userId: string;
  username: string;
  avatarUrl: string | null;
  isCurrentUser: boolean;
  xPct: number;
  yPct: number;
  xValue: number;
  yValue: number;
}

const MATRIX_EDGE_PADDING = 6;

function clampPercent(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeDeltaToPct(delta: number, halfSpan: number): number {
  const safeSpan = Math.max(halfSpan, 1e-6);
  const usableHalf = (100 - MATRIX_EDGE_PADDING * 2) / 2;
  const centered = 50 + (delta / safeSpan) * usableHalf;

  return clampPercent(centered, MATRIX_EDGE_PADDING, 100 - MATRIX_EDGE_PADDING);
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

  const deltas = players.map((player) => ({
    player,
    deltaX: xAccessor(player) - averageX,
    deltaY: yAccessor(player) - averageY,
  }));

  const minDeltaX = Math.min(...deltas.map((entry) => entry.deltaX), 0);
  const maxDeltaX = Math.max(...deltas.map((entry) => entry.deltaX), 0);
  const minDeltaY = Math.min(...deltas.map((entry) => entry.deltaY), 0);
  const maxDeltaY = Math.max(...deltas.map((entry) => entry.deltaY), 0);

  const halfSpanX = Math.max(
    minSpan.x,
    Math.abs(minDeltaX),
    Math.abs(maxDeltaX),
  );
  const halfSpanY = Math.max(
    minSpan.y,
    Math.abs(minDeltaY),
    Math.abs(maxDeltaY),
  );

  return deltas.map(({ player, deltaX, deltaY }) => ({
    userId: player.userId,
    username: player.username,
    avatarUrl: player.avatarUrl,
    isCurrentUser: player.userId === currentUserId,
    xPct: normalizeDeltaToPct(deltaX, halfSpanX),
    yPct: normalizeDeltaToPct(deltaY, halfSpanY),
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

function MatrixCard({
  title,
  subtitle,
  icon,
  points,
  cornerLabels,
  tooltipFormatter,
  selectedUserId,
  onSelectUser,
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
}) {
  const topPlayers = points.filter((point) => !point.isCurrentUser);

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
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
    (player) => player.avgPcSpent,
    (player) => player.avgPcGained,
    { x: 20, y: 20 },
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
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/45 p-5 md:p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-cyan-300" />
        <h2 className="text-lg font-black uppercase italic text-white md:text-xl">
          Matrices leaderboard
        </h2>
      </div>

      <p className="text-xs text-slate-400">
        Matrices centrées sur la moyenne du panel (top 10 + toi si hors top 10),
        échelle auto comme sur le profil.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <MatrixCard
          title="Matrice de chance"
          subtitle="Taux de gros pull (Y) vs taux de doublons (X)"
          icon={<Dices className="h-4 w-4 text-emerald-300" />}
          points={chancePoints}
          cornerLabels={{
            topLeft: "Béni",
            topRight: "Abondant",
            bottomLeft: "Discret",
            bottomRight: "Poissard",
          }}
          tooltipFormatter={(point) =>
            `${point.username} · ${formatPercent(point.xValue)} doublons / ${formatPercent(point.yValue)} gros pulls`
          }
          selectedUserId={selectedUserId}
          onSelectUser={setSelectedUserId}
        />

        <MatrixCard
          title="Matrice de rentabilité"
          subtitle="Argent gagné moyen (Y) vs argent dépensé moyen (X)"
          icon={<Coins className="h-4 w-4 text-amber-300" />}
          points={profitPoints}
          cornerLabels={{
            topLeft: "Efficace",
            topRight: "Baleine",
            bottomLeft: "Économe",
            bottomRight: "Déficit",
          }}
          tooltipFormatter={(point) =>
            `${point.username} · ${formatPc(point.xValue)} dépensés / ${formatPc(point.yValue)} gagnés`
          }
          selectedUserId={selectedUserId}
          onSelectUser={setSelectedUserId}
        />
      </div>

      {selectedUser ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/65 p-3">
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
              <p className="text-sm text-slate-200">
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
