import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BookMarked,
  CalendarClock,
  Coins,
  LibraryBig,
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
  fetchCardsByIds,
  openDailyBoosterRpc,
  useDailyBoosterTargetQuery,
  useHasOpenedDailyTodayQuery,
} from "../query/booster";
import { useEffect, useState } from "react";

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
  `rounded-md px-3 py-2 text-sm transition ${
    isActive
      ? "bg-slate-800 text-slate-100"
      : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
  }`;

export function AppLayout() {
  const { user, profile, logout, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isOpeningDaily, setIsOpeningDaily] = useState(false);
  const [dailyCountdown, setDailyCountdown] = useState("00:00:00");
  const [hasTriggeredResetRefresh, setHasTriggeredResetRefresh] =
    useState(false);
  const dailyTargetQuery = useDailyBoosterTargetQuery();
  const openedTodayQuery = useHasOpenedDailyTodayQuery(user?.id);

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
      const result = await openDailyBoosterRpc(
        dailyTargetQuery.data.series.code,
        user.id,
      );
      const openedCards = await fetchCardsByIds(result.cards ?? []);

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
          pcGained: result.pcGained ?? 0,
          chargedPc: result.chargedPc ?? 0,
          boosterName: "Daily Booster",
          seriesName: dailyTargetQuery.data.series.name,
        },
      });
    } finally {
      setIsOpeningDaily(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-[10000] border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4">
          <Link
            to="/"
            className="text-lg font-semibold tracking-wide text-cyan-300"
          >
            OUTPLAY
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <NavLink to="/shop" className={navItemClass}>
              <span className="inline-flex items-center gap-1">
                <ShoppingBag className="h-4 w-4" />
                Boutique
              </span>
            </NavLink>
            <NavLink to="/collection" className={navItemClass}>
              <span className="inline-flex items-center gap-1">
                <LibraryBig className="h-4 w-4" />
                Collection
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
                  className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
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
                <div className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200">
                  <Coins className="h-4 w-4 text-amber-300" />
                  <span>{profile?.pc_balance ?? 0} PC</span>
                </div>
                <button
                  onClick={() => void logout()}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1 rounded-md bg-cyan-500 px-3 py-1.5 text-sm font-medium text-slate-950 transition hover:bg-cyan-400"
              >
                <LogIn className="h-4 w-4" />
                Login
              </Link>
            )}
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 pb-3 text-xs text-slate-400 md:hidden">
          <Trophy className="h-4 w-4" />
          <NavLink to="/shop" className={navItemClass}>
            Boutique
          </NavLink>
          <NavLink to="/collection" className={navItemClass}>
            Collection
          </NavLink>
          <NavLink to="/legendex" className={navItemClass}>
            Legendex
          </NavLink>
          <NavLink to="/leaderboard" className={navItemClass}>
            Leaderboard
          </NavLink>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-800 px-4 py-6 text-center text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-1">
          <UserCircle2 className="h-4 w-4" />
          OUTPLAY POC
        </div>
      </footer>
    </div>
  );
}
