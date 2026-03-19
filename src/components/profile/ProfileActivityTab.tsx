import { Clock3, Sparkles } from "lucide-react";
import type {
  PublicProfileRecentAchievement,
  PublicProfileRecentOpening,
} from "../../query/profile";
import {
  rarityBorderColor,
  rarityLabel,
  rarityTextColor,
} from "../../utils/rarity";

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

function getOpeningTypeTone(openingType: string): string {
  switch (openingType) {
    case "SHOP":
      return "text-cyan-200";
    case "DAILY":
      return "text-emerald-200";
    case "STREAK":
      return "text-fuchsia-200";
    case "ACHIEVEMENT":
      return "text-amber-200";
    default:
      return "text-slate-300";
  }
}

function getBoosterTypeTone(boosterType: string | null): string {
  switch (boosterType) {
    case "NORMAL":
      return "text-cyan-200";
    case "LUCK":
      return "text-emerald-200";
    case "PREMIUM":
      return "text-fuchsia-200";
    case "GODPACK":
      return "text-rose-200";
    default:
      return "text-slate-300";
  }
}

function getAchievementCategoryTone(
  category: PublicProfileRecentAchievement["category"],
): string {
  const normalized = category
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const categoryColors: Record<string, string> = {
    collection: "text-cyan-200",
    rarete: "text-fuchsia-200",
    booster: "text-amber-200",
    chance: "text-violet-200",
    economy: "text-emerald-200",
    activite: "text-orange-200",
    serie: "text-sky-200",
    esport: "text-rose-200",
  };

  return categoryColors[normalized] ?? "text-slate-300";
}

export function ProfileActivityTab({
  intFormatter,
  recentOpenings,
  recentOpeningsLoading,
  recentOpeningsError,
  recentAchievements,
  recentAchievementsLoading,
  recentAchievementsError,
  onOpenOpening,
}: {
  intFormatter: Intl.NumberFormat;
  recentOpenings: PublicProfileRecentOpening[];
  recentOpeningsLoading: boolean;
  recentOpeningsError: string | null;
  recentAchievements: PublicProfileRecentAchievement[];
  recentAchievementsLoading: boolean;
  recentAchievementsError: string | null;
  onOpenOpening: (openingId: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
        <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.11em] text-white">
          <Clock3 className="h-4 w-4 text-cyan-300" />
          Dernieres ouvertures
        </h2>

        {recentOpeningsLoading ? (
          <p className="mt-3 text-sm text-slate-400">
            Chargement des ouvertures...
          </p>
        ) : recentOpeningsError ? (
          <p className="mt-3 text-sm text-rose-300">{recentOpeningsError}</p>
        ) : recentOpenings.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">
            Aucune ouverture recente.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {recentOpenings.map((opening) => (
              <div
                key={opening.openingId}
                className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900/60 p-3 transition hover:border-cyan-300/40"
                onClick={() => {
                  onOpenOpening(opening.openingId);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpenOpening(opening.openingId);
                  }
                }}
                role="button"
                tabIndex={0}
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

                <div className="mt-2 flex flex-wrap items-center text-[10px] font-black uppercase tracking-[0.1em]">
                  <span className={getOpeningTypeTone(opening.openingType)}>
                    {opening.openingType}
                  </span>
                  {opening.boosterType ? (
                    <>
                      <span className="mx-1 text-slate-500">·</span>
                      <span className={getBoosterTypeTone(opening.boosterType)}>
                        {opening.boosterType}
                      </span>
                    </>
                  ) : null}
                  <span className="mx-1 text-slate-500">·</span>
                  <span className="text-amber-200">
                    +{intFormatter.format(opening.pcGained)} PC
                  </span>
                  <span className="mx-1 text-slate-500">·</span>
                  <span className="text-slate-300">
                    {intFormatter.format(opening.duplicateCards)} doublon(s)
                  </span>
                </div>

                {opening.bestCardName ? (
                  <div
                    className={`mt-2 flex items-center gap-3 rounded-lg border bg-slate-950/60 p-2 ${rarityBorderColor(
                      opening.bestCardRarity,
                    )}`}
                  >
                    <div className="h-11 w-8 shrink-0 overflow-hidden rounded bg-black">
                      {opening.bestCardImageUrl ? (
                        <img
                          src={opening.bestCardImageUrl}
                          alt={opening.bestCardName}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      {opening.bestCardRarity ? (
                        <p
                          className={`text-[9px] font-black uppercase tracking-wider ${rarityTextColor(
                            opening.bestCardRarity,
                          )}`}
                        >
                          {rarityLabel(opening.bestCardRarity)}
                        </p>
                      ) : null}
                      <p className="truncate text-xs font-bold text-white">
                        {opening.bestCardName}
                      </p>
                    </div>
                  </div>
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

        {recentAchievementsLoading ? (
          <p className="mt-3 text-sm text-slate-400">
            Chargement des achievements...
          </p>
        ) : recentAchievementsError ? (
          <p className="mt-3 text-sm text-rose-300">
            {recentAchievementsError}
          </p>
        ) : recentAchievements.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">
            Aucun achievement recent.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {recentAchievements.map((achievement) => (
              <div
                key={`${achievement.code}-${achievement.unlockedAt}`}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"
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

                <div className="mt-2 flex flex-wrap items-center text-[10px] font-black uppercase tracking-[0.1em]">
                  <span
                    className={getAchievementCategoryTone(achievement.category)}
                  >
                    {achievement.category}
                  </span>

                  <span className="mx-1 text-slate-500">·</span>
                  <span className="text-cyan-200">
                    {intFormatter.format(achievement.leaderboardPoints)} AP
                  </span>

                  {achievement.rewardPc > 0 ? (
                    <>
                      <span className="mx-1 text-slate-500">·</span>
                      <span className="text-amber-200">
                        {intFormatter.format(achievement.rewardPc)} PC
                      </span>
                    </>
                  ) : null}

                  {achievement.rewardBoosterType ? (
                    <>
                      <span className="mx-1 text-slate-500">·</span>
                      <span
                        className={getBoosterTypeTone(
                          achievement.rewardBoosterType,
                        )}
                      >
                        {achievement.rewardBoosterType} Booster
                      </span>
                    </>
                  ) : null}

                  {achievement.rewardTitle ? (
                    <>
                      <span className="mx-1 text-slate-500">·</span>
                      <span className="text-indigo-200">
                        Titre: {achievement.rewardTitle}
                      </span>
                    </>
                  ) : null}

                  {achievement.rewardPc === 0 &&
                  !achievement.rewardBoosterType &&
                  !achievement.rewardTitle ? (
                    <>
                      <span className="mx-1 text-slate-500">·</span>
                      <span className="text-slate-300">Aucune recompense</span>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
