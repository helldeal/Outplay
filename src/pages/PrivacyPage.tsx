export function PrivacyPage() {
  return (
    <section className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-cyan-300/30 bg-slate-900/75 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.6)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_90%_0%,rgba(251,191,36,0.14),transparent_30%),linear-gradient(120deg,rgba(34,211,238,0.08),transparent_45%,rgba(251,191,36,0.08))]" />
        <div className="relative">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200">
            Legal
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase italic text-white md:text-4xl">
            Politique de Confidentialite
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Cette page explique quelles donnees sont utilisees sur Outplay, dans
            quel but, et comment exercer tes droits.
          </p>
        </div>
      </header>

      <article className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-200">
        <section className="space-y-1">
          <h2 className="text-base font-black uppercase tracking-[0.08em] text-white">
            1. Introduction
          </h2>
          <p>
            Outplay est un projet communautaire de collection de cartes esport.
            Nous minimisons les donnees stockees et privilegions la
            transparence.
          </p>
        </section>

        <section className="space-y-1">
          <h2 className="text-base font-black uppercase tracking-[0.08em] text-white">
            2. Donnees collectees
          </h2>
          <p>
            Lors de la connexion, nous pouvons traiter des informations de
            profil necessaires au fonctionnement: identifiant utilisateur,
            pseudo, avatar, progression de collection, historique d'ouverture,
            score, achievements et solde PC.
          </p>
        </section>

        <section className="space-y-1">
          <h2 className="text-base font-black uppercase tracking-[0.08em] text-white">
            3. Infrastructure & Sous-traitants
          </h2>
          <p>
            Le service s'appuie sur une infrastructure cloud et des services
            tiers techniques (authentification, base de donnees, monitoring).
            Ces partenaires agissent comme sous-traitants pour assurer
            l'hebergement, la securite et la disponibilite de l'application.
          </p>
        </section>

        <section className="space-y-1">
          <h2 className="text-base font-black uppercase tracking-[0.08em] text-white">
            4. Utilisation des Cookies
          </h2>
          <p>
            Des cookies/session storage techniques peuvent etre utilises pour
            maintenir la session connectee et securiser l'authentification.
            Aucun cookie publicitaire n'est utilise par defaut dans le cadre
            actuel.
          </p>
        </section>

        <section className="space-y-1">
          <h2 className="text-base font-black uppercase tracking-[0.08em] text-white">
            5. Vos Droits (RGPD)
          </h2>
          <p>
            Conformement au RGPD, tu peux demander l'acces, la rectification,
            l'effacement ou la limitation du traitement de tes donnees. Pour
            toute demande, contacte-nous via les canaux communautaires indiques
            sur la page A propos.
          </p>
        </section>
      </article>
    </section>
  );
}
