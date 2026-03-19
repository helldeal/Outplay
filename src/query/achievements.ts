import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { OpenBoosterResponse } from "./booster";

export interface AchievementProgressRow {
  achievement_id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  metric_key: string;
  target_value: number;
  current_value: number;
  progress_pct: number;
  leaderboard_points: number;
  unlocked: boolean;
  unlocked_at: string | null;
  reward_label: string;
  reward_pc: number;
  reward_booster_type: "NORMAL" | "LUCK" | "PREMIUM" | "GODPACK" | null;
  reward_title: string | null;
  reward_claimed: boolean;
  can_claim_reward: boolean;
  seen: boolean;
}

export interface ClaimAchievementRewardResponse {
  code: string;
  name: string;
  rewardPc: number;
  rewardBoosterType: "NORMAL" | "LUCK" | "PREMIUM" | "GODPACK" | null;
  rewardTitle: string | null;
  opening: OpenBoosterResponse | null;
}

export interface AchievementNotification {
  code: string;
  name: string;
  category: string;
  unlocked_at: string;
  reward_label: string;
}

async function fetchAchievementsProgress(userId: string) {
  const { data, error } = await supabase.rpc("get_achievements_progress", {
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }

  const rows = (Array.isArray(data) ? data : []) as Record<string, unknown>[];

  return rows.map((row) => ({
    achievement_id: String(row.achievement_id),
    code: String(row.code),
    name: String(row.name),
    category: String(row.category),
    description: String(row.description),
    metric_key: String(row.metric_key ?? ""),
    target_value: Number(row.target_value ?? 0),
    current_value: Number(row.current_value ?? 0),
    progress_pct: Number(row.progress_pct ?? 0),
    leaderboard_points: Number(
      row.leaderboard_points ?? row.leaderboardPoints ?? 0,
    ),
    unlocked: Boolean(row.unlocked),
    unlocked_at: typeof row.unlocked_at === "string" ? row.unlocked_at : null,
    reward_label: String(row.reward_label ?? "Reward"),
    reward_pc: Number(row.reward_pc ?? 0),
    reward_booster_type:
      row.reward_booster_type === "NORMAL" ||
      row.reward_booster_type === "LUCK" ||
      row.reward_booster_type === "PREMIUM" ||
      row.reward_booster_type === "GODPACK"
        ? row.reward_booster_type
        : null,
    reward_title:
      typeof row.reward_title === "string" ? row.reward_title : null,
    reward_claimed: Boolean(row.reward_claimed),
    can_claim_reward: Boolean(row.can_claim_reward),
    seen: Boolean(row.seen),
  })) as AchievementProgressRow[];
}

async function fetchAchievementUnseenCount(userId: string) {
  const { data, error } = await supabase.rpc("get_achievement_unseen_count", {
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }

  return Number(data ?? 0);
}

async function pullAchievementNotifications(userId: string) {
  const { data, error } = await supabase.rpc("pull_achievement_notifications", {
    p_user_id: userId,
    p_limit: 6,
  });

  if (error) {
    throw error;
  }

  const rows = (Array.isArray(data) ? data : []) as Record<string, unknown>[];

  return rows
    .filter(
      (row) =>
        typeof row.code === "string" &&
        typeof row.name === "string" &&
        typeof row.category === "string" &&
        typeof row.unlocked_at === "string",
    )
    .map((row) => ({
      code: row.code as string,
      name: row.name as string,
      category: row.category as string,
      unlocked_at: row.unlocked_at as string,
      reward_label: String(row.reward_label ?? "Reward"),
    })) as AchievementNotification[];
}

export async function markAchievementsSeenRpc(userId: string) {
  const { data, error } = await supabase.rpc("mark_achievements_seen", {
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }

  return Number(data ?? 0);
}

export async function claimAchievementRewardRpc(
  userId: string,
  achievementCode: string,
  targetSeriesId?: string,
) {
  const { data, error } = await supabase.rpc("claim_achievement_reward", {
    p_user_id: userId,
    p_achievement_code: achievementCode,
    p_target_series_id: targetSeriesId ?? null,
  });

  if (error) {
    throw error;
  }

  return data as ClaimAchievementRewardResponse;
}

export function useAchievementsProgressQuery(userId?: string) {
  return useQuery({
    queryKey: ["achievements-progress", userId],
    enabled: Boolean(userId),
    queryFn: () => fetchAchievementsProgress(userId!),
  });
}

export function useAchievementUnseenCountQuery(userId?: string) {
  return useQuery({
    queryKey: ["achievements-unseen-count", userId],
    enabled: Boolean(userId),
    queryFn: () => fetchAchievementUnseenCount(userId!),
    refetchInterval: 15_000,
  });
}

export function useAchievementNotificationsQuery(userId?: string) {
  return useQuery({
    queryKey: ["achievements-notifications", userId],
    enabled: Boolean(userId),
    queryFn: () => pullAchievementNotifications(userId!),
    refetchInterval: 12_000,
  });
}
