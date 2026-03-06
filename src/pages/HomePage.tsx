import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BookMarked,
  Crown,
  Library,
  LogIn,
  ShoppingBag,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";

export function HomePage() {
  const { user, profile } = useAuth();

  const hubItems = [
    {
      to: "/shop",
      title: "Booster Shop",
      description:
        "Achete des boosters, check les drop rates et lance ton opening.",
      icon: ShoppingBag,
      tone: "from-cyan-400/25 via-cyan-300/10 to-transparent",
      ring: "border-cyan-300/35",
    },
    {
      to: "/legendex",
      title: "Legendex",
      description: "Explore toutes les cartes de la serie et vise le 100%.",
      icon: BookMarked,
      tone: "from-sky-400/25 via-sky-300/10 to-transparent",
      ring: "border-sky-300/35",
    },
    {
      to: "/collection",
      title: "Ma Collection",
      description: "Suis tes cartes possedees, ta value et tes doublons.",
      icon: Library,
      tone: "from-indigo-400/25 via-indigo-300/10 to-transparent",
      ring: "border-indigo-300/35",
    },
    {
      to: "/achievements",
      title: "Achievements",
      description: "Debloque des objectifs et claim tes rewards bonus.",
      icon: Award,
      tone: "from-amber-400/25 via-amber-300/10 to-transparent",
      ring: "border-amber-300/35",
    },
    {
      to: "/leaderboard",
      title: "Leaderboard",
      description:
        "Compare ta collection et ton score avec les autres joueurs.",
      icon: Trophy,
      tone: "from-fuchsia-400/25 via-fuchsia-300/10 to-transparent",
      ring: "border-fuchsia-300/35",
    },
  ];

  return (
    <section className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-900/75 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.6)] md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_15%,rgba(56,189,248,0.24),transparent_34%),radial-gradient(circle_at_94%_0%,rgba(251,191,36,0.2),transparent_28%),linear-gradient(135deg,rgba(56,189,248,0.08),transparent_44%,rgba(244,114,182,0.12))]" />
        <div className="pointer-events-none absolute -left-12 -top-14 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-amber-300/15 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1 rounded-full border border-cyan-200/50 bg-cyan-300/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              Outplay Hub
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase italic tracking-tight text-white md:text-6xl">
              Choose Your Route
            </h1>
            <p className="mt-3 max-w-xl text-sm text-slate-200/90 md:text-base">
              Ouvre des boosters, monte ton score, complete ton legendex et
              debloque les achievements. La home devient ton tableau de bord.
            </p>
          </div>

          <div className="w-full max-w-xs rounded-2xl border border-slate-600/70 bg-slate-950/70 p-4 backdrop-blur md:w-auto">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-300">
              Statut joueur
            </p>
            {user ? (
              <>
                <p className="mt-1 truncate text-lg font-bold text-white">
                  {profile?.username ?? user.email?.split("@")[0] ?? "Player"}
                </p>
                <p className="text-xs text-slate-400">
                  {profile?.pc_balance ?? 0} PC disponibles
                </p>
                <Link
                  to="/collection"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-cyan-300/55 bg-cyan-300/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-cyan-100 transition hover:bg-cyan-300/25"
                >
                  Ouvrir mon espace
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-slate-300">
                  Connecte-toi pour activer daily, streak et progression.
                </p>
                <Link
                  to="/login"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-cyan-400 px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-slate-950 transition hover:bg-cyan-300"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {hubItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`group relative overflow-hidden rounded-2xl border bg-slate-900/65 p-4 shadow-[0_12px_36px_rgba(2,6,23,0.45)] transition hover:-translate-y-0.5 ${item.ring}`}
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.tone}`}
              />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-black uppercase italic text-white">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    {item.description}
                  </p>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 bg-slate-950/55 text-slate-100 transition group-hover:border-cyan-300/50 group-hover:text-cyan-200">
                  <Icon className="h-4.5 w-4.5" />
                </span>
              </div>
              <span className="relative mt-4 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-300 transition group-hover:text-white">
                Ouvrir
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-amber-300/30 bg-slate-900/60 p-4">
          <p className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.11em] text-amber-200">
            <Target className="h-3.5 w-3.5" />
            Phase 1
          </p>
          <h3 className="mt-1 text-sm font-black uppercase text-white">
            Shop + Opening
          </h3>
          <p className="mt-1 text-xs text-slate-300">
            Ouvre tes boosters pour injecter de nouvelles cartes dans ta
            collection.
          </p>
        </div>
        <div className="rounded-2xl border border-cyan-300/30 bg-slate-900/60 p-4">
          <p className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.11em] text-cyan-200">
            <Crown className="h-3.5 w-3.5" />
            Phase 2
          </p>
          <h3 className="mt-1 text-sm font-black uppercase text-white">
            Achievements + Streak
          </h3>
          <p className="mt-1 text-xs text-slate-300">
            Enchaine les actions quotidiennes pour debloquer des rewards
            supplementaires.
          </p>
        </div>
        <div className="rounded-2xl border border-fuchsia-300/30 bg-slate-900/60 p-4">
          <p className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.11em] text-fuchsia-200">
            <Trophy className="h-3.5 w-3.5" />
            Phase 3
          </p>
          <h3 className="mt-1 text-sm font-black uppercase text-white">
            Leaderboard Push
          </h3>
          <p className="mt-1 text-xs text-slate-300">
            Monte en score, augmente tes achievements et grimpe le classement.
          </p>
        </div>
      </div>
    </section>
  );
}
