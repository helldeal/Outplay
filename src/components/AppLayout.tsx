import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Award,
  BookMarked,
  CalendarClock,
  ChevronDown,
  Coins,
  Flame,
  LogIn,
  LogOut,
  LoaderCircle,
  ShoppingBag,
  Trophy,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { resolveRewardTone } from "./rewards/reward-theme";
import {
  AchievementToasts,
  type AchievementToastItem,
} from "./layout/AchievementToasts";
import { AppFooter } from "./layout/AppFooter";
import { StreakModal } from "./layout/StreakModal";
import {
  useAchievementNotificationsQuery,
  useAchievementUnseenCountQuery,
} from "../query/achievements";
import {
  claimLoginStreakRewardRpc,
  computeDuplicateIndices,
  fetchCardsByIds,
  getOwnedCardIds,
  openDailyBoosterRpc,
  useDailyBoosterTargetQuery,
  useHasOpenedDailyTodayQuery,
  useLoginStreakStatusQuery,
} from "../query/booster";
import { useEffect, useRef, useState } from "react";

function formatCountdown(millisecondsLeft: number) {
  const totalSeconds = Math.max(0, Math.floor(millisecondsLeft / 1000));
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-xl px-3 py-2 text-sm transition ${
    isActive
      ? "bg-slate-200/10 text-white shadow-[inset_0_0_0_1px_rgba(148,163,184,0.25)]"
      : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
  }`;

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatStreakRewardLabel(params: {
  rewardType: "PC" | "BOOSTER";
  rewardPc: number;
  rewardBoosterType: "NORMAL" | "LUCK" | "PREMIUM" | null;
}): string {
  if (params.rewardType === "PC") {
    return `${params.rewardPc} PC`;
  }

  switch (params.rewardBoosterType) {
    case "LUCK":
      return "Luck Booster";
    case "PREMIUM":
      return "Premium Booster";
    case "NORMAL":
    default:
      return "Normal Booster";
  }
}

export function AppLayout() {
  const { user, profile, logout, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isOpeningDaily, setIsOpeningDaily] = useState(false);
  const [isClaimingStreak, setIsClaimingStreak] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
  const [dailyCountdown, setDailyCountdown] = useState("00:00:00");
  const [hasTriggeredResetRefresh, setHasTriggeredResetRefresh] =
    useState(false);
  const [achievementToasts, setAchievementToasts] = useState<
    AchievementToastItem[]
  >([]);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const dailyTargetQuery = useDailyBoosterTargetQuery();
  const openedTodayQuery = useHasOpenedDailyTodayQuery(user?.id);
  const streakStatus = useLoginStreakStatusQuery(user?.id).data;
  const unseenAchievementsQuery = useAchievementUnseenCountQuery(user?.id);
  const achievementNotificationsQuery = useAchievementNotificationsQuery(
    user?.id,
  );

  const rawUsername =
    profile?.username ??
    (user?.user_metadata?.preferred_username as string | undefined) ??
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Player";

  const username = rawUsername.split("#")[0]?.trim() || "Player";

  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ??
    (user?.user_metadata?.picture as string | undefined) ??
    (user?.user_metadata?.avatar as string | undefined) ??
    null;
  const unseenAchievementCount = Math.max(0, unseenAchievementsQuery.data ?? 0);

  useEffect(() => {
    const notifications = achievementNotificationsQuery.data ?? [];
    if (notifications.length === 0) {
      return;
    }

    for (const notification of notifications) {
      const notificationId = `${notification.code}:${notification.unlocked_at}`;
      if (seenNotificationIdsRef.current.has(notificationId)) {
        continue;
      }

      seenNotificationIdsRef.current.add(notificationId);

      setAchievementToasts((prev) =>
        [...prev, { ...notification, id: notificationId }].slice(-4),
      );

      window.setTimeout(() => {
        setAchievementToasts((prev) =>
          prev.filter((toast) => toast.id !== notificationId),
        );
      }, 5200);
    }
  }, [achievementNotificationsQuery.data]);

  const shouldDisplayResetCountdown =
    Boolean(openedTodayQuery.data) ||
    (streakStatus ? !streakStatus.can_claim_today : false);

  useEffect(() => {
    if (!shouldDisplayResetCountdown) {
      setDailyCountdown("00:00:00");
      setHasTriggeredResetRefresh(false);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const nextResetUtc = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
        0,
      );

      setDailyCountdown(formatCountdown(nextResetUtc - now.getTime()));
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [shouldDisplayResetCountdown]);

  useEffect(() => {
    if (!isProfileMenuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [isProfileMenuOpen]);

  useEffect(() => {
    if (!user?.id || !shouldDisplayResetCountdown) {
      return;
    }

    if (dailyCountdown !== "00:00:00" || hasTriggeredResetRefresh) {
      return;
    }

    setHasTriggeredResetRefresh(true);
    void Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["daily-booster-opened-today", user.id],
      }),
      queryClient.invalidateQueries({
        queryKey: ["login-streak-status", user.id],
      }),
    ]);
  }, [
    dailyCountdown,
    hasTriggeredResetRefresh,
    shouldDisplayResetCountdown,
    queryClient,
    user?.id,
  ]);

  const canOpenDaily =
    Boolean(user) &&
    Boolean(dailyTargetQuery.data?.series.code) &&
    !openedTodayQuery.data &&
    !isOpeningDaily;

  const canClaimStreak =
    Boolean(user) &&
    Boolean(streakStatus?.can_claim_today) &&
    !isClaimingStreak;

  const streakRewardLabel = streakStatus
    ? formatStreakRewardLabel({
        rewardType: streakStatus.next_reward_type,
        rewardPc: streakStatus.next_reward_pc,
        rewardBoosterType: streakStatus.next_reward_booster_type,
      })
    : null;

  const nextStreakTone = resolveRewardTone({
    rewardPc:
      streakStatus?.next_reward_type === "PC" ? streakStatus.next_reward_pc : 0,
    rewardBoosterType:
      streakStatus?.next_reward_type === "BOOSTER"
        ? streakStatus.next_reward_booster_type
        : null,
  });

  const openDailyFromHeader = async () => {
    if (!user || !dailyTargetQuery.data?.series.code) {
      return;
    }

    setIsOpeningDaily(true);
    try {
      const ownedBefore = await getOwnedCardIds(user.id);
      const result = await openDailyBoosterRpc(
        dailyTargetQuery.data.series.code,
        user.id,
      );
      const cardIds = result.cards ?? [];
      const openedCards = await fetchCardsByIds(cardIds);
      const duplicateCardIndices = computeDuplicateIndices(
        cardIds,
        ownedBefore,
      );

      navigate("/booster-opening", {
        state: {
          openedCards,
          duplicateCardIndices,
          pcGained: result.pcGained ?? 0,
          chargedPc: result.chargedPc ?? 0,
          boosterName: "Daily Booster",
          seriesName: dailyTargetQuery.data.series.name,
          seriesSlug: dailyTargetQuery.data.series.slug,
          seriesCode: dailyTargetQuery.data.series.code,
        },
      });

      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["daily-booster-opened-today", user.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["collection", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
        queryClient.invalidateQueries({
          queryKey: ["achievements-progress", user.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["achievements-unseen-count", user.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["achievements-notifications", user.id],
        }),
        refreshProfile(),
      ]).catch(() => undefined);
    } finally {
      setIsOpeningDaily(false);
    }
  };

  const claimStreakFromHeader = async () => {
    if (!user) {
      return;
    }

    setIsClaimingStreak(true);
    try {
      const ownedBefore = await getOwnedCardIds(user.id);
      const result = await claimLoginStreakRewardRpc(user.id);

      const syncPostClaim = () =>
        Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["login-streak-status", user.id],
          }),
          queryClient.invalidateQueries({ queryKey: ["collection", user.id] }),
          queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
          queryClient.invalidateQueries({
            queryKey: ["achievements-progress", user.id],
          }),
          queryClient.invalidateQueries({
            queryKey: ["achievements-unseen-count", user.id],
          }),
          queryClient.invalidateQueries({
            queryKey: ["achievements-notifications", user.id],
          }),
          refreshProfile(),
        ]);

      setIsStreakModalOpen(false);

      if (result.rewardType !== "BOOSTER" || !result.opening) {
        await syncPostClaim();
        return;
      }

      const cardIds = result.opening.cards ?? [];
      const openedCards = await fetchCardsByIds(cardIds);
      const duplicateCardIndices = computeDuplicateIndices(
        cardIds,
        ownedBefore,
      );

      const boosterLabel =
        result.boosterType === "PREMIUM"
          ? "Premium Booster"
          : result.boosterType === "LUCK"
            ? "Luck Booster"
            : "Normal Booster";

      navigate("/booster-opening", {
        state: {
          openedCards,
          duplicateCardIndices,
          pcGained: result.opening.pcGained ?? 0,
          chargedPc: result.opening.chargedPc ?? 0,
          boosterName: `Streak ${boosterLabel}`,
          seriesName: dailyTargetQuery.data?.series.name,
          seriesSlug: dailyTargetQuery.data?.series.slug,
          seriesCode: dailyTargetQuery.data?.series.code,
        },
      });

      void syncPostClaim().catch(() => undefined);
    } finally {
      setIsClaimingStreak(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_85%_0%,rgba(124,58,237,0.16),transparent_30%),linear-gradient(to_bottom,rgba(2,6,23,1),rgba(2,6,23,0.92))]" />

      <header className="fixed inset-x-0 top-0 z-[10000] border-b border-slate-800/70 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3.5">
          <Link
            to="/"
            className="group inline-flex items-center rounded-xl px-2 py-1 transition hover:bg-slate-800/50"
          >
            <img
              src="/logo-complete.png"
              alt="Outplay"
              className="h-8 w-auto drop-shadow-[0_0_14px_rgba(56,189,248,0.35)] transition group-hover:brightness-110"
            />
          </Link>

          <nav className="hidden items-center gap-1.5 rounded-2xl border border-slate-700/70 bg-slate-900/50 p-1 md:flex">
            <NavLink to="/shop" className={navItemClass}>
              <span className="inline-flex items-center gap-1">
                <ShoppingBag className="h-4 w-4" />
                Boutique
              </span>
            </NavLink>
            <NavLink to="/legendex" className={navItemClass}>
              <span className="inline-flex items-center gap-1">
                <BookMarked className="h-4 w-4" />
                Legendex
              </span>
            </NavLink>
            <NavLink to="/leaderboard" className={navItemClass}>
              <span className="inline-flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                Leaderboard
              </span>
            </NavLink>
            <NavLink to="/achievements" className={navItemClass}>
              <span className="inline-flex items-center gap-1">
                <Award className="h-4 w-4" />
                Achievements
                {unseenAchievementCount > 0 ? (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 text-[10px] font-black text-slate-950">
                    {unseenAchievementCount > 9 ? "9+" : unseenAchievementCount}
                  </span>
                ) : null}
              </span>
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <button
                  onClick={() => {
                    void openDailyFromHeader().catch(() => undefined);
                  }}
                  disabled={!canOpenDaily}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-slate-100 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    canOpenDaily
                      ? "border border-cyan-300/70 bg-cyan-400/15 shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_0_24px_rgba(34,211,238,0.22)] hover:bg-cyan-400/20"
                      : "border border-slate-600/80 bg-slate-900/70 hover:border-cyan-400/50 hover:bg-slate-800/80"
                  }`}
                  title={
                    openedTodayQuery.data
                      ? `Prochain daily dans ${dailyCountdown}`
                      : "Ouvrir le daily"
                  }
                >
                  {isOpeningDaily ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <CalendarClock className="h-4 w-4" />
                  )}
                  {isOpeningDaily
                    ? "Opening..."
                    : openedTodayQuery.data
                      ? `Daily ${dailyCountdown}`
                      : "Daily"}
                </button>
                <button
                  onClick={() => {
                    setIsStreakModalOpen(true);
                  }}
                  disabled={!user}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-slate-100 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    canClaimStreak
                      ? nextStreakTone.headerActiveClass
                      : `border border-slate-600/80 bg-slate-900/70 ${nextStreakTone.headerInactiveHoverClass} hover:bg-slate-800/80`
                  }`}
                  title={
                    streakStatus
                      ? streakStatus.can_claim_today
                        ? `Jour ${streakStatus.next_day}: ${streakRewardLabel ?? "Reward"}`
                        : `Prochaine claim streak dans ${dailyCountdown}`
                      : "Récompense streak"
                  }
                >
                  {isClaimingStreak ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Flame className="h-4 w-4" />
                  )}
                  {isClaimingStreak
                    ? "Claim..."
                    : streakStatus?.can_claim_today
                      ? `Streak J${streakStatus.next_day}`
                      : `Streak ${dailyCountdown}`}
                </button>
                <div className="flex items-center gap-2 rounded-xl border border-slate-600/80 bg-slate-900/70 px-3 py-2 text-sm text-slate-100">
                  <Coins className="h-4 w-4 text-amber-300" />
                  <span>{profile?.pc_balance ?? 0} PC</span>
                </div>

                <div className="relative" ref={profileMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen((open) => !open)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-600/80 bg-slate-900/70 px-2.5 py-1.5 text-sm text-slate-100 transition hover:border-cyan-400/50 hover:bg-slate-800/80"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={username}
                        className="h-8 w-8 rounded-full border border-slate-500/70 object-cover"
                      />
                    ) : (
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-500/70 bg-slate-700 text-xs font-semibold text-slate-100">
                        {getInitials(username) || "OP"}
                      </span>
                    )}
                    <span className="max-w-[112px] truncate font-medium">
                      {username}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition ${
                        isProfileMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isProfileMenuOpen && (
                    <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-slate-700/80 bg-slate-900/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
                      <div className="mb-2 rounded-xl bg-slate-800/70 px-3 py-2">
                        <p className="truncate text-sm font-medium text-slate-100">
                          {username}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {user.email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          void logout();
                        }}
                        className="inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                      >
                        <LogOut className="h-4 w-4 text-red-400" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                <LogIn className="h-4 w-4" />
                Login
              </Link>
            )}
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 pb-3 text-xs text-slate-400 md:hidden">
          <Trophy className="h-4 w-4" />
          <NavLink to="/shop" className={navItemClass}>
            Boutique
          </NavLink>
          <NavLink to="/legendex" className={navItemClass}>
            Legendex
          </NavLink>
          <NavLink to="/leaderboard" className={navItemClass}>
            Leaderboard
          </NavLink>
          <NavLink to="/achievements" className={navItemClass}>
            Achievements
            {unseenAchievementCount > 0 ? ` (${unseenAchievementCount})` : ""}
          </NavLink>
        </div>
      </header>

      <AchievementToasts toasts={achievementToasts} />

      <StreakModal
        isOpen={isStreakModalOpen}
        onClose={() => setIsStreakModalOpen(false)}
        isClaiming={isClaimingStreak}
        canClaim={canClaimStreak}
        onClaim={() => {
          void claimStreakFromHeader().catch(() => undefined);
        }}
        countdown={dailyCountdown}
        streakStatus={streakStatus}
        targetSeriesCode={dailyTargetQuery.data?.series.code}
      />

      <main className="relative mx-auto mt-28 w-full max-w-7xl px-4 py-6 md:mt-20">
        <Outlet />
      </main>

      <AppFooter />
    </div>
  );
}
