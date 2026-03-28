import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { OpenBoosterResponse } from "./booster";

interface SeriesSplitOverviewRpcRow {
  split_id: string;
  split_code: string;
  split_name: string;
  series_id: string;
  series_code: string;
  series_name: string;
  starts_at: string;
  ends_at: string;
  points_per_series_opening: number | string;
  opening_points: number | string;
  mission_points: number | string;
  total_points: number | string;
  tiers: unknown;
  missions: unknown;
}

interface SeriesSplitTierRpc {
  tierLevel: number;
  pointsRequired: number;
  rewardPc: number;
  rewardBoosterType: "NORMAL" | "LUCK" | "PREMIUM" | "GODPACK" | null;
  rewardTitle: string | null;
  unlocked: boolean;
  claimed: boolean;
  canClaim: boolean;
}

interface SeriesSplitMissionRpc {
  code: string;
  name: string;
  description: string;
  metricKey: string;
  targetValue: number;
  currentValue: number;
  progressPct: number;
  rewardPoints: number;
  completed: boolean;
  claimed: boolean;
  canClaim: boolean;
}

export interface SeriesSplitTier {
  tierLevel: number;
  pointsRequired: number;
  rewardPc: number;
  rewardBoosterType: "NORMAL" | "LUCK" | "PREMIUM" | "GODPACK" | null;
  rewardTitle: string | null;
  unlocked: boolean;
  claimed: boolean;
  canClaim: boolean;
}

export interface SeriesSplitMission {
  code: string;
  name: string;
  description: string;
  metricKey: string;
  targetValue: number;
  currentValue: number;
  progressPct: number;
  rewardPoints: number;
  completed: boolean;
  claimed: boolean;
  canClaim: boolean;
}

export interface SeriesSplitOverview {
  splitId: string;
  splitCode: string;
  splitName: string;
  seriesId: string;
  seriesCode: string;
  seriesName: string;
  startsAt: string;
  endsAt: string;
  pointsPerSeriesOpening: number;
  openingPoints: number;
  missionPoints: number;
  totalPoints: number;
  tiers: SeriesSplitTier[];
  missions: SeriesSplitMission[];
}

export interface ClaimSeriesSplitMissionResponse {
  code: string;
  name: string;
  rewardPoints: number;
  totalPoints: number;
}

export interface ClaimSeriesSplitTierResponse {
  tierLevel: number;
  rewardPc: number;
  rewardBoosterType: "NORMAL" | "LUCK" | "PREMIUM" | "GODPACK" | null;
  rewardTitle: string | null;
  opening: OpenBoosterResponse | null;
}

export interface SeriesSplitNotification {
  notificationType: "MISSION" | "TIER";
  missionCode: string | null;
  tierLevel: number | null;
  title: string;
  rewardLabel: string;
  unlockedAt: string;
}

function parseNumber(input: number | string | null | undefined): number {
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : 0;
  }

  if (typeof input === "string") {
    const parsed = Number(input);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toTier(item: unknown): SeriesSplitTier | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const row = item as Partial<SeriesSplitTierRpc>;

  return {
    tierLevel: parseNumber(row.tierLevel),
    pointsRequired: parseNumber(row.pointsRequired),
    rewardPc: parseNumber(row.rewardPc),
    rewardBoosterType:
      row.rewardBoosterType === "NORMAL" ||
      row.rewardBoosterType === "LUCK" ||
      row.rewardBoosterType === "PREMIUM" ||
      row.rewardBoosterType === "GODPACK"
        ? row.rewardBoosterType
        : null,
    rewardTitle: typeof row.rewardTitle === "string" ? row.rewardTitle : null,
    unlocked: Boolean(row.unlocked),
    claimed: Boolean(row.claimed),
    canClaim: Boolean(row.canClaim),
  };
}

function toMission(item: unknown): SeriesSplitMission | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const row = item as Partial<SeriesSplitMissionRpc>;

  return {
    code: typeof row.code === "string" ? row.code : "",
    name: typeof row.name === "string" ? row.name : "Mission",
    description: typeof row.description === "string" ? row.description : "",
    metricKey: typeof row.metricKey === "string" ? row.metricKey : "",
    targetValue: parseNumber(row.targetValue),
    currentValue: parseNumber(row.currentValue),
    progressPct: Math.max(0, Math.min(100, parseNumber(row.progressPct))),
    rewardPoints: parseNumber(row.rewardPoints),
    completed: Boolean(row.completed),
    claimed: Boolean(row.claimed),
    canClaim: Boolean(row.canClaim),
  };
}

