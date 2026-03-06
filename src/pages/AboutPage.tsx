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
            A Propos
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Le projet, son etat actuel et la vision pour la suite.
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-base font-black uppercase tracking-[0.08em] text-white">
            Recap du site
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Outplay est un hub de collection de cartes esport: ouverture de
            boosters, progression quotidienne, achievements, legendex et
            leaderboard communautaire.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-base font-black uppercase tracking-[0.08em] text-white">
            Soutenir
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Si tu veux soutenir le projet, un lien Buy Me a Coffee est
            disponible dans le footer.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-base font-black uppercase tracking-[0.08em] text-white">
            Les technologies
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Frontend React + TypeScript, design Tailwind, backend Supabase
            (PostgreSQL, Auth, RPC) et Prisma pour la gestion schema/migrations.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-base font-black uppercase tracking-[0.08em] text-white">
            En construction
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Le site evolue en continu: nouvelles cartes, equilibrage economy,
            ameliorations UX et features communautaires sont en preparation.
          </p>
        </article>
      </div>

      <article className="rounded-2xl border border-cyan-300/35 bg-cyan-400/10 p-5">
        <h2 className="text-base font-black uppercase tracking-[0.08em] text-cyan-100">
          Feedback
        </h2>
        <p className="mt-2 text-sm text-cyan-50/95">
          Pour les retours, bugs ou idees, envoie-moi un message prive sur
          Discord.
        </p>
      </article>
    </section>
  );
}
