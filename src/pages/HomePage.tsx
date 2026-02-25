import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">
          OUTPLAY
        </p>
        <h1 className="mt-3 text-3xl font-bold text-white md:text-4xl">
          Esport Card Collection POC
        </h1>
        <p className="mt-3 max-w-2xl text-slate-300">
          Login Discord, collection triée par rareté, ouverture de booster
          animée, gestion des doublons en PC et leaderboard simple.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/login"
            className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400"
          >
            Login
          </Link>
          <Link
            to="/collection"
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
          >
            Voir ma collection
          </Link>
          <Link
            to="/leaderboard"
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
          >
            Leaderboard
          </Link>
        </div>
      </div>
    </section>
  );
}
