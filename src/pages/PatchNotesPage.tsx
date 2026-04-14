import { CalendarDays, Sparkles, Tag } from "lucide-react";

export const milestones = [
  {
    version: "ROADMAP",
    date: "N/A",
    title: "à venir",
    tone: "border-slate-300/35 bg-slate-400/10 text-slate-100",
    updates: [
      "Saison 4: Rift Makers",
      "Cartes 'Prestige' à partir de 10 doublons de la même carte.",
      "Ajouts d'autres animations et améliorations visuelles.",
      "Responsivité mobile améliorée pour une expérience optimale sur tous les appareils.",
      "Système de pickup de cartes: possibilité de choisir une carte parmi les boosters ouverts.",
      "Et bien plus encore...",
    ],
  },
  {
    version: "v1.2.2",
    date: "14 avril 2026",
    title: "Améliorations des stats & Corrections de bugs",
    tone: "border-emerald-300/35 bg-emerald-400/10 text-emerald-100",
    updates: [
      "Ajout de nouvelles statistiques sur le profil.",
      "Correction du bug qui auto attibuait les titres du series split au claim.",
      "Correction du ratio score réel / valeur des cartes pour la 2ème matrice du leaderboard. (Le ratio était inversé, Oups.., c'est plus logique comme maintenant)",
      "Affichage et sélection de la série ciblé dans le dropdown de l'utilisateur.",
      "Parrainage ajouté dans le dropdown de l'utilisateur.",
    ],
  },
  {
    version: "v1.2.1",
    date: "3 avril 2026",
    title: "Corrections de bugs & Ajustements visuels",
    tone: "border-cyan-300/35 bg-cyan-400/10 text-cyan-100",
    updates: [
      "Correction du bug d'affichage des titres sur le profil et le leaderboard.",
      "Ajouts d'animations et autres améliorations visuelles.",
      "Ajouts de nouvelles statistiques sur le profil et le leaderboard.",
      "Refonte de la page de Split de série.",
    ],
  },
  {
    version: "v1.2",
    date: "28 mars 2026",
    title: "Split de série S3 - French Touch",
    tone: "border-amber-300/35 bg-amber-400/10 text-amber-100",
    updates: [
      "Lancement de la série S3: French Touch.",
      "Split Series: En gros c'est un Battle Pass pour la serie en cours. Nouveaux titres exclusifs à débloquer et récompenses uniques.",
      "Améliorations de stabilité et de performance.",
      "Achievements: Triés par metrics plus logiques, ajout de nouveaux achievements liés aux catégories CHANCE et SOCIAL.",
      "Ajout de couleurs de titres spécifiques pour le profil et le leaderboard.",
      "Nouveau système de score pour les cartes: coefficient de rareté appliqué (taux de drop attendu/taux de drop réel) aux points de score.",
      "Ouverture de boosters: Ajout des cartes CHALLENGER dans les reveals progressifs et rareté révelée progressivement.",
    ],
  },
  {
    version: "v1.0.2",
    date: "24 mars 2026",
    title: "Équilibrage de l'économie & Améliorations de stabilité",
    tone: "border-blue-300/35 bg-blue-400/10 text-blue-100",
    updates: [
      "Nouveaux prix & ROI des boosters:",
      "NORMAL: 1250 → 1600 (ROI 77% → 60%)",
      "LUCK: 3500 → 2700 (ROI 49% → 65%)",
      "PREMIUM: 8000 → 4650 (ROI 40% → 70%)",
      "Compensation appliquée:",
      "NORMAL = 0 (Bien joué à ceux qui ont spam ces boosters en early c'était le plus rentable, mb pour les autres)",
      "LUCK = 800 × nombre acheté",
      "PREMIUM = 3350 × nombre acheté",
    ],
  },
  {
    version: "v1.0.1",
    date: "23 mars 2026",
    title: "Interface repensée & Animations",
    tone: "border-emerald-300/35 bg-emerald-400/10 text-emerald-100",
    updates: [
      "Collection: filtres sélectionnables et options dynamiques selon les autres filtres.",
      "Legendex: sélection par défaut de la série ciblé par l'utilisateur.",
      "Leaderboard: animations et dynamisation de la page.",
      "Matrices leaderboard: affichage optimisé pour mieux étaler les points autour de la moyenne",
    ],
  },
  {
    version: "v1.0",
    date: "20 mars 2026",
    title: "Sortie officielle / Rift Champion - Clutch Factor",
    tone: "border-fuchsia-300/35 bg-fuchsia-400/10 text-fuchsia-100",
    updates: [
      "Système de parainage introduit pour récompenser les joueurs qui invitent leurs amis à rejoindre Outplay.",
      "Système d'achievements renforcé avec une progression mieux suivie et des récompenses plus lisibles.",
      "Expérience collection améliorée: filtres plus pratiques et score plus simple à comprendre.",
      "Équilibrage du gameplay et de l'économie pour une progression plus cohérente au quotidien.",
      "Nouvelles améliorations de stabilité pour réduire les erreurs et sécuriser l'expérience de jeu.",
      "Finalisation de la version 1.0 avec une navigation plus claire et une interface mieux polie.",
    ],
  },
  {
    version: "v0.2",
    date: "18 mars 2026",
    title: "Deuxième phase de test",
    tone: "border-amber-300/35 bg-amber-400/10 text-amber-100",
    updates: [
      "Profil joueur enrichi: activité récente, statistiques plus claires et meilleure présentation des informations.",
      "Ajout d'un récapitulatif public des ouvertures pour mieux suivre les tirages importants.",
      "Classement amélioré avec un podium plus lisible et une progression plus compréhensible.",
      "Ajout de statistiques globales pour mieux suivre sa progression et comparer avec les autres joueurs.",
      "Arrivée de la série S2 avec de nouvelles cartes et plusieurs corrections sur la boutique et le Legendex.",
      "Améliorations de stabilité et de fiabilité pour limiter les bugs pendant la phase de test.",
    ],
  },
  {
    version: "v0.1",
    date: "07 mars 2026",
    title: "Première phase de test",
    tone: "border-cyan-300/35 bg-cyan-400/10 text-cyan-100",
    updates: [
      "Lancement de la première version jouable d'Outplay pour démarrer les tests utilisateurs.",
      "Navigation principale en place pour ouvrir des boosters, suivre sa collection et progresser.",
      "Premiers réglages de stabilité pour rendre l'expérience plus fluide dès les débuts.",
    ],
  },
] as const;

