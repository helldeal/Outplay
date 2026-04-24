import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BarChart3,
  Check,
  Copy,
  Crown,
  History,
  Medal,
  PencilLine,
  Save,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { PlayerAvatar } from "../components/leaderboard/PlayerAvatar";
import { PageLoading } from "../components/PageLoading";
import { ProfileActivityTab } from "../components/profile/ProfileActivityTab";
import { ProfileCollectionTab } from "../components/profile/ProfileCollectionTab";
import { ProfileStatsTab } from "../components/profile/ProfileStatsTab";
import { ColoredTitleSelect } from "../components/profile/ColoredTitleSelect";
import { ColoredSignatureCardSelect } from "../components/profile/ColoredSignatureCardSelect";
import { ScoreBreakdownTooltip } from "../components/score/ScoreBreakdownTooltip";
import { useLeaderboardQuery } from "../query/leaderboard";
import {
  useCurrentUserAvailableTitlesQuery,
  publicProfileOverviewQueryKey,
  updateCurrentUserProfileIdentity,
  usePublicProfileCollectionQuery,
  usePublicProfileOverviewQuery,
  usePublicProfileRadarStatsQuery,
  usePublicProfileRecentAchievementsQuery,
  usePublicProfileRecentOpeningsQuery,
} from "../query/profile";
import { getTitleColorClass } from "../utils/title-style";
import { rarityNameGradient } from "../utils/rarity";

