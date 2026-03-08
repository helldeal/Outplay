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
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

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

const BALANCE_TICK_MS = 780;
const DELTA_BADGE_MS = 1400;
const INITIAL_SYNC_GRACE_MS = 5000;
const PENDING_PC_DELTA_STORAGE_KEY = "outplay:pendingPcDelta";

const pcFormatter = new Intl.NumberFormat("fr-FR");

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
  const logoSrc = `${import.meta.env.BASE_URL}logo-complete.png`;

  const previousBalanceRef = useRef(pcBalance);
  const displayBalanceRef = useRef(pcBalance);
  const mountedAtRef = useRef(performance.now());
  const hasSyncedInitialFetchRef = useRef(false);
  const pendingDeltaRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const hideDeltaTimeoutRef = useRef<number | null>(null);

  const [displayBalance, setDisplayBalance] = useState(pcBalance);
  const [balanceDelta, setBalanceDelta] = useState(0);
  const [deltaBadgeKey, setDeltaBadgeKey] = useState(0);
  const [isRollingBalance, setIsRollingBalance] = useState(false);

  const startBalanceAnimation = (
    fromBalance: number,
    toBalance: number,
    deltaForBadge: number,
    onComplete?: () => void,
  ) => {
    if (fromBalance === toBalance) {
      setDisplayBalance(toBalance);
      displayBalanceRef.current = toBalance;
      setIsRollingBalance(false);
      onComplete?.();
      return;
    }

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    setBalanceDelta(deltaForBadge);
    setDeltaBadgeKey((value) => value + 1);
    setIsRollingBalance(true);

    if (hideDeltaTimeoutRef.current !== null) {
      window.clearTimeout(hideDeltaTimeoutRef.current);
    }

    hideDeltaTimeoutRef.current = window.setTimeout(() => {
      setBalanceDelta(0);
      hideDeltaTimeoutRef.current = null;
    }, DELTA_BADGE_MS);

    const delta = toBalance - fromBalance;
    const startAt = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startAt) / BALANCE_TICK_MS, 1);
      const easedProgress = 1 - (1 - progress) ** 3;
      const nextValue = Math.round(fromBalance + delta * easedProgress);

      setDisplayBalance(nextValue);
      displayBalanceRef.current = nextValue;

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(tick);
      } else {
        setDisplayBalance(toBalance);
        displayBalanceRef.current = toBalance;
        setIsRollingBalance(false);
        frameRef.current = null;
        onComplete?.();
      }
    };

    frameRef.current = window.requestAnimationFrame(tick);
  };

  useEffect(() => {
    const rawPendingDelta = window.sessionStorage.getItem(
      PENDING_PC_DELTA_STORAGE_KEY,
    );

    if (!rawPendingDelta) {
      return;
    }

    const parsedDelta = Number(rawPendingDelta);
    if (!Number.isFinite(parsedDelta) || parsedDelta === 0) {
      window.sessionStorage.removeItem(PENDING_PC_DELTA_STORAGE_KEY);
      return;
    }

    pendingDeltaRef.current = parsedDelta;
  }, []);

  useEffect(() => {
    if (pendingDeltaRef.current !== null && pcBalance > 0) {
      const pendingDelta = pendingDeltaRef.current;
      const fromBalance = pcBalance - pendingDelta;

      setDisplayBalance(fromBalance);
      displayBalanceRef.current = fromBalance;
      previousBalanceRef.current = pcBalance;
      hasSyncedInitialFetchRef.current = true;

      startBalanceAnimation(fromBalance, pcBalance, pendingDelta, () => {
        pendingDeltaRef.current = null;
        window.sessionStorage.removeItem(PENDING_PC_DELTA_STORAGE_KEY);
      });
      return;
    }

    const previousBalance = previousBalanceRef.current;

    if (pcBalance === previousBalance) {
      setDisplayBalance(pcBalance);
      displayBalanceRef.current = pcBalance;
      setIsRollingBalance(false);
      return;
    }

    const shouldSkipInitialSyncAnimation =
      !hasSyncedInitialFetchRef.current &&
      previousBalance === 0 &&
      performance.now() - mountedAtRef.current < INITIAL_SYNC_GRACE_MS;

    if (shouldSkipInitialSyncAnimation) {
      setDisplayBalance(pcBalance);
      displayBalanceRef.current = pcBalance;
      previousBalanceRef.current = pcBalance;
      hasSyncedInitialFetchRef.current = true;
      setIsRollingBalance(false);
      return;
    }

    hasSyncedInitialFetchRef.current = true;

    const delta = pcBalance - previousBalance;
    const fromBalance = displayBalanceRef.current;

    startBalanceAnimation(fromBalance, pcBalance, delta);
    previousBalanceRef.current = pcBalance;

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      setIsRollingBalance(false);
    };
  }, [pcBalance]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      if (hideDeltaTimeoutRef.current !== null) {
        window.clearTimeout(hideDeltaTimeoutRef.current);
      }
    },
    [],
  );

  const formattedBalance = useMemo(
    () => pcFormatter.format(displayBalance),
    [displayBalance],
  );

  const formattedDelta = useMemo(() => {
    if (balanceDelta === 0) {
      return "";
    }

    const sign = balanceDelta > 0 ? "+" : "-";
    return `${sign}${pcFormatter.format(Math.abs(balanceDelta))}`;
  }, [balanceDelta]);

  return (
    <header className="fixed inset-x-0 top-0 z-[995] border-b border-slate-800/70 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full items-center justify-between px-16 py-3.5">
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="group inline-flex items-center rounded-xl px-2 py-1 transition hover:bg-slate-800/50"
          >
            <img
              src={logoSrc}
              alt="Outplay"
              className="h-8 w-auto drop-shadow-[0_0_14px_rgba(56,189,248,0.35)] transition group-hover:brightness-110"
            />
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <NavLink to="/shop" className={navItemClass}>
              <span className="inline-flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4" />
                Shop
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
                  <span className="relative inline-flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
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
                    ? `Prochaine ouverture quotidienne dans ${dailyCountdown}`
                    : "Ouvrir la récompense quotidienne"
                }
              >
                {isOpeningDaily ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarClock className="h-4 w-4" />
                )}
                {isOpeningDaily
                  ? "Ouverture..."
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

              <div className="relative flex items-center gap-2 px-1 py-2 text-sm font-semibold text-slate-100">
                <Coins className="h-4 w-4 text-amber-300" />

                {balanceDelta !== 0 ? (
                  <span
                    key={deltaBadgeKey}
                    className={`absolute -top-3 right-0 animate-[pc-delta-float_1.25s_ease-out_forwards] text-xs font-bold tabular-nums ${
                      balanceDelta > 0 ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {formattedDelta}
                  </span>
                ) : null}

                <span
                  className={`tabular-nums transition-all duration-300 ${
                    isRollingBalance
                      ? "scale-[1.03] text-cyan-100 drop-shadow-[0_0_12px_rgba(56,189,248,0.35)]"
                      : ""
                  }`}
                >
                  {formattedBalance} PC
                </span>
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
                      Déconnexion
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
              Connexion
            </Link>
          )}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 overflow-x-auto px-4 pb-3 text-xs text-slate-400 md:hidden">
        <NavLink to="/shop" className={navItemClass}>
          Shop
        </NavLink>
        <NavLink to="/legendex" className={navItemClass}>
          Legendex
        </NavLink>
        <NavLink to="/leaderboard" className={navItemClass}>
          Leaderboard
        </NavLink>
        <NavLink to="/achievements" className={navItemClass}>
          Achievements
          {unseenAchievementCount > 0 ? (
            <span className="relative ml-1 inline-flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
            </span>
          ) : null}
        </NavLink>
      </div>

      <style>{`
        @keyframes pc-delta-float {
          0% {
            opacity: 0;
            transform: translateY(4px);
          }
          20% {
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(-10px);
          }
        }
      `}</style>
    </header>
  );
}