export function PatchNotesPage() {
  return (
    <section className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-cyan-300/30 bg-slate-900/75 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.6)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_15%,rgba(56,189,248,0.2),transparent_32%),radial-gradient(circle_at_92%_0%,rgba(244,114,182,0.16),transparent_30%),linear-gradient(120deg,rgba(56,189,248,0.08),transparent_45%,rgba(251,191,36,0.1))]" />
        <div className="relative">
          <p className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200">
            <Sparkles className="h-3.5 w-3.5" />
            Changelog
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase italic text-white md:text-4xl">
            Patch Notes
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Historique des mises à jour importantes et des changements majeurs
            depuis le lancement d&apos;Outplay. Reste à jour avec les dernières
            améliorations, les nouvelles fonctionnalités et les ajustements de
            gameplay pour profiter au mieux de ton expérience de jeu.
          </p>
        </div>
      </header>

      <div className="space-y-3">
        {milestones.map((milestone) => (
          <article
            key={milestone.version}
            className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/65 p-5 text-sm text-slate-200 shadow-[0_12px_28px_rgba(2,6,23,0.35)]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(148,163,184,0.08),transparent_35%,rgba(56,189,248,0.06))]" />

            <div className="relative">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-300">
                    {milestone.title}
                  </p>
                  <h2 className="mt-1 text-xl font-black uppercase italic tracking-[0.03em] text-white">
                    {milestone.version}
                  </h2>
                </div>

                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.1em] ${milestone.tone}`}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  {milestone.date}
                </div>
              </div>

              <ul className="mt-4 space-y-2 text-sm text-slate-200">
                {milestone.updates.map((update) => (
                  <li key={update} className="flex gap-2">
                    <Tag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-200" />
                    <span>{update}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
