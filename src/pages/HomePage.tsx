import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BookMarked,
  GitCommitHorizontal,
  Crown,
  ShoppingBag,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

export function HomePage() {
  const hubItems = [
    {
      to: "/shop",
      title: "Booster Shop",
      description:
        "Achète des boosters, consulte les taux de drop et lance ton ouverture.",
      icon: ShoppingBag,
      tone: "from-cyan-400/25 via-cyan-300/10 to-transparent",
      ring: "border-cyan-300/35",
    },
    {
      to: "/legendex",
      title: "Legendex",
      description: "Explore toutes les cartes de la série et vise les 100%.",
      icon: BookMarked,
      tone: "from-sky-400/25 via-sky-300/10 to-transparent",
      ring: "border-sky-300/35",
    },
    {
      to: "/achievements",
      title: "Achievements",
      description: "Débloque des objectifs et récupère tes récompenses bonus.",
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

        <Link
          to="/patch-notes"
          className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 rounded-full border border-fuchsia-300/45 bg-fuchsia-300/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-fuchsia-100 transition hover:border-fuchsia-200/70 hover:bg-fuchsia-300/22"
        >
          <GitCommitHorizontal className="h-3.5 w-3.5" />
          Patch Notes 1.0
        </Link>

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
              Ouvre des boosters, monte ton score, complète ton legendex et
              débloque les achievements.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {hubItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`group relative min-h-[196px] overflow-hidden rounded-2xl border bg-slate-900/70 p-5 shadow-[0_18px_42px_rgba(2,6,23,0.5)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_52px_rgba(2,6,23,0.62)] ${item.ring}`}
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.tone}`}
              />
              <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl transition duration-500 group-hover:scale-125" />
              <div className="pointer-events-none absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-cyan-300/10 blur-2xl transition duration-500 group-hover:translate-x-2" />
              <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.12)_50%,transparent_100%)]" />

              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black uppercase italic text-white md:text-xl">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    {item.description}
                  </p>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-600 bg-slate-950/55 text-slate-100 transition group-hover:border-cyan-300/50 group-hover:text-cyan-200">
                  <Icon className="h-5 w-5" />
                </span>
              </div>

              <span className="absolute bottom-5 left-5 inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.12em] text-slate-300 transition group-hover:text-white">
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
            Enchaîne les actions quotidiennes pour débloquer des récompenses
            supplémentaires.
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
