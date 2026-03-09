import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  BarChart3,
  Clock3,
  Dices,
  History,
  Medal,
  PencilLine,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { CardTile } from "../components/CardTile";
import { PlayerAvatar } from "../components/leaderboard/PlayerAvatar";
import { PageLoading } from "../components/PageLoading";
import { useAchievementsProgressQuery } from "../query/achievements";
import {
  publicProfileOverviewQueryKey,
  updateCurrentUserProfileIdentity,
  usePublicProfileCollectionQuery,
  usePublicProfileOverviewQuery,
  usePublicProfileRecentAchievementsQuery,
  usePublicProfileRecentOpeningsQuery,
} from "../query/profile";
import { rarityLabel, rarityTextColor } from "../utils/rarity";

const intFormatter = new Intl.NumberFormat("fr-FR");

function formatPercent(value: number): string {
  return `${Math.max(0, Math.round(value * 10) / 10)}%`;
}

export function ProfilePage() {
  const { userId: routeUserId } = useParams();
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const targetUserId = routeUserId ?? user?.id;
  const isOwnProfile = Boolean(
    user?.id && targetUserId && user.id === targetUserId,
  );

  const overviewQuery = usePublicProfileOverviewQuery(targetUserId);
  const collectionQuery = usePublicProfileCollectionQuery(targetUserId);
  const recentOpeningsQuery = usePublicProfileRecentOpeningsQuery(targetUserId);
  const recentAchievementsQuery =
    usePublicProfileRecentAchievementsQuery(targetUserId);
  const achievementsQuery = useAchievementsProgressQuery(
    isOwnProfile ? user?.id : undefined,
  );

  const [tab, setTab] = useState<"collection" | "stats" | "activity">(
    "collection",
  );
  const [usernameDraft, setUsernameDraft] = useState("");
  const [titleDraft, setTitleDraft] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!overviewQuery.data || !isOwnProfile) {
      return;
    }

    setUsernameDraft(
      (prev) => prev || profile?.username || overviewQuery.data.username,
    );
    setTitleDraft((prev) => (prev ? prev : (overviewQuery.data.title ?? "")));
  }, [isOwnProfile, overviewQuery.data, profile?.username]);

  const availableTitles = useMemo(() => {
    if (!isOwnProfile) {
      return [] as string[];
    }

    const rows = achievementsQuery.data ?? [];
    return Array.from(
      new Set(
        rows
          .filter((row) => row.reward_claimed && row.reward_title)
          .map((row) => row.reward_title as string),
      ),
    ).sort((a, b) => a.localeCompare(b, "fr"));
  }, [achievementsQuery.data, isOwnProfile]);

  const rarityCards = overviewQuery.data
    ? [
        {
          label: "Legends",
          value: overviewQuery.data.legendsOwned,
          tone: "text-amber-300",
        },
        {
          label: "World Class",
          value: overviewQuery.data.worldClassOwned,
          tone: "text-orange-300",
        },
        {
          label: "Champion",
          value: overviewQuery.data.championOwned,
          tone: "text-purple-300",
        },
      ]
    : [];

  if (!targetUserId) {
    return (
      <p className="text-sm text-slate-400">
        Connecte-toi pour consulter ton profil.
      </p>
    );
  }

  if (overviewQuery.isLoading || collectionQuery.isLoading) {
    return <PageLoading subtitle="Chargement du profil..." />;
  }

  if (overviewQuery.error || collectionQuery.error) {
    return (
      <p className="text-sm text-rose-300">
        {((overviewQuery.error ?? collectionQuery.error) as Error).message}
      </p>
    );
  }

  if (!overviewQuery.data) {
    return <p className="text-sm text-slate-400">Profil introuvable.</p>;
  }

  const overview = overviewQuery.data;
  const collection = collectionQuery.data ?? [];

  const luckyPullRate =
    overview.totalOpenings > 0
      ? ((overview.legendsOwned + overview.worldClassOwned) /
          overview.totalOpenings) *
        100
      : 0;

  const boosterTypeShares = [
    { label: "Normal", value: overview.normalOpenings, color: "bg-cyan-300" },
    { label: "Luck", value: overview.luckOpenings, color: "bg-emerald-300" },
    {
      label: "Premium",
      value: overview.premiumOpenings,
      color: "bg-amber-300",
    },
    { label: "Daily", value: overview.dailyOpenings, color: "bg-fuchsia-300" },
    { label: "Streak", value: overview.streakOpenings, color: "bg-indigo-300" },
  ];

  const handleSave = async () => {
    if (!isOwnProfile) {
      return;
    }

    setSaveError(null);
    setSaveSuccess(null);
    setIsSaving(true);

    try {
      const normalizedTitle =
        !titleDraft.trim() ||
        titleDraft.toLowerCase() === "null" ||
        titleDraft.toLowerCase() === "undefined" ||
        titleDraft.toLowerCase() === "aucun titre"
          ? null
          : titleDraft;

      await updateCurrentUserProfileIdentity({
        username: usernameDraft,
        title: normalizedTitle,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: publicProfileOverviewQueryKey(overview.userId),
        }),
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
        refreshProfile(),
      ]);

      setSaveSuccess("Profil mis a jour.");
    } catch (error) {
      setSaveError((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-900/75 p-5 shadow-[0_20px_60px_rgba(2,6,23,0.55)] md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(34,211,238,0.26),transparent_36%),radial-gradient(circle_at_95%_20%,rgba(251,191,36,0.18),transparent_34%),linear-gradient(120deg,rgba(56,189,248,0.08),transparent_45%,rgba(244,114,182,0.08))]" />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <PlayerAvatar
              avatarUrl={overview.avatarUrl}
              username={overview.username}
              size="lg"
            />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">
                Profil joueur
              </p>
              <h1 className="mt-1 text-3xl font-black uppercase italic tracking-tight text-white md:text-4xl">
                {overview.username}
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                {overview.title
                  ? `Titre: ${overview.title}`
                  : "Aucun titre equipé"}
              </p>
              {isOwnProfile ? (
                <p className="mt-1 text-xs text-cyan-200/90">
                  Modifie ton username et ton titre ci-dessous.
                </p>
              ) : (
                <Link
                  to="/leaderboard"
                  className="mt-1 inline-flex text-xs font-semibold text-cyan-200 transition hover:text-cyan-100"
                >
                  Retour au leaderboard
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/55 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                Score
              </p>
              <p className="text-lg font-black text-cyan-200">
                {intFormatter.format(overview.weightedScore)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/55 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                Cartes
              </p>
              <p className="text-lg font-black text-white">
                {intFormatter.format(overview.totalCards)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/55 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                Achievements
              </p>
              <p className="text-lg font-black text-amber-300">
                {intFormatter.format(overview.achievementsUnlocked)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/55 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                Openings
              </p>
              <p className="text-lg font-black text-fuchsia-300">
                {intFormatter.format(overview.totalOpenings)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isOwnProfile && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
          <div className="flex items-center gap-2">
            <PencilLine className="h-4 w-4 text-cyan-300" />
            <h2 className="text-sm font-black uppercase tracking-[0.11em] text-white">
              Editer le profil
            </h2>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-300">
                Username
              </span>
              <input
                value={usernameDraft}
                onChange={(event) => setUsernameDraft(event.target.value)}
                maxLength={24}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/60"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-300">
                Titre
              </span>
              <select
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/60"
              >
                <option value="">Aucun titre</option>
                {availableTitles.map((title) => (
                  <option key={title} value={title}>
                    {title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                void handleSave();
              }}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/60 bg-cyan-400/15 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Sauvegarde..." : "Sauvegarder"}
            </button>

            {saveSuccess ? (
              <p className="text-xs text-emerald-300">{saveSuccess}</p>
            ) : null}
            {saveError ? (
              <p className="text-xs text-rose-300">{saveError}</p>
            ) : null}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/55 p-2">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setTab("collection")}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              tab === "collection"
                ? "bg-cyan-400/20 text-cyan-100"
                : "bg-slate-950/50 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Medal className="h-4 w-4" />
            Collection
          </button>
          <button
            onClick={() => setTab("stats")}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              tab === "stats"
                ? "bg-amber-300/20 text-amber-100"
                : "bg-slate-950/50 text-slate-400 hover:text-slate-200"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Stats
          </button>
          <button
            onClick={() => setTab("activity")}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              tab === "activity"
                ? "bg-fuchsia-300/20 text-fuchsia-100"
                : "bg-slate-950/50 text-slate-400 hover:text-slate-200"
            }`}
          >
            <History className="h-4 w-4" />
            Activite
          </button>
        </div>
      </div>

      {tab === "collection" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {collection
            .slice()
            .sort((a, b) => b.card.pc_value - a.card.pc_value)
            .map((row) => (
              <CardTile
                key={`${row.card_id}-${row.obtained_at}`}
                card={row.card}
                obtainedAt={row.obtained_at}
                isOwned
                disableExpand={false}
              />
            ))}
        </div>
      ) : tab === "stats" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
            <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.11em] text-white">
              <Dices className="h-4 w-4 text-emerald-300" />
              Chance & boosters
            </h2>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <p>
                Taux de grosses pulls (Legends + World Class):
                <span className="ml-2 font-black text-emerald-300">
                  {formatPercent(luckyPullRate)}
                </span>
              </p>
              <p>
                Valeur moyenne recuperee par ouverture:
                <span className="ml-2 font-black text-cyan-200">
                  {intFormatter.format(Math.round(overview.avgPcGained))} PC
                </span>
              </p>
              <p>
                Taux de doublons:
                <span className="ml-2 font-black text-rose-300">
                  {formatPercent(overview.duplicateRate * 100)}
                </span>
              </p>
            </div>

            <div className="mt-4 space-y-2">
              {boosterTypeShares.map((entry) => {
                const pct =
                  overview.totalOpenings > 0
                    ? (entry.value / overview.totalOpenings) * 100
                    : 0;

                return (
                  <div key={entry.label}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                      <span>{entry.label}</span>
                      <span>
                        {intFormatter.format(entry.value)} ({formatPercent(pct)}
                        )
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full ${entry.color}`}
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
            <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.11em] text-white">
              <ShieldCheck className="h-4 w-4 text-amber-300" />
              Stats cartes
            </h2>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {rarityCards.map((entry) => (
                <div
                  key={entry.label}
                  className="rounded-xl border border-slate-700/70 bg-slate-950/55 p-2"
                >
                  <p className={`text-xs font-semibold ${entry.tone}`}>
                    {entry.label}
                  </p>
                  <p className="mt-1 text-xl font-black text-white">
                    {intFormatter.format(entry.value)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <p>
                Jeu favori:
                <span className="ml-2 font-semibold text-cyan-200">
                  {overview.favoriteGame ?? "N/A"}
                </span>
              </p>
              <p>
                Carte signature:
                <span className="ml-2 font-semibold text-white">
                  {overview.bestCardName ?? "N/A"}
                </span>
                {overview.bestCardRarity ? (
                  <span
                    className={`ml-2 text-xs font-bold ${rarityTextColor(overview.bestCardRarity)}`}
                  >
                    {rarityLabel(overview.bestCardRarity)}
                  </span>
                ) : null}
                {overview.bestCardPcValue > 0 ? (
                  <span className="ml-2 text-xs text-slate-400">
                    ({intFormatter.format(overview.bestCardPcValue)} PC)
                  </span>
                ) : null}
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-cyan-300/30 bg-cyan-400/10 p-3 text-xs text-cyan-100">
              <p className="inline-flex items-center gap-1 font-bold uppercase tracking-[0.1em]">
                <Sparkles className="h-3.5 w-3.5" />
                Lecture chance
              </p>
              <p className="mt-1 text-cyan-50/90">
                Plus le taux de grosses pulls est eleve et le taux de doublons
                est bas, plus le profil est considere "chanceux".
              </p>
            </div>
          </article>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
            <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.11em] text-white">
              <Clock3 className="h-4 w-4 text-cyan-300" />
              Dernieres ouvertures
            </h2>

            {recentOpeningsQuery.isLoading ? (
              <p className="mt-3 text-sm text-slate-400">
                Chargement des ouvertures...
              </p>
            ) : recentOpeningsQuery.error ? (
              <p className="mt-3 text-sm text-rose-300">
                {(recentOpeningsQuery.error as Error).message}
              </p>
            ) : (recentOpeningsQuery.data ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">
                Aucune ouverture recente.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {(recentOpeningsQuery.data ?? []).map((opening) => (
                  <div
                    key={opening.openingId}
                    className="rounded-xl border border-slate-700/70 bg-slate-950/55 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">
                        {opening.boosterName ?? "Booster"}
                        {opening.seriesName ? ` - ${opening.seriesName}` : ""}
                      </p>
                      <span className="text-[11px] text-slate-400">
                        {new Date(opening.openedAt).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {opening.openingType} · +
                      {intFormatter.format(opening.pcGained)} PC ·{" "}
                      {opening.duplicateCards} doublon(s)
                    </p>
                    {opening.bestCardName ? (
                      <p className="mt-1 text-xs text-slate-300">
                        Best pull:{" "}
                        <span className="font-semibold text-white">
                          {opening.bestCardName}
                        </span>
                        {opening.bestCardRarity ? (
                          <span
                            className={`ml-2 font-semibold ${rarityTextColor(opening.bestCardRarity)}`}
                          >
                            {rarityLabel(opening.bestCardRarity)}
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
            <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.11em] text-white">
              <Sparkles className="h-4 w-4 text-amber-300" />
              Derniers achievements
            </h2>

            {recentAchievementsQuery.isLoading ? (
              <p className="mt-3 text-sm text-slate-400">
                Chargement des achievements...
              </p>
            ) : recentAchievementsQuery.error ? (
              <p className="mt-3 text-sm text-rose-300">
                {(recentAchievementsQuery.error as Error).message}
              </p>
            ) : (recentAchievementsQuery.data ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">
                Aucun achievement recent.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {(recentAchievementsQuery.data ?? []).map((achievement) => (
                  <div
                    key={`${achievement.code}-${achievement.unlockedAt}`}
                    className="rounded-xl border border-slate-700/70 bg-slate-950/55 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">
                        {achievement.name}
                      </p>
                      <span className="text-[11px] text-slate-400">
                        {new Date(achievement.unlockedAt).toLocaleString(
                          "fr-FR",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </span>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-[0.1em] text-amber-300/90">
                      {achievement.category}
                    </p>
                    <p className="mt-1 text-xs text-slate-300">
                      Reward:
                      {achievement.rewardPc > 0
                        ? ` ${intFormatter.format(achievement.rewardPc)} PC`
                        : ""}
                      {achievement.rewardBoosterType
                        ? ` · ${achievement.rewardBoosterType} Booster`
                        : ""}
                      {achievement.rewardTitle
                        ? ` · Titre: ${achievement.rewardTitle}`
                        : ""}
                      {achievement.rewardPc === 0 &&
                      !achievement.rewardBoosterType &&
                      !achievement.rewardTitle
                        ? " Aucune recompense"
                        : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>
      )}
    </section>
  );
}
