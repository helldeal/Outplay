import { Cookie, Database, Fingerprint, Scale, Server } from "lucide-react";

const privacySections = [
  {
    title: "1. Introduction",
    icon: Fingerprint,
    body: "Outplay est un projet communautaire de collection de cartes esport. Nous minimisons les donnees stockees et privilegions la transparence.",
  },
  {
    title: "2. Donnees collectees",
    icon: Database,
    body: "Lors de la connexion, nous pouvons traiter des informations de profil necessaires au fonctionnement: identifiant utilisateur, pseudo, avatar, progression de collection, historique d'ouverture, score, achievements et solde PC.",
  },
  {
    title: "3. Infrastructure & Sous-traitants",
    icon: Server,
    body: "Le service s'appuie sur une infrastructure cloud et des services tiers techniques (authentification, base de donnees, monitoring). Ces partenaires agissent comme sous-traitants pour assurer l'hebergement, la securite et la disponibilite de l'application.",
  },
  {
    title: "4. Utilisation des Cookies",
    icon: Cookie,
    body: "Des cookies/session storage techniques peuvent etre utilises pour maintenir la session connectee et securiser l'authentification. Aucun cookie publicitaire n'est utilise par defaut dans le cadre actuel.",
  },
  {
    title: "5. Vos Droits (RGPD)",
    icon: Scale,
    body: "Conformement au RGPD, tu peux demander l'acces, la rectification, l'effacement ou la limitation du traitement de tes donnees. Pour toute demande, contacte-nous via les canaux communautaires indiques sur la page A propos.",
  },
] as const;

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

      <div className="space-y-3">
        {privacySections.map((section, index) => {
          const Icon = section.icon;

          return (
            <article
              key={section.title}
              className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/65 p-5 text-sm text-slate-200 shadow-[0_12px_28px_rgba(2,6,23,0.35)]"
            >
              <div
                className={`pointer-events-none absolute inset-y-0 left-0 w-1 ${
                  index % 2 === 0 ? "bg-cyan-300/70" : "bg-amber-300/70"
                }`}
              />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(148,163,184,0.08),transparent_35%,rgba(56,189,248,0.06))]" />

              <div className="relative">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-600/80 bg-slate-950/70 text-slate-200">
                  <Icon className="h-4 w-4" />
                </span>
                <h2 className="mt-2 text-base font-black uppercase tracking-[0.08em] text-white">
                  {section.title}
                </h2>
                <p className="mt-2 text-slate-300">{section.body}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
