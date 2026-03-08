import {
  BadgeHelp,
  Construction,
  ExternalLink,
  Heart,
  MessageCircle,
  Rocket,
  Shield,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";

const techStack = [
  { name: "React", logo: "https://cdn.simpleicons.org/react/61DAFB" },
  {
    name: "TypeScript",
    logo: "https://cdn.simpleicons.org/typescript/3178C6",
  },
  {
    name: "Tailwind CSS",
    logo: "https://cdn.simpleicons.org/tailwindcss/06B6D4",
  },
  { name: "Supabase", logo: "https://cdn.simpleicons.org/supabase/3FCF8E" },
  {
    name: "PostgreSQL",
    logo: "https://cdn.simpleicons.org/postgresql/4169E1",
  },
  { name: "Prisma", logo: "https://cdn.simpleicons.org/prisma/2D3748" },
  { name: "Vite", logo: "https://cdn.simpleicons.org/vite/646CFF" },
] as const;

export function AboutPage() {
  return (
    <section className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-amber-300/30 bg-slate-900/75 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.6)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_12%,rgba(251,191,36,0.2),transparent_36%),radial-gradient(circle_at_88%_0%,rgba(56,189,248,0.16),transparent_30%),linear-gradient(120deg,rgba(251,191,36,0.08),transparent_40%,rgba(56,189,248,0.1))]" />
        <div className="relative">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-200">
            Outplay
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase italic text-white md:text-4xl">
            À propos
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Le projet, son état actuel et la vision pour la suite.
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.11em] text-cyan-200">
            <Rocket className="h-3.5 w-3.5" />
            Vision
          </p>
          <h2 className="text-base font-black uppercase tracking-[0.08em] text-white">
            Récap du site
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Outplay est un hub de collection de cartes esport: ouverture de
            boosters, progression quotidienne, achievements, legendex et
            leaderboard communautaire.
          </p>
        </article>

        <article className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-5">
          <p className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.11em] text-amber-200">
            <Heart className="h-3.5 w-3.5" />
            Support
          </p>
          <h2 className="text-base font-black uppercase tracking-[0.08em] text-white">
            Soutenir
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Si tu veux soutenir le projet, tu peux contribuer directement via
            Buy Me a Coffee.
          </p>
          <a
            href="https://buymeacoffee.com/helldeal"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-amber-300/50 bg-amber-300/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-amber-100 transition hover:bg-amber-300/25"
          >
            Ouvrir Buy Me a Coffee
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:col-span-2">
          <p className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.11em] text-fuchsia-200">
            <Wrench className="h-3.5 w-3.5" />
            Stack
          </p>
          <h2 className="text-base font-black uppercase tracking-[0.08em] text-white">
            Les technologies
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Frontend React + TypeScript, design Tailwind, backend Supabase
            (PostgreSQL, Auth, RPC) et Prisma pour la gestion schéma/migrations.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {techStack.map((tech) => (
              <div
                key={tech.name}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/65 px-3 py-2"
              >
                <img
                  src={tech.logo}
                  alt={tech.name}
                  className="h-5 w-5 rounded-sm"
                  loading="lazy"
                />
                <span className="text-xs font-semibold text-slate-200">
                  {tech.name}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.11em] text-orange-200">
            <Construction className="h-3.5 w-3.5" />
            Roadmap
          </p>
          <h2 className="text-base font-black uppercase tracking-[0.08em] text-white">
            En construction
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Le site évolue en continu: nouvelles cartes, équilibrage économie,
            améliorations UX et fonctionnalités communautaires sont en préparation.
          </p>
        </article>
        <article className="rounded-2xl border border-cyan-300/35 bg-cyan-400/10 p-5">
          <h2 className="inline-flex items-center gap-1 text-base font-black uppercase tracking-[0.08em] text-cyan-100">
            <MessageCircle className="h-4 w-4" />
            Feedback
          </h2>
          <p className="mt-2 text-sm text-cyan-50/95">
            Pour les retours, bugs ou idées, envoie-moi un message
          </p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-100/90">
            <BadgeHelp className="h-3.5 w-3.5" />
            Contact: MP Discord
          </p>
        </article>
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/65 px-6 py-8 text-center shadow-[0_24px_80px_rgba(2,6,23,0.65)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(148,163,184,0.12),transparent_32%),radial-gradient(circle_at_90%_0%,rgba(56,189,248,0.1),transparent_26%)]" />

        <div className="relative mx-auto max-w-4xl">
          <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 bg-slate-950/70 text-slate-300">
            <Shield className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-2xl font-black text-white">
            Note importante
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-base leading-relaxed text-slate-300">
            Outplay est un projet communautaire non-officiel développé de
            manière indépendante. Nous ne sommes pas affiliés, associés,
            autorisés, approuvés par, ou officiellement liés à Riot Games,
            Valve, Blizzard, Epic Games ou toute autre organisation. Tous les
            logos, noms et marques cités appartiennent à leurs propriétaires
            respectifs.
          </p>

          <div className="mx-auto mt-7 flex max-w-2xl items-center justify-center gap-6 border-t border-slate-800 pt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            <span>© 2026 Outplay</span>
            <Link to="/privacy" className="transition hover:text-slate-300">
              Confidentialité
            </Link>
          </div>
        </div>
      </section>
    </section>
  );
}
