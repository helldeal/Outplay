import {
  Award,
  BookMarked,
  CalendarClock,
  ChevronDown,
  Coins,
  Flame,
  LoaderCircle,
  LogIn,
  LogOut,
  ShoppingBag,
  Trophy,
} from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import type { RefObject } from "react";

type NavClassParams = { isActive: boolean };

const navItemClass = ({ isActive }: NavClassParams) =>
  `inline-flex items-center gap-1.5 border-b-2 px-1 py-2 text-sm font-semibold uppercase tracking-[0.08em] transition ${
    isActive
      ? "border-cyan-300 text-white"
      : "border-transparent text-slate-400 hover:border-cyan-400/60 hover:text-slate-100"
  }`;

type AppHeaderProps = {
  isAuthenticated: boolean;
  unseenAchievementCount: number;
  onOpenDaily: () => void;
  canOpenDaily: boolean;
  isOpeningDaily: boolean;
  openedToday: boolean;
  dailyCountdown: string;
  onOpenStreakModal: () => void;
  canClaimStreak: boolean;
  isClaimingStreak: boolean;
  streakTitle: string;
  streakButtonLabel: string;
  streakActiveClass: string;
  streakInactiveClass: string;
  pcBalance: number;
  profileMenuRef: RefObject<HTMLDivElement | null>;
  isProfileMenuOpen: boolean;
  onToggleProfileMenu: () => void;
  avatarUrl: string | null;
  username: string;
  userEmail?: string | null;
  onLogout: () => void;
  initials: string;
};

export function AppHeader({
  isAuthenticated,
  unseenAchievementCount,
  onOpenDaily,
  canOpenDaily,
  isOpeningDaily,
  openedToday,
  dailyCountdown,
  onOpenStreakModal,
  canClaimStreak,
  isClaimingStreak,
  streakTitle,
  streakButtonLabel,
  streakActiveClass,
  streakInactiveClass,
  pcBalance,
  profileMenuRef,
  isProfileMenuOpen,
  onToggleProfileMenu,
  avatarUrl,
  username,
  userEmail,
  onLogout,
  initials,
}: AppHeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-[10000] border-b border-slate-800/70 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full items-center justify-between px-16 py-3.5">
        <div className="flex items-center gap-8">
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

          <nav className="hidden items-center gap-6 md:flex">
            <NavLink to="/shop" className={navItemClass}>
              <span className="inline-flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4" />
                Boutique
              </span>
            </NavLink>
            <NavLink to="/legendex" className={navItemClass}>
              <span className="inline-flex items-center gap-1.5">
                <BookMarked className="h-4 w-4" />
                Legendex
              </span>
            </NavLink>
            <NavLink to="/leaderboard" className={navItemClass}>
              <span className="inline-flex items-center gap-1.5">
                <Trophy className="h-4 w-4" />
                Leaderboard
              </span>
            </NavLink>
            <NavLink to="/achievements" className={navItemClass}>
              <span className="inline-flex items-center gap-1.5">
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
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <button
                onClick={onOpenDaily}
                disabled={!canOpenDaily}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-slate-100 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  canOpenDaily
                    ? "border border-cyan-300/70 bg-cyan-400/15 shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_0_24px_rgba(34,211,238,0.22)] hover:bg-cyan-400/20"
                    : "border border-slate-600/80 bg-slate-900/70 hover:border-cyan-400/50 hover:bg-slate-800/80"
                }`}
                title={
                  openedToday
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
                  : openedToday
                    ? `Daily ${dailyCountdown}`
                    : "Daily"}
              </button>

              <button
                onClick={onOpenStreakModal}
                disabled={!isAuthenticated}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-slate-100 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  canClaimStreak
                    ? streakActiveClass
                    : `border border-slate-600/80 bg-slate-900/70 ${streakInactiveClass} hover:bg-slate-800/80`
                }`}
                title={streakTitle}
              >
                {isClaimingStreak ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Flame className="h-4 w-4" />
                )}
                {streakButtonLabel}
              </button>

              <div className="flex items-center gap-2 px-1 py-2 text-sm font-semibold text-slate-100">
                <Coins className="h-4 w-4 text-amber-300" />
                <span>{pcBalance} PC</span>
              </div>

              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={onToggleProfileMenu}
                  className="inline-flex items-center gap-2 px-1 py-1.5 text-sm text-slate-100 transition hover:text-cyan-100"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={username}
                      className="h-8 w-8 rounded-full border border-slate-500/60 object-cover"
                    />
                  ) : (
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-500/60 bg-slate-700 text-xs font-semibold text-slate-100">
                      {initials || "OP"}
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
                        {userEmail}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onLogout}
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

      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 overflow-x-auto px-4 pb-3 text-xs text-slate-400 md:hidden">
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
  );
}
