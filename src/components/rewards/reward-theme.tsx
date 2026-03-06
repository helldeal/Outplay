import { Coins, Gift } from "lucide-react";
import type { ReactNode } from "react";

export type RewardBoosterType =
  | "NORMAL"
  | "LUCK"
  | "PREMIUM"
  | "GODPACK"
  | null;

export interface RewardTone {
  key: "PC" | "NORMAL" | "LUCK" | "PREMIUM" | "GODPACK" | "DEFAULT";
  unlockedCardClass: string;
  claimButtonClass: string;
  progressBarClass: string;
  rewardBadgeClass: string;
  rewardTextClass: string;
  headerActiveClass: string;
  headerInactiveHoverClass: string;
  streakCurrentClass: string;
  shopCardHoverClass: string;
  shopBuyButtonClass: string;
  shopTypeBadgeClass: string;
}

const tones: Record<RewardTone["key"], RewardTone> = {
  PC: {
    key: "PC",
    unlockedCardClass: "border-amber-300/45 bg-amber-500/10",
    claimButtonClass:
      "border-amber-300/70 bg-amber-300/20 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.28)] hover:bg-amber-300/30",
    progressBarClass: "bg-gradient-to-r from-amber-300 to-amber-500",
    rewardBadgeClass: "border-amber-300/45 bg-amber-300/15 text-amber-200",
    rewardTextClass: "text-amber-300",
    headerActiveClass:
      "border border-amber-300/70 bg-amber-400/15 shadow-[0_0_0_1px_rgba(251,191,36,0.35),0_0_24px_rgba(251,191,36,0.22)] hover:bg-amber-400/20",
    headerInactiveHoverClass: "hover:border-amber-400/50",
    streakCurrentClass: "border-amber-300/80 bg-amber-400/14",
    shopCardHoverClass:
      "hover:border-amber-300/40 hover:shadow-[0_16px_38px_rgba(251,191,36,0.2)]",
    shopBuyButtonClass:
      "bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950 shadow-[0_8px_22px_rgba(251,191,36,0.28)] hover:brightness-105",
    shopTypeBadgeClass: "border-amber-300/45 bg-amber-300/15 text-amber-100",
  },
  NORMAL: {
    key: "NORMAL",
    unlockedCardClass: "border-cyan-300/45 bg-cyan-500/10",
    claimButtonClass:
      "border-cyan-300/70 bg-cyan-300/20 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.24)] hover:bg-cyan-300/30",
    progressBarClass: "bg-gradient-to-r from-cyan-300 to-cyan-500",
    rewardBadgeClass: "border-cyan-300/45 bg-cyan-300/15 text-cyan-200",
    rewardTextClass: "text-cyan-300",
    headerActiveClass:
      "border border-cyan-300/70 bg-cyan-400/15 shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_0_24px_rgba(34,211,238,0.22)] hover:bg-cyan-400/20",
    headerInactiveHoverClass: "hover:border-cyan-400/50",
    streakCurrentClass: "border-cyan-300/80 bg-cyan-400/14",
    shopCardHoverClass:
      "hover:border-cyan-300/40 hover:shadow-[0_16px_38px_rgba(8,145,178,0.24)]",
    shopBuyButtonClass:
      "bg-gradient-to-r from-cyan-300 to-cyan-500 text-slate-950 shadow-[0_8px_22px_rgba(6,182,212,0.28)] hover:brightness-105",
    shopTypeBadgeClass: "border-cyan-300/45 bg-cyan-300/15 text-cyan-100",
  },
  LUCK: {
    key: "LUCK",
    unlockedCardClass: "border-emerald-300/45 bg-emerald-500/10",
    claimButtonClass:
      "border-emerald-300/70 bg-emerald-300/20 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.26)] hover:bg-emerald-300/30",
    progressBarClass: "bg-gradient-to-r from-emerald-300 to-emerald-500",
    rewardBadgeClass:
      "border-emerald-300/45 bg-emerald-300/15 text-emerald-200",
    rewardTextClass: "text-emerald-300",
    headerActiveClass:
      "border border-emerald-300/70 bg-emerald-400/15 shadow-[0_0_0_1px_rgba(16,185,129,0.35),0_0_24px_rgba(16,185,129,0.22)] hover:bg-emerald-400/20",
    headerInactiveHoverClass: "hover:border-emerald-400/50",
    streakCurrentClass: "border-emerald-300/80 bg-emerald-400/14",
    shopCardHoverClass:
      "hover:border-emerald-300/40 hover:shadow-[0_16px_38px_rgba(16,185,129,0.23)]",
    shopBuyButtonClass:
      "bg-gradient-to-r from-emerald-300 to-emerald-500 text-slate-950 shadow-[0_8px_22px_rgba(16,185,129,0.28)] hover:brightness-105",
    shopTypeBadgeClass:
      "border-emerald-300/45 bg-emerald-300/15 text-emerald-100",
  },
  PREMIUM: {
    key: "PREMIUM",
    unlockedCardClass: "border-fuchsia-300/45 bg-fuchsia-500/10",
    claimButtonClass:
      "border-fuchsia-300/70 bg-fuchsia-300/20 text-fuchsia-200 shadow-[0_0_20px_rgba(217,70,239,0.25)] hover:bg-fuchsia-300/30",
    progressBarClass: "bg-gradient-to-r from-fuchsia-300 to-fuchsia-500",
    rewardBadgeClass:
      "border-fuchsia-300/45 bg-fuchsia-300/15 text-fuchsia-200",
    rewardTextClass: "text-fuchsia-300",
    headerActiveClass:
      "border border-fuchsia-300/70 bg-fuchsia-400/15 shadow-[0_0_0_1px_rgba(217,70,239,0.35),0_0_24px_rgba(217,70,239,0.22)] hover:bg-fuchsia-400/20",
    headerInactiveHoverClass: "hover:border-fuchsia-400/50",
    streakCurrentClass: "border-fuchsia-300/80 bg-fuchsia-400/14",
    shopCardHoverClass:
      "hover:border-fuchsia-300/40 hover:shadow-[0_16px_38px_rgba(217,70,239,0.24)]",
    shopBuyButtonClass:
      "bg-gradient-to-r from-fuchsia-300 to-fuchsia-500 text-slate-950 shadow-[0_8px_22px_rgba(217,70,239,0.28)] hover:brightness-105",
    shopTypeBadgeClass:
      "border-fuchsia-300/45 bg-fuchsia-300/15 text-fuchsia-100",
  },
  GODPACK: {
    key: "GODPACK",
    unlockedCardClass: "border-rose-300/45 bg-rose-500/10",
    claimButtonClass:
      "border-rose-300/70 bg-rose-300/20 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.25)] hover:bg-rose-300/30",
    progressBarClass: "bg-gradient-to-r from-rose-300 to-rose-500",
    rewardBadgeClass: "border-rose-300/45 bg-rose-300/15 text-rose-200",
    rewardTextClass: "text-rose-300",
    headerActiveClass:
      "border border-rose-300/70 bg-rose-400/15 shadow-[0_0_0_1px_rgba(244,63,94,0.35),0_0_24px_rgba(244,63,94,0.22)] hover:bg-rose-400/20",
    headerInactiveHoverClass: "hover:border-rose-400/50",
    streakCurrentClass: "border-rose-300/80 bg-rose-400/14",
    shopCardHoverClass:
      "hover:border-rose-300/40 hover:shadow-[0_16px_38px_rgba(244,63,94,0.25)]",
    shopBuyButtonClass:
      "bg-gradient-to-r from-rose-300 to-rose-500 text-slate-950 shadow-[0_8px_22px_rgba(244,63,94,0.28)] hover:brightness-105",
    shopTypeBadgeClass: "border-rose-300/45 bg-rose-300/15 text-rose-100",
  },
  DEFAULT: {
    key: "DEFAULT",
    unlockedCardClass: "border-sky-300/45 bg-sky-500/10",
    claimButtonClass:
      "border-sky-300/70 bg-sky-300/20 text-sky-200 shadow-[0_0_20px_rgba(125,211,252,0.24)] hover:bg-sky-300/30",
    progressBarClass: "bg-gradient-to-r from-sky-300 to-sky-500",
    rewardBadgeClass: "border-sky-300/45 bg-sky-300/15 text-sky-200",
    rewardTextClass: "text-sky-300",
    headerActiveClass:
      "border border-sky-300/70 bg-sky-400/15 shadow-[0_0_0_1px_rgba(125,211,252,0.35),0_0_24px_rgba(125,211,252,0.22)] hover:bg-sky-400/20",
    headerInactiveHoverClass: "hover:border-sky-400/50",
    streakCurrentClass: "border-sky-300/80 bg-sky-400/14",
    shopCardHoverClass:
      "hover:border-sky-300/40 hover:shadow-[0_16px_38px_rgba(125,211,252,0.24)]",
    shopBuyButtonClass:
      "bg-gradient-to-r from-sky-300 to-sky-500 text-slate-950 shadow-[0_8px_22px_rgba(125,211,252,0.28)] hover:brightness-105",
    shopTypeBadgeClass: "border-sky-300/45 bg-sky-300/15 text-sky-100",
  },
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function resolveBoosterTone(
  boosterType: "NORMAL" | "LUCK" | "PREMIUM" | "GODPACK" | null | undefined,
): RewardTone {
  if (boosterType && tones[boosterType]) {
    return tones[boosterType];
  }

  return tones.DEFAULT;
}

export function resolveRewardTone(params: {
  rewardPc: number;
  rewardBoosterType: RewardBoosterType | undefined;
}): RewardTone {
  if (params.rewardPc > 0 && !params.rewardBoosterType) {
    return tones.PC;
  }

  return resolveBoosterTone(params.rewardBoosterType);
}

export function RewardTypeBadge(props: {
  rewardPc: number;
  rewardBoosterType: RewardBoosterType | undefined;
  label: ReactNode;
  className?: string;
}) {
  const tone = resolveRewardTone({
    rewardPc: props.rewardPc,
    rewardBoosterType: props.rewardBoosterType,
  });
  const Icon = props.rewardPc > 0 && !props.rewardBoosterType ? Coins : Gift;

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        tone.rewardBadgeClass,
        props.className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {props.label}
    </span>
  );
}

export function BoosterTypeBadge(props: {
  boosterType: "NORMAL" | "LUCK" | "PREMIUM" | "GODPACK";
  className?: string;
}) {
  const tone = resolveBoosterTone(props.boosterType);

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em]",
        tone.shopTypeBadgeClass,
        props.className,
      )}
    >
      {props.boosterType}
    </span>
  );
}