function mapOverviewRow(row: SeriesSplitOverviewRpcRow): SeriesSplitOverview {
  const tiersRaw = Array.isArray(row.tiers) ? row.tiers : [];
  const missionsRaw = Array.isArray(row.missions) ? row.missions : [];

  return {
    splitId: row.split_id,
    splitCode: row.split_code,
    splitName: row.split_name,
    seriesId: row.series_id,
    seriesCode: row.series_code,
    seriesName: row.series_name,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    pointsPerSeriesOpening: parseNumber(row.points_per_series_opening),
    openingPoints: parseNumber(row.opening_points),
    missionPoints: parseNumber(row.mission_points),
    totalPoints: parseNumber(row.total_points),
    tiers: tiersRaw
      .map((item) => toTier(item))
      .filter((item): item is SeriesSplitTier => Boolean(item)),
    missions: missionsRaw
      .map((item) => toMission(item))
      .filter((item): item is SeriesSplitMission => Boolean(item)),
  };
}

async function fetchSeriesSplitOverview(userId: string) {
  const { data, error } = await supabase.rpc("get_series_split_overview", {
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }

  const row = ((data ?? []) as SeriesSplitOverviewRpcRow[])[0];
  return row ? mapOverviewRow(row) : null;
}

async function fetchSeriesSplitUnseenCount(userId: string) {
  const { data, error } = await supabase.rpc("get_series_split_unseen_count", {
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }

  return Number(data ?? 0);
}

async function pullSeriesSplitNotifications(userId: string) {
  const { data, error } = await supabase.rpc(
    "pull_series_split_notifications",
    {
      p_user_id: userId,
      p_limit: 6,
    },
  );

  if (error) {
    throw error;
  }

  const rows = (Array.isArray(data) ? data : []) as Record<string, unknown>[];

  return rows
    .filter(
      (row) =>
        (row.notification_type === "MISSION" ||
          row.notification_type === "TIER") &&
        typeof row.title === "string" &&
        typeof row.unlocked_at === "string",
    )
    .map((row) => ({
      notificationType: row.notification_type as "MISSION" | "TIER",
      missionCode:
        typeof row.mission_code === "string" ? row.mission_code : null,
      tierLevel:
        typeof row.tier_level === "number"
          ? row.tier_level
          : typeof row.tier_level === "string"
            ? Number(row.tier_level)
            : null,
      title: row.title as string,
      rewardLabel: String(row.reward_label ?? "Récompense split"),
      unlockedAt: row.unlocked_at as string,
    })) as SeriesSplitNotification[];
}

export async function claimSeriesSplitMissionRpc(
  userId: string,
  missionCode: string,
) {
  const { data, error } = await supabase.rpc("claim_series_split_mission", {
    p_mission_code: missionCode,
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }

  return data as ClaimSeriesSplitMissionResponse;
}

export async function claimSeriesSplitTierRpc(
  userId: string,
  tierLevel: number,
) {
  const { data, error } = await supabase.rpc("claim_series_split_tier", {
    p_tier_level: tierLevel,
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }

  return data as ClaimSeriesSplitTierResponse;
}

export async function markSeriesSplitSeenRpc(userId: string) {
  const { data, error } = await supabase.rpc("mark_series_split_seen", {
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }

  return Number(data ?? 0);
}

export const seriesSplitQueryKey = (userId?: string) =>
  ["series-split", userId] as const;

export function useSeriesSplitQuery(userId?: string) {
  return useQuery({
    queryKey: seriesSplitQueryKey(userId),
    enabled: Boolean(userId),
    staleTime: 1000 * 20,
    queryFn: () => fetchSeriesSplitOverview(userId!),
  });
}

export function useSeriesSplitUnseenCountQuery(userId?: string) {
  return useQuery({
    queryKey: ["series-split-unseen-count", userId],
    enabled: Boolean(userId),
    queryFn: () => fetchSeriesSplitUnseenCount(userId!),
    refetchInterval: 15_000,
  });
}

export function useSeriesSplitNotificationsQuery(userId?: string) {
  return useQuery({
    queryKey: ["series-split-notifications", userId],
    enabled: Boolean(userId),
    queryFn: () => pullSeriesSplitNotifications(userId!),
    refetchInterval: 12_000,
  });
}
