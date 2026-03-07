import { Copyright, Heart, Info, Shield } from "lucide-react";
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
    ],
  },
  {
    title: "Ressources",
    links: [
      {
        href: "https://helldeal.betteruptime.com/",
        label: "Statut Infrastructure",
        icon: (
          <span className="relative inline-flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-green-300" />
          </span>
        ),
        toneClass:
          "border-cyan-300/45 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/18 hover:border-cyan-200/70",
      },
      {
        href: "https://buymeacoffee.com/helldeal",
        label: "Soutenir le projet",
        icon: <Heart className="mt-0.5 h-4 w-4 shrink-0" />,
        toneClass:
          "border-amber-300/45 bg-amber-300/10 text-amber-100 hover:bg-amber-300/18 hover:border-amber-200/70",
      },
    ],
  },
] as const;

export function AppFooter() {
  return (
    <footer className="relative mt-8 border-t border-slate-800/70 bg-slate-950/70 px-4 py-8 backdrop-blur-xl">
      <div className="relative mx-auto grid w-full max-w-7xl gap-16 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <img src="/logo-complete.png" alt="Outplay" className="h-8 w-auto" />
          <p className="max-w-sm text-sm leading-relaxed text-slate-300">
            Outplay est un hub communautaire de collection esport. Le projet
            evolue en continu avec de nouvelles cartes, economies et
            fonctionnalites.
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
                      className={
                        "group flex items-center gap-2 rounded-xl border px-3 py-2 transition " +
                        entry.toneClass
                      }
                    >
                      {entry.icon}
                      <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.08em]">
                        {entry.label}
                      </span>
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
          <Copyright className="h-4 w-4" />
          Outplay 2026
        </span>

        <span className="rounded-lg border border-slate-800/70 bg-slate-900/50 px-3 py-1.5 text-right font-semibold uppercase tracking-[0.08em] text-slate-400">
          DEV BY <span className="text-amber-200">HellDeal</span> 🫠
        </span>
      </div>
    </footer>
  );
}
