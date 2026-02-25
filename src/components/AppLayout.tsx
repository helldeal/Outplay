import { Link, NavLink, Outlet } from "react-router-dom";
import { Coins, Trophy, UserCircle2 } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm transition ${
    isActive
      ? "bg-slate-800 text-slate-100"
      : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
  }`;

export function AppLayout() {
  const { user, profile, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4">
          <Link
            to="/"
            className="text-lg font-semibold tracking-wide text-cyan-300"
          >
            OUTPLAY
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <NavLink to="/collection" className={navItemClass}>
              Collection
            </NavLink>
            <NavLink to="/legendex" className={navItemClass}>
              Legendex
            </NavLink>
            <NavLink to="/leaderboard" className={navItemClass}>
              Leaderboard
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200">
                  <Coins className="h-4 w-4 text-amber-300" />
                  <span>{profile?.pc_balance ?? 0} PC</span>
                </div>
                <button
                  onClick={() => void logout()}
                  className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="rounded-md bg-cyan-500 px-3 py-1.5 text-sm font-medium text-slate-950 transition hover:bg-cyan-400"
              >
                Login
              </Link>
            )}
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 pb-3 text-xs text-slate-400 md:hidden">
          <Trophy className="h-4 w-4" />
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
