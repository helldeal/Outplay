import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BookMarked,
  CalendarClock,
  ChevronDown,
  Coins,
  LogIn,
  LogOut,
  LoaderCircle,
  ShoppingBag,
  Trophy,
  UserCircle2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import {
  computeDuplicateIndices,
  fetchCardsByIds,
  getOwnedCardIds,
  openDailyBoosterRpc,
  useDailyBoosterTargetQuery,
  useHasOpenedDailyTodayQuery,
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

export function AppLayout() {
  const { user, profile, logout, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isOpeningDaily, setIsOpeningDaily] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [dailyCountdown, setDailyCountdown] = useState("00:00:00");
  const [hasTriggeredResetRefresh, setHasTriggeredResetRefresh] =
    useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const dailyTargetQuery = useDailyBoosterTargetQuery();
  const openedTodayQuery = useHasOpenedDailyTodayQuery(user?.id);

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

  useEffect(() => {
    if (!openedTodayQuery.data) {
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
  }, [openedTodayQuery.data]);

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
    if (!user?.id || !openedTodayQuery.data) {
      return;
    }

    if (dailyCountdown !== "00:00:00" || hasTriggeredResetRefresh) {
      return;
    }

    setHasTriggeredResetRefresh(true);
    void queryClient.invalidateQueries({
      queryKey: ["daily-booster-opened-today", user.id],
    });
  }, [
    dailyCountdown,
    hasTriggeredResetRefresh,
    openedTodayQuery.data,
    queryClient,
    user?.id,
  ]);

  const canOpenDaily =
    Boolean(user) &&
    Boolean(dailyTargetQuery.data?.series.code) &&
    !openedTodayQuery.data &&
    !isOpeningDaily;

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

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["daily-booster-opened-today", user.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["collection", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
      ]);

      await refreshProfile();

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
    } finally {
      setIsOpeningDaily(false);
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
        </div>
      </header>

      <main className="relative mx-auto mt-28 w-full max-w-7xl px-4 py-6 md:mt-20">
        <Outlet />
      </main>

      <footer className="relative border-t border-slate-800/80 px-4 py-6 text-center text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-1">
          <UserCircle2 className="h-4 w-4" />
          OUTPLAY POC
        </div>
      </footer>
    </div>
  );
}
