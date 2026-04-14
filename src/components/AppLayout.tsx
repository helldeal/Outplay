import { useLegendexSeriesQuery } from "../query/legendex";
import { Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";
import { useUpdateUserTargetSeriesMutation } from "../query/legendex";
import { resolveRewardTone } from "./rewards/reward-theme";
import {
  AchievementToasts,
  type AchievementToastItem,
} from "./layout/AchievementToasts";
import {
  SeriesSplitToasts,
  type SeriesSplitToastItem,
} from "./layout/SeriesSplitToasts";
import { AppFooter } from "./layout/AppFooter";
import { AppHeader } from "./layout/AppHeader";
import { StreakModal } from "./layout/StreakModal";
import {
  useAchievementNotificationsQuery,
  useAchievementUnseenCountQuery,
} from "../query/achievements";
import {
  claimLoginStreakRewardRpc,
  computeDuplicateIndices,
  fetchCardsByIds,
  getOwnedCardIds,
  openDailyBoosterRpc,
  useDailyBoosterTargetQuery,
  useHasOpenedDailyTodayQuery,
  useLoginStreakStatusQuery,
} from "../query/booster";
import {
  useSeriesSplitNotificationsQuery,
  useSeriesSplitQuery,
  useSeriesSplitUnseenCountQuery,
} from "../query/series-split";
import { useEffect, useRef, useState } from "react";

function formatCountdown(millisecondsLeft: number) {
  const totalSeconds = Math.max(0, Math.floor(millisecondsLeft / 1000));
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

function formatSplitCountdown(millisecondsLeft: number) {
  const totalMinutes = Math.max(0, Math.floor(millisecondsLeft / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}j`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatStreakRewardLabel(params: {
  rewardType: "PC" | "BOOSTER";
  rewardPc: number;
  rewardBoosterType: "NORMAL" | "LUCK" | "PREMIUM" | null;
}): string {
  if (params.rewardType === "PC") {
    return `${params.rewardPc} PC`;
  }

  switch (params.rewardBoosterType) {
    case "LUCK":
      return "Luck Booster";
    case "PREMIUM":
      return "Premium Booster";
    case "NORMAL":
    default:
      return "Normal Booster";
  }
}

export function AppLayout() {
  const { user, profile, logout, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const seriesQuery = useLegendexSeriesQuery();
  const updateTargetSeriesMutation = useUpdateUserTargetSeriesMutation(
    user?.id,
  );
  const navigate = useNavigate();
  const [isOpeningDaily, setIsOpeningDaily] = useState(false);
  const [isClaimingStreak, setIsClaimingStreak] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
  const [targetSeriesDraftId, setTargetSeriesDraftId] = useState("");
  const [referralCodeDraft, setReferralCodeDraft] = useState("");
  const [targetSeriesFeedback, setTargetSeriesFeedback] = useState("");
  const [referralFeedback, setReferralFeedback] = useState("");
  const [dailyCountdown, setDailyCountdown] = useState("00:00:00");
  const [hasTriggeredResetRefresh, setHasTriggeredResetRefresh] =
    useState(false);
  const [achievementToasts, setAchievementToasts] = useState<
    AchievementToastItem[]
  >([]);
  const [seriesSplitToasts, setSeriesSplitToasts] = useState<
    SeriesSplitToastItem[]
  >([]);
  const [seriesSplitCountdown, setSeriesSplitCountdown] =
    useState<string>("00h 00m");
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const seenSplitNotificationIdsRef = useRef<Set<string>>(new Set());
  const dailyTargetQuery = useDailyBoosterTargetQuery();
  const openedTodayQuery = useHasOpenedDailyTodayQuery(user?.id);
  const streakStatus = useLoginStreakStatusQuery(user?.id).data;
  const unseenAchievementsQuery = useAchievementUnseenCountQuery(user?.id);
  const achievementNotificationsQuery = useAchievementNotificationsQuery(
    user?.id,
  );
  const seriesSplitQuery = useSeriesSplitQuery(user?.id);
  const seriesSplitUnseenQuery = useSeriesSplitUnseenCountQuery(user?.id);
  const seriesSplitNotificationsQuery = useSeriesSplitNotificationsQuery(
    user?.id,
  );

  useEffect(() => {
    setTargetSeriesDraftId(profile?.target_series_id ?? "");
  }, [profile?.target_series_id]);

  const rawUsername =
    profile?.username ??
    (user?.user_metadata?.preferred_username as string | undefined) ??
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Joueur";

  const username = rawUsername.split("#")[0]?.trim() || "Joueur";

  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ??
    (user?.user_metadata?.picture as string | undefined) ??
    (user?.user_metadata?.avatar as string | undefined) ??
    null;
  const unseenAchievementCount = Math.max(0, unseenAchievementsQuery.data ?? 0);
  const unseenSeriesSplitCount = Math.max(0, seriesSplitUnseenQuery.data ?? 0);

  useEffect(() => {
    const notifications = achievementNotificationsQuery.data ?? [];
    if (notifications.length === 0) {
      return;
    }

    for (const notification of notifications) {
      const notificationId = `${notification.code}:${notification.unlocked_at}`;
      if (seenNotificationIdsRef.current.has(notificationId)) {
        continue;
      }

      seenNotificationIdsRef.current.add(notificationId);

      setAchievementToasts((prev) =>
        [...prev, { ...notification, id: notificationId }].slice(-4),
      );

      window.setTimeout(() => {
        setAchievementToasts((prev) =>
          prev.filter((toast) => toast.id !== notificationId),
        );
      }, 5200);
    }
  }, [achievementNotificationsQuery.data]);

  useEffect(() => {
    const notifications = seriesSplitNotificationsQuery.data ?? [];
    if (notifications.length === 0) {
      return;
    }

    for (const notification of notifications) {
      const notificationId = `${notification.notificationType}:${notification.missionCode ?? notification.tierLevel ?? "none"}:${notification.unlockedAt}`;
      if (seenSplitNotificationIdsRef.current.has(notificationId)) {
        continue;
      }

      seenSplitNotificationIdsRef.current.add(notificationId);

      setSeriesSplitToasts((prev) =>
        [...prev, { ...notification, id: notificationId }].slice(-4),
      );

      window.setTimeout(() => {
        setSeriesSplitToasts((prev) =>
          prev.filter((toast) => toast.id !== notificationId),
        );
      }, 5200);
    }
  }, [seriesSplitNotificationsQuery.data]);

  useEffect(() => {
    const overview = seriesSplitQuery.data;
    if (!overview?.endsAt) {
      setSeriesSplitCountdown("00h 00m");
      return;
    }

    const update = () => {
      const millisecondsLeft =
        new Date(overview.endsAt).getTime() - new Date().getTime();
      if (millisecondsLeft <= 0) {
        setSeriesSplitCountdown("Terminé");
        return;
      }

      setSeriesSplitCountdown(formatSplitCountdown(millisecondsLeft));
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [seriesSplitQuery.data]);

  const shouldDisplayResetCountdown =
    Boolean(openedTodayQuery.data) ||
    (streakStatus ? !streakStatus.can_claim_today : false);

  useEffect(() => {
    if (!shouldDisplayResetCountdown) {
      setDailyCountdown("00:00:00");
      setHasTriggeredResetRefresh(false);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const nextResetUtc = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
        0,
      );

      setDailyCountdown(formatCountdown(nextResetUtc - now.getTime()));
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [shouldDisplayResetCountdown]);

  useEffect(() => {
    if (!isProfileMenuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [isProfileMenuOpen]);

  useEffect(() => {
    if (!user?.id || !shouldDisplayResetCountdown) {
      return;
    }

    if (dailyCountdown !== "00:00:00" || hasTriggeredResetRefresh) {
      return;
    }

    setHasTriggeredResetRefresh(true);
    void Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["daily-booster-opened-today", user.id],
      }),
      queryClient.invalidateQueries({
        queryKey: ["login-streak-status", user.id],
      }),
    ]);
  }, [
    dailyCountdown,
    hasTriggeredResetRefresh,
    shouldDisplayResetCountdown,
    queryClient,
    user?.id,
  ]);

  const canOpenDaily =
    Boolean(user) &&
    Boolean(dailyTargetQuery.data?.series.code) &&
    !openedTodayQuery.data &&
    !isOpeningDaily;

  const canClaimStreak =
    Boolean(user) &&
    Boolean(streakStatus?.can_claim_today) &&
    !isClaimingStreak;

  const streakRewardLabel = streakStatus
    ? formatStreakRewardLabel({
        rewardType: streakStatus.next_reward_type,
        rewardPc: streakStatus.next_reward_pc,
        rewardBoosterType: streakStatus.next_reward_booster_type,
      })
    : null;
  const targetSeriesCode =
    (seriesQuery.data ?? []).find(
      (series) => series.id === profile?.target_series_id,
    )?.code ?? dailyTargetQuery.data?.series.code;
  const referredByAlreadyUsed = Boolean(profile?.referred_by_user_id);

  const saveTargetSeries = async () => {
    if (!user?.id || !targetSeriesDraftId) {
      return;
    }

    if (targetSeriesDraftId === profile?.target_series_id) {
      setTargetSeriesFeedback("=");
      return;
    }

    try {
      await updateTargetSeriesMutation.mutateAsync(targetSeriesDraftId);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["user-target-series", user.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["login-streak-status", user.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["achievements-progress", user.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["achievements-unseen-count", user.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["achievements-notifications", user.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["series-split", user.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["series-split-unseen-count", user.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["series-split-notifications", user.id],
        }),
        refreshProfile(),
      ]);
      setTargetSeriesFeedback("✓");
    } catch {
      setTargetSeriesFeedback("!");
    }
  };

  const applyReferralCode = async () => {
    if (!user || referredByAlreadyUsed) {
      return;
    }

    const normalizedReferralCode = referralCodeDraft.trim().toUpperCase();
    if (!normalizedReferralCode) {
      return;
    }

    const { error } = await supabase.rpc("claim_referral_code", {
      p_referral_code: normalizedReferralCode,
      p_user_id: user.id,
    });

    if (error) {
      setReferralFeedback("!");
      return;
    }

    setReferralCodeDraft("");
    setReferralFeedback("✓");
    await refreshProfile();
    await queryClient.invalidateQueries({
      queryKey: ["leaderboard"],
      refetchType: "active",
    });
  };

  const profileMenuContent = (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center gap-1.5">
        <span className="w-10 shrink-0 text-slate-400">Série</span>
        <select
          value={targetSeriesDraftId}
          onChange={(event) => {
            setTargetSeriesDraftId(event.target.value);
            setTargetSeriesFeedback("");
          }}
          className="h-8 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 outline-none transition focus:border-cyan-400"
        >
          {(seriesQuery.data ?? []).map((series) => (
            <option key={series.id} value={series.id}>
              {series.code}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            void saveTargetSeries();
          }}
          disabled={
            updateTargetSeriesMutation.isPending ||
            !targetSeriesDraftId ||
            targetSeriesDraftId === profile?.target_series_id
          }
          className="h-8 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-2 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          OK
        </button>
        <span className="w-3 text-center text-slate-400">
          {targetSeriesFeedback}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="w-10 shrink-0 text-slate-400">Code</span>
        <input
          value={referralCodeDraft}
          onChange={(event) => {
            setReferralCodeDraft(event.target.value);
            setReferralFeedback("");
          }}
          disabled={referredByAlreadyUsed}
          placeholder={referredByAlreadyUsed ? "Utilisé" : "Parrainage"}
          className="h-8 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => {
            void applyReferralCode();
          }}
          disabled={referredByAlreadyUsed || !referralCodeDraft.trim()}
          className="h-8 rounded-lg border border-amber-400/40 bg-amber-400/10 px-2 text-[11px] font-semibold text-amber-100 transition hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          OK
        </button>
        <span
          className={`w-8 text-center text-[10px] ${
            referredByAlreadyUsed ? "text-amber-200" : "text-slate-400"
          }`}
        >
          {referredByAlreadyUsed ? "pris" : referralFeedback}
        </span>
      </div>
    </div>
  );

  const nextStreakTone = resolveRewardTone({
    rewardPc:
      streakStatus?.next_reward_type === "PC" ? streakStatus.next_reward_pc : 0,
    rewardBoosterType:
      streakStatus?.next_reward_type === "BOOSTER"
        ? streakStatus.next_reward_booster_type
        : null,
  });

  const openDailyFromHeader = async () => {
    if (!user || !dailyTargetQuery.data?.series.code) {
      return;
    }

    setIsOpeningDaily(true);
    try {
      const ownedBefore = await getOwnedCardIds(user.id);
      const result = await openDailyBoosterRpc(
        dailyTargetQuery.data.series.code,
        user.id,
        profile?.target_series_id ?? undefined,
      );
      const cardIds = result.cards ?? [];
      const openedCards = await fetchCardsByIds(cardIds);
      const duplicateCardIndices = computeDuplicateIndices(
        cardIds,
        ownedBefore,
      );

      // Use target series if available, otherwise use default daily series
      const targetSeries =
        (seriesQuery.data ?? []).find(
          (series) => series.id === result.seriesId,
        ) ??
        (seriesQuery.data ?? []).find(
          (series) => series.code === dailyTargetQuery.data?.series.code,
        ) ??
        dailyTargetQuery.data.series;

      navigate("/booster-opening", {
        state: {
          openedCards,
          duplicateCardIndices,
          pcGained: result.pcGained ?? 0,
          chargedPc: result.chargedPc ?? 0,
          boosterName: "Daily Booster",
          seriesName: targetSeries.name,
          seriesSlug: targetSeries.slug,
          seriesCode: targetSeries.code,
        },
      });

      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["daily-booster-opened-today", user.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["collection", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
        queryClient.invalidateQueries({ queryKey: ["series-split", user.id] }),
        queryClient.invalidateQueries({
          queryKey: ["series-split-unseen-count", user.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["series-split-notifications", user.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["achievements-progress", user.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["achievements-unseen-count", user.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["achievements-notifications", user.id],
        }),
        refreshProfile(),
      ]).catch(() => undefined);
    } finally {
      setIsOpeningDaily(false);
    }
  };

  const claimStreakFromHeader = async () => {
    if (!user) {
      return;
    }

    setIsClaimingStreak(true);
    try {
      const ownedBefore = await getOwnedCardIds(user.id);
      const result = await claimLoginStreakRewardRpc(
        user.id,
        profile?.target_series_id ?? undefined,
      );

      const syncPostClaim = () =>
        Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["login-streak-status", user.id],
          }),
          queryClient.invalidateQueries({ queryKey: ["collection", user.id] }),
          queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
          queryClient.invalidateQueries({
            queryKey: ["series-split", user.id],
          }),
          queryClient.invalidateQueries({
            queryKey: ["series-split-unseen-count", user.id],
          }),
          queryClient.invalidateQueries({
            queryKey: ["series-split-notifications", user.id],
          }),
          queryClient.invalidateQueries({
            queryKey: ["achievements-progress", user.id],
          }),
          queryClient.invalidateQueries({
            queryKey: ["achievements-unseen-count", user.id],
          }),
          queryClient.invalidateQueries({
            queryKey: ["achievements-notifications", user.id],
          }),
          refreshProfile(),
        ]);

      setIsStreakModalOpen(false);

      if (result.rewardType !== "BOOSTER" || !result.opening) {
        await syncPostClaim();
        return;
      }

      const cardIds = result.opening.cards ?? [];
      const openedCards = await fetchCardsByIds(cardIds);
      const duplicateCardIndices = computeDuplicateIndices(
        cardIds,
        ownedBefore,
      );

      const boosterLabel =
        result.boosterType === "PREMIUM"
          ? "Premium Booster"
          : result.boosterType === "LUCK"
            ? "Luck Booster"
            : "Normal Booster";

      const targetSeriesId = result.opening.seriesId;
      const targetSeries = (seriesQuery.data ?? []).find(
        (series) => series.id === targetSeriesId,
      );

      navigate("/booster-opening", {
        state: {
          openedCards,
          duplicateCardIndices,
          pcGained: result.opening.pcGained ?? 0,
          chargedPc: result.opening.chargedPc ?? 0,
          boosterName: `Streak ${boosterLabel}`,
          seriesName: targetSeries?.name ?? dailyTargetQuery.data?.series.name,
          seriesSlug: targetSeries?.slug ?? dailyTargetQuery.data?.series.slug,
          seriesCode: targetSeries?.code ?? dailyTargetQuery.data?.series.code,
        },
      });

      void syncPostClaim().catch(() => undefined);
    } finally {
      setIsClaimingStreak(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_85%_0%,rgba(124,58,237,0.16),transparent_30%),linear-gradient(to_bottom,rgba(2,6,23,1),rgba(2,6,23,0.92))]" />

      <AppHeader
        isAuthenticated={Boolean(user)}
        unseenAchievementCount={unseenAchievementCount}
        unseenSeriesSplitCount={unseenSeriesSplitCount}
        onOpenDaily={() => {
          void openDailyFromHeader().catch(() => undefined);
        }}
        canOpenDaily={canOpenDaily}
        isOpeningDaily={isOpeningDaily}
        openedToday={Boolean(openedTodayQuery.data)}
        dailyCountdown={dailyCountdown}
        onOpenStreakModal={() => setIsStreakModalOpen(true)}
        canClaimStreak={canClaimStreak}
        isClaimingStreak={isClaimingStreak}
        streakTitle={
          streakStatus
            ? streakStatus.can_claim_today
              ? `Jour ${streakStatus.next_day}: ${streakRewardLabel ?? "Récompense"}`
              : `Prochaine récompense de streak dans ${dailyCountdown}`
            : "Récompense streak"
        }
        streakButtonLabel={
          isClaimingStreak
            ? "Réclamation..."
            : streakStatus?.can_claim_today
              ? `Streak J${streakStatus.next_day}`
              : `Streak ${dailyCountdown}`
        }
        streakActiveClass={nextStreakTone.headerActiveClass}
        streakInactiveClass={nextStreakTone.headerInactiveHoverClass}
        seriesSplitPath={seriesSplitQuery.data ? "/series-split" : null}
        seriesSplitLabel={
          seriesSplitQuery.data
            ? `Split ${seriesSplitQuery.data.seriesCode}`
            : null
        }
        seriesSplitCountdown={
          seriesSplitQuery.data ? seriesSplitCountdown : null
        }
        pcBalance={profile?.pc_balance ?? 0}
        profileMenuRef={profileMenuRef}
        isProfileMenuOpen={isProfileMenuOpen}
        onToggleProfileMenu={() => setIsProfileMenuOpen((open) => !open)}
        onCloseProfileMenu={() => setIsProfileMenuOpen(false)}
        avatarUrl={avatarUrl}
        username={username}
        userEmail={user?.email}
        profileMenuContent={profileMenuContent}
        onLogout={() => {
          setIsProfileMenuOpen(false);
          void logout();
        }}
        initials={getInitials(username)}
      />

      <AchievementToasts toasts={achievementToasts} />
      <SeriesSplitToasts toasts={seriesSplitToasts} />

      <StreakModal
        isOpen={isStreakModalOpen}
        onClose={() => setIsStreakModalOpen(false)}
        isClaiming={isClaimingStreak}
        canClaim={canClaimStreak}
        onClaim={() => {
          void claimStreakFromHeader().catch(() => undefined);
        }}
        countdown={dailyCountdown}
        streakStatus={streakStatus}
        targetSeriesCode={targetSeriesCode}
      />

      <main className="relative mx-auto mt-28 w-full max-w-7xl px-4 py-6 md:mt-20">
        <Outlet />
      </main>

      <AppFooter />
    </div>
  );
}