const intFormatter = new Intl.NumberFormat("fr-FR");
export function ProfilePage() {
  const { userId: routeUserId } = useParams();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const targetUserId = routeUserId ?? user?.id;
  const isOwnProfile = Boolean(
    user?.id && targetUserId && user.id === targetUserId,
  );

  const [recentOpeningsLimit, setRecentOpeningsLimit] = useState(4);
  const [recentAchievementsLimit, setRecentAchievementsLimit] = useState(8);

  const overviewQuery = usePublicProfileOverviewQuery(targetUserId);
  const collectionQuery = usePublicProfileCollectionQuery(targetUserId);
  const recentOpeningsQuery = usePublicProfileRecentOpeningsQuery(
    targetUserId,
    recentOpeningsLimit,
  );
  const recentAchievementsQuery = usePublicProfileRecentAchievementsQuery(
    targetUserId,
    recentAchievementsLimit,
  );
  const availableTitlesQuery = useCurrentUserAvailableTitlesQuery(
    isOwnProfile ? user?.id : undefined,
  );
  const radarStatsQuery = usePublicProfileRadarStatsQuery(targetUserId);
  const leaderboardQuery = useLeaderboardQuery(Boolean(user));

  const [tab, setTab] = useState<"collection" | "stats" | "activity">(
    "collection",
  );
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [titleDraft, setTitleDraft] = useState<string>("");
  const [signatureCardIdDraft, setSignatureCardIdDraft] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isReferralCodeCopied, setIsReferralCodeCopied] = useState(false);

  useEffect(() => {
    if (!overviewQuery.data || !isOwnProfile) {
      return;
    }

    setDescriptionDraft(
      (prev) => prev || (overviewQuery.data.description ?? ""),
    );
    setTitleDraft((prev) => (prev ? prev : (overviewQuery.data.title ?? "")));
    setSignatureCardIdDraft(
      (prev) => prev || overviewQuery.data.signatureCardId || "",
    );
  }, [isOwnProfile, overviewQuery.data]);

  const availableTitles = useMemo(() => {
    if (!isOwnProfile) {
      return [] as string[];
    }

    return availableTitlesQuery.data ?? [];
  }, [availableTitlesQuery.data, isOwnProfile]);

  const safeRatio = (numerator: number, denominator: number) => {
    if (!Number.isFinite(numerator) || numerator <= 0) return 0;
    if (!Number.isFinite(denominator) || denominator <= 0) return 0;
    return numerator / denominator;
  };

  const overviewData = overviewQuery.data;
  const collectionData = collectionQuery.data ?? [];
  const leaderboardRow = overviewData
    ? (leaderboardQuery.data ?? []).find(
        (row) => row.userId === overviewData.userId,
      )
    : null;
  const playerTotalCardValueBase = collectionData.reduce(
    (sum, row) => sum + (row.card.pc_value ?? 0),
    0,
  );

  const radarStats = radarStatsQuery.data;

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

  const scoreCardPoints = leaderboardRow?.cardScore ?? overview.weightedScore;
  const scoreAchievementPoints = leaderboardRow?.achievementScore ?? 0;

  const signatureCardOptions = collection
    .slice()
    .sort((a, b) => b.card.pc_value - a.card.pc_value)
    .map((row) => ({
      value: row.card_id,
      label: `${row.card_id} · ${row.card.name}`,
      rarity: row.card.rarity,
    }));

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
        title: normalizedTitle,
        signatureCardId: signatureCardIdDraft || null,
        description: descriptionDraft || null,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: publicProfileOverviewQueryKey(overview.userId),
        }),
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
        refreshProfile(),
      ]);

      setSaveSuccess("Profil mis à jour.");
    } catch (error) {
      setSaveError((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyReferralCode = async () => {
    if (!profile?.referral_code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(profile.referral_code);
      setIsReferralCodeCopied(true);
      window.setTimeout(() => {
        setIsReferralCodeCopied(false);
      }, 1500);
    } catch {
      setIsReferralCodeCopied(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="relative rounded-3xl border border-slate-700/70 bg-slate-900/75 p-5 shadow-[0_20px_60px_rgba(2,6,23,0.55)] md:p-7">
        <div className="pointer-events-none absolute rounded-3xl inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(34,211,238,0.26),transparent_36%),radial-gradient(circle_at_95%_20%,rgba(251,191,36,0.18),transparent_34%),linear-gradient(120deg,rgba(56,189,248,0.08),transparent_45%,rgba(244,114,182,0.08))]" />

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
              <p className="mt-1 font-medium text-slate-300">
                {overview.title ? (
                  <>
                    <span className={getTitleColorClass(overview.title)}>
                      {overview.title}
                    </span>
                  </>
                ) : (
                  "Aucun titre équipé"
                )}
              </p>
              <p className="mt-1 max-w-xl text-sm text-slate-400">
                {overview.description?.trim()
                  ? overview.description
                  : "Aucune description"}
              </p>

              {isOwnProfile && profile?.referral_code ? (
                <div className="mt-2 flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-200">
                    Code de parrainage
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-amber-300/50 bg-amber-400/10 px-2 py-1 font-mono text-xs text-amber-100">
                      {profile.referral_code}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        void handleCopyReferralCode();
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-900/80 px-2 py-1 text-xs text-slate-200 transition hover:border-cyan-400 hover:text-cyan-100"
                    >
                      {isReferralCodeCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
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
                  : "Non classé"}
              </p>
            </div>
            <div className="relative rounded-xl border border-slate-700/80 bg-slate-950/55 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                Score
              </p>
              <ScoreBreakdownTooltip
                totalScore={overview.weightedScore}
                cardScore={scoreCardPoints}
                achievementScore={scoreAchievementPoints}
                className="inline-flex"
                tooltipPositionClassName="left-1/2 top-full -translate-x-1/2"
              >
                <p className="cursor-help text-lg font-black text-cyan-200">
                  {intFormatter.format(overview.weightedScore)}
                </p>
              </ScoreBreakdownTooltip>
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
                Porte-monnaie
              </p>
              <p className="text-lg font-black text-amber-300 ">
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
                      className={`text-lg truncate font-black uppercase tracking-tighter text-transparent bg-clip-text ${rarityNameGradient(
                        overview.signatureCardRarity,
                      )}`}
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
              Éditer le profil
            </h2>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="ml-1 text-xs font-semibold text-slate-300">
                Titre
              </span>
              <ColoredTitleSelect
                value={titleDraft}
                onChange={setTitleDraft}
                options={availableTitles}
                placeholder="Aucun titre"
              />
            </label>

            <label className="space-y-1">
              <span className="ml-1 text-xs font-semibold text-slate-300">
                Carte signature
              </span>
              <ColoredSignatureCardSelect
                value={signatureCardIdDraft}
                onChange={setSignatureCardIdDraft}
                options={signatureCardOptions}
                placeholder="Aucune carte signature"
              />
            </label>
            <label className="space-y-1 col-span-2">
              <span className="ml-1 text-xs font-semibold text-slate-300">
                Description
              </span>
              <textarea
                value={descriptionDraft}
                onChange={(event) => setDescriptionDraft(event.target.value)}
                maxLength={240}
                rows={3}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/60"
                placeholder="Ajoute une description de ton profil"
              />
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
            Activité
          </button>
        </div>
      </div>

      {tab === "collection" ? (
        <ProfileCollectionTab collection={collection} />
      ) : tab === "stats" ? (
        <ProfileStatsTab
          overview={overview}
          intFormatter={intFormatter}
          radarStats={
            radarStats ?? {
              player: {
                duplicateRate: Math.max(0, overview.duplicateRate),
                bigPullRate: Math.max(0, overview.bigPullRate),
                avgPcGained: Math.max(0, overview.avgPcGained),
                avgPcSpent:
                  overview.totalOpenings > 0
                    ? overview.totalPcSpent / overview.totalOpenings
                    : 0,
                valueScoreRatio: safeRatio(
                  scoreCardPoints,
                  playerTotalCardValueBase,
                ),
                avgBoosterOpeningsPerDay: 0,
                avgBoosterProfitability: safeRatio(
                  playerTotalCardValueBase,
                  overview.totalPcSpent,
                ),
              },
              average: {
                duplicateRate: Math.max(0, overview.globalAvgDuplicateRate),
                bigPullRate: Math.max(0, overview.globalAvgBigPullRate),
                avgPcGained: Math.max(0, overview.avgPcGained),
                avgPcSpent: Math.max(0, overview.globalAvgPcSpent),
                valueScoreRatio: safeRatio(
                  scoreCardPoints,
                  playerTotalCardValueBase,
                ),
                avgBoosterOpeningsPerDay: 0,
                avgBoosterProfitability: safeRatio(
                  playerTotalCardValueBase,
                  overview.totalPcSpent,
                ),
              },
              max: {
                duplicateRate: Math.max(
                  Math.max(0, overview.duplicateRate),
                  Math.max(0, overview.globalAvgDuplicateRate),
                  1,
                ),
                bigPullRate: Math.max(
                  Math.max(0, overview.bigPullRate),
                  Math.max(0, overview.globalAvgBigPullRate),
                  1,
                ),
                avgPcGained: Math.max(Math.max(0, overview.avgPcGained), 1),
                avgPcSpent: Math.max(Math.max(0, overview.globalAvgPcSpent), 1),
                valueScoreRatio: Math.max(
                  safeRatio(scoreCardPoints, playerTotalCardValueBase),
                  1,
                ),
                avgBoosterOpeningsPerDay: 1,
                avgBoosterProfitability: Math.max(
                  safeRatio(playerTotalCardValueBase, overview.totalPcSpent),
                  1,
                ),
              },
              min: {
                duplicateRate: Math.min(
                  Math.max(0, overview.duplicateRate),
                  Math.max(0, overview.globalAvgDuplicateRate),
                ),
                bigPullRate: Math.min(
                  Math.max(0, overview.bigPullRate),
                  Math.max(0, overview.globalAvgBigPullRate),
                ),
                avgPcGained: Math.max(0, overview.avgPcGained),
                avgPcSpent: Math.max(0, overview.globalAvgPcSpent),
                valueScoreRatio: safeRatio(
                  scoreCardPoints,
                  playerTotalCardValueBase,
                ),
                avgBoosterOpeningsPerDay: 0,
                avgBoosterProfitability: safeRatio(
                  playerTotalCardValueBase,
                  overview.totalPcSpent,
                ),
              },
            }
          }
        />
      ) : (
        <ProfileActivityTab
          intFormatter={intFormatter}
          recentOpenings={recentOpeningsQuery.data ?? []}
          recentOpeningsLoading={recentOpeningsQuery.isLoading}
          recentOpeningsError={
            recentOpeningsQuery.error
              ? (recentOpeningsQuery.error as Error).message
              : null
          }
          recentAchievements={recentAchievementsQuery.data ?? []}
          recentAchievementsLoading={recentAchievementsQuery.isLoading}
          recentAchievementsError={
            recentAchievementsQuery.error
              ? (recentAchievementsQuery.error as Error).message
              : null
          }
          canLoadMoreOpenings={
            (recentOpeningsQuery.data ?? []).length >= recentOpeningsLimit
          }
          canLoadMoreAchievements={
            (recentAchievementsQuery.data ?? []).length >=
            recentAchievementsLimit
          }
          onLoadMoreOpenings={() => {
            setRecentOpeningsLimit((current) => current + 4);
          }}
          onLoadMoreAchievements={() => {
            setRecentAchievementsLimit((current) => current + 8);
          }}
          onOpenOpening={(openingId) => {
            navigate(`/opening/${openingId}`);
          }}
        />
      )}
    </section>
  );
}
