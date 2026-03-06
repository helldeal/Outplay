import {
  ExternalLink,
  Heart,
  Info,
  Shield,
  Sparkles,
  UserCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";

const sitemapSections = [
  {
    title: "Navigation",
    links: [
      { to: "/", label: "Accueil" },
      { to: "/shop", label: "Boutique" },
      { to: "/legendex", label: "Legendex" },
      { to: "/leaderboard", label: "Leaderboard" },
      { to: "/achievements", label: "Achievements" },
    ],
  },
  {
    title: "Informations",
    links: [
      { to: "/about", label: "A propos", icon: Info },
      { to: "/privacy", label: "Confidentialite", icon: Shield },
      { to: "/login", label: "Connexion", icon: UserCircle2 },
    ],
  },
  {
    title: "Ressources",
    links: [
      {
        href: "https://helldeal.betteruptime.com/",
        label: "Status Page",
      },
      {
        href: "https://buymeacoffee.com/helldeal",
        label: "Buy Me A Coffee",
      },
    ],
  },
] as const;

export function AppFooter() {
  return (
    <footer className="relative mt-8 border-t border-slate-800/70 bg-slate-950/70 px-4 py-8 backdrop-blur-xl">
      <div className="relative mx-auto grid w-full max-w-7xl gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-1 rounded-full border border-cyan-300/40 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">
            <Sparkles className="h-3.5 w-3.5" />
            Outplay
          </p>
          <p className="text-sm text-slate-300">
            Hub communautaire de collection esport. Build en continu.
          </p>
        </div>

        {sitemapSections.map((section) => (
          <div key={section.title} className="space-y-2">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-300">
              {section.title}
            </p>
            <ul className="space-y-1.5 text-sm text-slate-400">
              {section.links.map((entry) => {
                if ("to" in entry) {
                  const EntryIcon = "icon" in entry ? entry.icon : undefined;
                  return (
                    <li key={entry.to}>
                      <Link
                        to={entry.to}
                        className="inline-flex items-center gap-1.5 transition hover:text-white"
                      >
                        {EntryIcon ? (
                          <EntryIcon className="h-3.5 w-3.5" />
                        ) : null}
                        {entry.label}
                      </Link>
                    </li>
                  );
                }

                return (
                  <li key={entry.href}>
                    <a
                      href={entry.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 transition hover:text-white"
                    >
                      {entry.label}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="relative mx-auto mt-6 flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 border-t border-slate-800/90 pt-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <UserCircle2 className="h-4 w-4" />
          Copyright Outplay 2026
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://helldeal.betteruptime.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-cyan-300/45 bg-cyan-300/10 px-2 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-cyan-200 transition hover:bg-cyan-300/20"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Status infrastructure
          </a>
          <a
            href="https://buymeacoffee.com/helldeal"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-amber-300/45 bg-amber-300/10 px-2 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-amber-200 transition hover:bg-amber-300/20"
          >
            <Heart className="h-3.5 w-3.5" />
            Soutenir le projet
          </a>
        </div>
      </div>
    </footer>
  );
}
