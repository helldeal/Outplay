import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  BarChart3,
  Clock3,
  Crown,
  Dices,
  History,
  Medal,
  PencilLine,
  ScanSearch,
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
const percentFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const relativeTimeFormatter = new Intl.RelativeTimeFormat("fr-FR", {
  numeric: "always",
});

function formatFullDate(value: string): string {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(value: string): string {
  const targetTime = new Date(value).getTime();

  if (Number.isNaN(targetTime)) {
    return "Date inconnue";
  }

  const diffInSeconds = Math.round((targetTime - Date.now()) / 1000);
  const absDiffInSeconds = Math.abs(diffInSeconds);

  if (absDiffInSeconds < 45) {
    return "A l'instant";
  }

  const units: Array<{
    unit: Intl.RelativeTimeFormatUnit;
    seconds: number;
  }> = [
    { unit: "year", seconds: 60 * 60 * 24 * 365 },
    { unit: "month", seconds: 60 * 60 * 24 * 30 },
    { unit: "week", seconds: 60 * 60 * 24 * 7 },
    { unit: "day", seconds: 60 * 60 * 24 },
    { unit: "hour", seconds: 60 * 60 },
    { unit: "minute", seconds: 60 },
  ];

  const selectedUnit =
    units.find(({ seconds }) => absDiffInSeconds >= seconds) ??
    units[units.length - 1];

  return relativeTimeFormatter.format(
    Math.round(diffInSeconds / selectedUnit.seconds),
    selectedUnit.unit,
  );
}

function formatPercent(value: number): string {
  return `${Math.max(0, Math.round(value * 10) / 10)}%`;
}

function formatPercent2(value: number): string {
  return `${percentFormatter.format(Math.max(0, value))}%`;
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
  const [signatureCardIdDraft, setSignatureCardIdDraft] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!overviewQuery.data || !isOwnProfile) {
      return;
    }

    const rawUsername = profile?.username ?? overviewQuery.data.username;
    const cleanUsername = rawUsername.split("#")[0] || rawUsername;
    setUsernameDraft((prev) => prev || cleanUsername);
    setTitleDraft((prev) => (prev ? prev : (overviewQuery.data.title ?? "")));
    setSignatureCardIdDraft(
      (prev) => prev || overviewQuery.data.signatureCardId || "",
    );
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

  const signatureCardOptions = collection
    .slice()
    .sort((a, b) => b.card.pc_value - a.card.pc_value)
    .map((row) => ({
      value: row.card_id,
      label: `${row.card_id} · ${rarityLabel(row.card.rarity)} · ${row.card.name}`,
    }));

  const luckyPullRate = overview.bigPullRate;
  const playerDuplicateRate = Math.min(
    100,
    Math.max(0, overview.duplicateRate),
  );
  const playerBigPullRate = Math.min(100, Math.max(0, luckyPullRate));
  const averageDuplicateRate = Math.min(
    100,
    Math.max(0, overview.globalAvgDuplicateRate),
  );
  const averageBigPullRate = Math.min(
    100,
    Math.max(0, overview.globalAvgBigPullRate),
  );

  const duplicateDelta = playerDuplicateRate - averageDuplicateRate;
  const bigPullDelta = playerBigPullRate - averageBigPullRate;

  const matrixHalfSpanX = Math.min(
    50,
    Math.max(10, Math.ceil(Math.abs(duplicateDelta) / 5) * 5 + 5),
  );
  const matrixHalfSpanY = Math.min(
    50,
    Math.max(10, Math.ceil(Math.abs(bigPullDelta) / 5) * 5 + 5),
  );

  const playerMatrixX = 50 + (duplicateDelta / matrixHalfSpanX) * 50;
  const playerMatrixY = 50 + (bigPullDelta / matrixHalfSpanY) * 50;
  const averageMatrixX = 50;
  const averageMatrixY = 50;

  const totalBoosterOpenings =
    overview.normalOpenings +
    overview.luckOpenings +
    overview.premiumOpenings +
    overview.godpackOpenings;

  const boosterTypeShares = [
    { label: "Normal", value: overview.normalOpenings, color: "bg-cyan-300" },
    { label: "Luck", value: overview.luckOpenings, color: "bg-emerald-300" },
    {
      label: "Premium",
      value: overview.premiumOpenings,
      color: "bg-amber-300",
    },
    {
      label: "Godpack",
      value: overview.godpackOpenings,
      color: "bg-fuchsia-300",
    },
  ];

  const maxBoosterShareValue = Math.max(
    1,
    ...boosterTypeShares.map((entry) => entry.value),
  );

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
        signatureCardId: signatureCardIdDraft || null,
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
              ) : null}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/55 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                Position
              </p>
              <p className="inline-flex items-center gap-1 text-lg font-black text-cyan-200">
                <Crown className="h-4 w-4 text-amber-300" />
                {overview.leaderboardPosition
                  ? `#${intFormatter.format(overview.leaderboardPosition)}`
                  : "N/A"}
              </p>
            </div>
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
                Porte Monnaie
              </p>
              <p className="text-lg font-black text-amber-300">
                {intFormatter.format(overview.pcBalance)} PC
              </p>
            </div>
            <div className="col-span-2 flex gap-3 rounded-xl border border-slate-700/80 bg-slate-950/55 px-3 py-2 sm:col-span-1">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                  Signature
                </p>
                {overview.signatureCardName ? (
                  <>
                    <p
                      className={`truncate text-sm font-black uppercase tracking-wider ${rarityTextColor(overview.signatureCardRarity)}`}
                    >
                      {overview.signatureCardName}
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-black text-slate-500">Aucune</p>
                )}
              </div>
              {overview.signatureCardImageUrl ? (
                <div className="h-10 aspect-[3/4] shrink-0 overflow-hidden rounded border border-slate-700/60 bg-black">
                  <img
                    src={overview.signatureCardImageUrl}
                    alt={overview.signatureCardName ?? "Carte signature"}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : null}
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

          <div className="mt-3 grid gap-3 md:grid-cols-3">
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

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-300">
                Carte signature
              </span>
              <select
                value={signatureCardIdDraft}
                onChange={(event) =>
                  setSignatureCardIdDraft(event.target.value)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/60"
              >
                <option value="">Aucune carte signature</option>
                {signatureCardOptions.map((card) => (
                  <option key={card.value} value={card.value}>
                    {card.label}
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
              Chance matrix
            </h2>
            <div className="mt-3 rounded-xl border border-slate-700/70 bg-slate-950/55 p-3">
              <div className="relative h-64 overflow-hidden rounded-lg border border-slate-800 bg-[radial-gradient(circle_at_18%_10%,rgba(16,185,129,0.12),transparent_35%),radial-gradient(circle_at_82%_85%,rgba(244,63,94,0.12),transparent_35%)]">
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                  <div className="border-r border-b border-slate-800/70" />
                  <div className="border-b border-slate-800/70" />
                  <div className="border-r border-slate-800/70" />
                  <div />
                </div>

                <p className="absolute left-2 top-2 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-300/90">
                  Béni
                </p>
                <p className="absolute right-2 top-2 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-300/90">
                  Abondant
                </p>
                <p className="absolute left-2 bottom-2 text-[10px] font-bold uppercase tracking-[0.1em] text-cyan-300/90">
                  Discret
                </p>
                <p className="absolute right-2 bottom-2 text-[10px] font-bold uppercase tracking-[0.1em] text-rose-300/90">
                  Poissard
                </p>

                <div
                  className="absolute z-10 flex h-4 w-4 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.55)]"
                  style={{
                    left: `${Math.min(100, Math.max(0, playerMatrixX))}%`,
                    bottom: `${Math.min(100, Math.max(0, playerMatrixY))}%`,
                  }}
                  title={`Joueur: ${formatPercent(playerDuplicateRate)} doublons / ${formatPercent(playerBigPullRate)} gros pull`}
                />

                <div
                  className="absolute z-10 flex h-4 w-4 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-amber-300 shadow-[0_0_16px_rgba(252,211,77,0.55)]"
                  style={{
                    left: `${Math.min(100, Math.max(0, averageMatrixX))}%`,
                    bottom: `${Math.min(100, Math.max(0, averageMatrixY))}%`,
                  }}
                  title={`Moyenne: ${formatPercent(averageDuplicateRate)} doublons / ${formatPercent(averageBigPullRate)} gros pull`}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 text-cyan-200">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
                  Joueur ({formatPercent(playerDuplicateRate)} doublons /{" "}
                  {formatPercent(playerBigPullRate)} gros pull)
                </span>
                <span className="inline-flex items-center gap-1 text-amber-200">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                  Moyenne ({formatPercent(averageDuplicateRate)} doublons /{" "}
                  {formatPercent(averageBigPullRate)} gros pull)
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-cyan-300/30 bg-cyan-400/10 p-3 text-xs text-cyan-100">
              <p className="inline-flex items-center gap-1 font-bold uppercase tracking-[0.1em]">
                <Sparkles className="h-3.5 w-3.5" />
                Lecture chance
              </p>
              <p className="mt-1 text-cyan-50/90">
                Un profil est plus chanceux quand son taux de gros pulls est
                au-dessus de la moyenne, avec un taux de doublons plus bas.
              </p>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
            <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.11em] text-white">
              <BarChart3 className="h-4 w-4 text-cyan-300" />
              Distribution boosters
            </h2>

            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="relative h-64 overflow-hidden rounded-lg border border-slate-800/80 bg-slate-900/70">
                <div className="absolute inset-0 grid grid-rows-4">
                  <div className="border-b border-slate-800/60" />
                  <div className="border-b border-slate-800/60" />
                  <div className="border-b border-slate-800/60" />
                  <div />
                </div>

                <div className="absolute inset-x-2 bottom-2 top-2 grid grid-cols-4 gap-2">
                  {boosterTypeShares.map((entry) => {
                    const relativeHeight =
                      maxBoosterShareValue > 0
                        ? (entry.value / maxBoosterShareValue) * 100
                        : 0;
                    const barHeight =
                      entry.value === 0 ? 0 : Math.max(2, relativeHeight);

                    return (
                      <div
                        key={entry.label}
                        className="flex h-full items-end justify-center"
                      >
                        <div
                          className={`w-1/2 rounded-md ${entry.color} shadow-[0_0_14px_rgba(15,23,42,0.35)]`}
                          style={{ height: `${barHeight}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                {boosterTypeShares.map((entry) => {
                  const pct =
                    totalBoosterOpenings > 0
                      ? (entry.value / totalBoosterOpenings) * 100
                      : 0;

                  return (
                    <div key={`${entry.label}-legend`}>
                      <div className="text-[10px] font-bold uppercase text-slate-300">
                        {entry.label}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {intFormatter.format(entry.value)} ·{" "}
                        {formatPercent2(pct)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-slate-700/70 bg-slate-950/55 p-2 text-slate-300">
                <p className="text-slate-500">PC depense</p>
                <p className="mt-0.5 font-black text-amber-300">
                  {intFormatter.format(overview.totalPcSpent)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-700/70 bg-slate-950/55 p-2 text-slate-300">
                <p className="text-slate-500">Nombre d'openings</p>
                <p className="mt-0.5 font-black text-fuchsia-300">
                  {intFormatter.format(overview.totalOpenings)}
                </p>
              </div>
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
                Valeur moyenne recuperee par ouverture:
                <span className="ml-2 font-black text-cyan-200">
                  {intFormatter.format(Math.round(overview.avgPcGained))} PC
                </span>
              </p>
              <p>
                Meilleure carte obtenue:
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
              </p>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
            <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.11em] text-white">
              <ScanSearch className="h-4 w-4 text-fuchsia-300" />
              Top drop cards
            </h2>

            {(overview.topDropCards ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">
                Aucune data de drops.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {(overview.topDropCards ?? []).map((card) => (
                  <div
                    key={card.cardId}
                    className="flex items-center gap-3 rounded-xl border border-slate-700/70 bg-slate-950/55 p-2"
                  >
                    <div className="h-12 w-9 shrink-0 overflow-hidden rounded bg-black">
                      {card.cardImageUrl ? (
                        <img
                          src={card.cardImageUrl}
                          alt={card.cardName}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-[10px] font-black uppercase tracking-wider ${rarityTextColor(card.cardRarity)}`}
                      >
                        {rarityLabel(card.cardRarity)}
                      </p>
                      <p className="truncate text-sm font-semibold text-white">
                        {card.cardName}
                      </p>
                    </div>
                    <p className="text-xs font-black text-fuchsia-300">
                      x{intFormatter.format(card.dropsCount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
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
                      <span
                        className="text-[11px] text-slate-400"
                        title={formatFullDate(opening.openedAt)}
                      >
                        {formatRelativeTime(opening.openedAt)}
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
                      <span
                        className="text-[11px] text-slate-400"
                        title={formatFullDate(achievement.unlockedAt)}
                      >
                        {formatRelativeTime(achievement.unlockedAt)}
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
