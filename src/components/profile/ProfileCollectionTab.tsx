import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from "lucide-react";
import { CardTile } from "../CardTile";
import { rarityLabel } from "../../utils/rarity";
import type { UserCardRow } from "../../types";

const ALL = "__ALL__";
type CardRarity = UserCardRow["card"]["rarity"];
type FilterKey =
  | "series"
  | "rarity"
  | "prestige"
  | "game"
  | "team"
  | "role"
  | "nationality";

const RARITY_ORDER: CardRarity[] = [
  "LEGENDS",
  "WORLD_CLASS",
  "CHAMPION",
  "CHALLENGER",
  "ROOKIE",
];

function getSeriesName(row: UserCardRow): string {
  return row.card.series?.name ?? "Sans série";
}

function getTeamName(row: UserCardRow): string {
  return row.card.team?.name ?? "Sans équipe";
}

function getRoleName(row: UserCardRow): string {
  return row.card.role?.name ?? "Sans rôle";
}

function normalizeSelectValues(values: string[]): string[] {
  return values.filter(Boolean).sort((a, b) => a.localeCompare(b, "fr"));
}

function matchesFilters(
  row: UserCardRow,
  filters: {
    series: string;
    rarity: string;
    prestige: string;
    game: string;
    team: string;
    role: string;
    nationality: string;
  },
  exclude?: FilterKey,
): boolean {
  if (
    exclude !== "series" &&
    filters.series !== ALL &&
    getSeriesName(row) !== filters.series
  ) {
    return false;
  }

  if (
    exclude !== "rarity" &&
    filters.rarity !== ALL &&
    row.card.rarity !== filters.rarity
  ) {
    return false;
  }

  if (exclude !== "prestige" && filters.prestige !== ALL) {
    const stars = String(Math.max(0, Math.min(3, row.prestige_stars ?? 0)));
    if (stars !== filters.prestige) {
      return false;
    }
  }

  if (
    exclude !== "game" &&
    filters.game !== ALL &&
    row.card.game.name !== filters.game
  ) {
    return false;
  }

  if (
    exclude !== "team" &&
    filters.team !== ALL &&
    getTeamName(row) !== filters.team
  ) {
    return false;
  }

  if (
    exclude !== "role" &&
    filters.role !== ALL &&
    getRoleName(row) !== filters.role
  ) {
    return false;
  }

  if (
    exclude !== "nationality" &&
    filters.nationality !== ALL &&
    (row.card.nationality.code ?? "N/A") !== filters.nationality
  ) {
    return false;
  }

  return true;
}

interface FilterOption {
  value: string;
  label: string;
  imageUrl?: string;
}

function renderOptionLabel(option: FilterOption, withText = true) {
  return (
    <>
      {option.imageUrl ? (
        <img
          src={option.imageUrl}
          alt={option.label}
          className="h-4 w-4 rounded object-contain"
          loading="lazy"
        />
      ) : null}
      {withText ? <span>{option.label}</span> : null}
    </>
  );
}

export function ProfileCollectionTab({
  collection,
}: {
  collection: UserCardRow[];
}) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [seriesFilter, setSeriesFilter] = useState<string>(ALL);
  const [rarityFilter, setRarityFilter] = useState<string>(ALL);
  const [prestigeFilter, setPrestigeFilter] = useState<string>(ALL);
  const [gameFilter, setGameFilter] = useState<string>(ALL);
  const [teamFilter, setTeamFilter] = useState<string>(ALL);
  const [roleFilter, setRoleFilter] = useState<string>(ALL);
  const [nationalityFilter, setNationalityFilter] = useState<string>(ALL);

  const activeFilters = {
    series: seriesFilter,
    rarity: rarityFilter,
    prestige: prestigeFilter,
    game: gameFilter,
    team: teamFilter,
    role: roleFilter,
    nationality: nationalityFilter,
  };

  const filterOptions = useMemo(() => {
    const getRowsForFacet = (facet: FilterKey) =>
      collection.filter((row) => matchesFilters(row, activeFilters, facet));

    const seriesRows = getRowsForFacet("series");
    const series = normalizeSelectValues(
      Array.from(new Set(seriesRows.map((row) => getSeriesName(row)))),
    );

    const rarityRows = getRowsForFacet("rarity");
    const availableRarities = new Set(rarityRows.map((row) => row.card.rarity));
    const rarities = RARITY_ORDER.filter((rarity) =>
      availableRarities.has(rarity),
    );

    const prestigeRows = getRowsForFacet("prestige");
    const prestiges = Array.from(
      new Set(
        prestigeRows.map((row) =>
          String(Math.max(0, Math.min(3, row.prestige_stars ?? 0))),
        ),
      ),
    ).sort((a, b) => Number(a) - Number(b));

    const gameRows = getRowsForFacet("game");

    const games = Array.from(
      new Map(
        gameRows.map((row) => [
          row.card.game.name,
          {
            value: row.card.game.name,
            label: row.card.game.name,
            imageUrl: row.card.game.logoUrl,
          } satisfies FilterOption,
        ]),
      ).values(),
    ).sort((a, b) => a.label.localeCompare(b.label, "fr"));

    const teamRows = getRowsForFacet("team");

    const teams = Array.from(
      new Map(
        teamRows.map((row) => {
          const name = getTeamName(row);
          return [
            name,
            {
              value: name,
              label: name,
              imageUrl: row.card.team?.logoUrl,
            } satisfies FilterOption,
          ];
        }),
      ).values(),
    ).sort((a, b) => a.label.localeCompare(b.label, "fr"));

    const roleRows = getRowsForFacet("role");

    const roles = Array.from(
      new Map(
        roleRows.map((row) => {
          const name = getRoleName(row);
          return [
            name,
            {
              value: name,
              label: name,
              imageUrl: row.card.role?.iconUrl,
            } satisfies FilterOption,
          ];
        }),
      ).values(),
    ).sort((a, b) => a.label.localeCompare(b.label, "fr"));

    const nationalityRows = getRowsForFacet("nationality");

    const nationalities = Array.from(
      new Map(
        nationalityRows.map((row) => {
          const code = row.card.nationality.code ?? "N/A";
          return [
            code,
            {
              value: code,
              label: code,
              imageUrl: row.card.nationality.flagUrl,
            } satisfies FilterOption,
          ];
        }),
      ).values(),
    ).sort((a, b) => a.label.localeCompare(b.label, "fr"));

    return { series, rarities, prestiges, games, teams, roles, nationalities };
  }, [activeFilters, collection]);

  const filteredCollection = useMemo(() => {
    return collection
      .filter((row) => matchesFilters(row, activeFilters))
      .sort((a, b) => b.card.pc_value - a.card.pc_value);
  }, [activeFilters, collection]);

  const hasActiveFilters =
    seriesFilter !== ALL ||
    rarityFilter !== ALL ||
    prestigeFilter !== ALL ||
    gameFilter !== ALL ||
    teamFilter !== ALL ||
    roleFilter !== ALL ||
    nationalityFilter !== ALL;

  const activeFilterChips = [
    seriesFilter !== ALL
      ? {
          key: "series",
          label: `Serie: ${seriesFilter}`,
          onRemove: () => setSeriesFilter(ALL),
        }
      : null,
    rarityFilter !== ALL
      ? {
          key: "rarity",
          label: `Rarete: ${rarityLabel(rarityFilter as CardRarity)}`,
          onRemove: () => setRarityFilter(ALL),
        }
      : null,
    prestigeFilter !== ALL
      ? {
          key: "prestige",
          label:
            Number(prestigeFilter) > 0
              ? `Prestige: ${prestigeFilter}★`
              : "Prestige: 0★",
          onRemove: () => setPrestigeFilter(ALL),
        }
      : null,
    gameFilter !== ALL
      ? {
          key: "game",
          label: `Jeu: ${gameFilter}`,
          onRemove: () => setGameFilter(ALL),
        }
      : null,
    teamFilter !== ALL
      ? {
          key: "team",
          label: `Equipe: ${teamFilter}`,
          onRemove: () => setTeamFilter(ALL),
        }
      : null,
    roleFilter !== ALL
      ? {
          key: "role",
          label: `Role: ${roleFilter}`,
          onRemove: () => setRoleFilter(ALL),
        }
      : null,
    nationalityFilter !== ALL
      ? {
          key: "nationality",
          label: `Nationalite: ${nationalityFilter}`,
          onRemove: () => setNationalityFilter(ALL),
        }
      : null,
  ].filter((chip): chip is NonNullable<typeof chip> => chip !== null);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cyan-900/40 bg-[linear-gradient(140deg,rgba(15,23,42,0.92),rgba(2,6,23,0.88))] p-3 shadow-[inset_0_1px_0_rgba(148,163,184,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.11em] text-cyan-200">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtres collection
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{filteredCollection.length} carte(s) affichée(s)</span>
            <button
              type="button"
              onClick={() => setIsFiltersOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-md border border-cyan-700/60 bg-cyan-950/35 px-2 py-1 text-[11px] font-semibold text-cyan-100 transition hover:border-cyan-400"
            >
              {isFiltersOpen ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              {isFiltersOpen ? "Masquer" : "Afficher"}
            </button>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSeriesFilter(ALL);
                  setRarityFilter(ALL);
                  setPrestigeFilter(ALL);
                  setGameFilter(ALL);
                  setTeamFilter(ALL);
                  setRoleFilter(ALL);
                  setNationalityFilter(ALL);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-slate-600/80 bg-slate-950/85 px-2 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-cyan-400 hover:text-cyan-100"
              >
                <X className="h-3.5 w-3.5" />
                Réinitialiser
              </button>
            ) : null}
          </div>
        </div>

        {isFiltersOpen ? (
          <div className="mt-3 space-y-3">
            {activeFilterChips.length > 0 ? (
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  Filtres actifs
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {activeFilterChips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={chip.onRemove}
                      className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/60 bg-cyan-950/45 px-2.5 py-1 text-[11px] font-semibold text-cyan-100 transition hover:border-cyan-300"
                    >
                      <X className="h-3.5 w-3.5" />
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Série
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSeriesFilter(ALL)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                    seriesFilter === ALL
                      ? "border-cyan-300/70 bg-cyan-400/20 text-cyan-100"
                      : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-cyan-400/50"
                  }`}
                >
                  Toutes
                </button>
                {filterOptions.series.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setSeriesFilter((prev) => (prev === value ? ALL : value))
                    }
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                      seriesFilter === value
                        ? "border-cyan-300/70 bg-cyan-400/20 text-cyan-100"
                        : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-cyan-400/50"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Rareté
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setRarityFilter(ALL)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                    rarityFilter === ALL
                      ? "border-fuchsia-300/70 bg-fuchsia-400/20 text-fuchsia-100"
                      : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-fuchsia-400/50"
                  }`}
                >
                  Toutes
                </button>
                {filterOptions.rarities.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setRarityFilter((prev) => (prev === value ? ALL : value))
                    }
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                      rarityFilter === value
                        ? "border-fuchsia-300/70 bg-fuchsia-400/20 text-fuchsia-100"
                        : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-fuchsia-400/50"
                    }`}
                  >
                    {rarityLabel(
                      value as (typeof collection)[number]["card"]["rarity"],
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Prestige
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setPrestigeFilter(ALL)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                    prestigeFilter === ALL
                      ? "border-amber-300/70 bg-amber-400/20 text-amber-100"
                      : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-amber-400/50"
                  }`}
                >
                  Tous
                </button>
                {filterOptions.prestiges.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setPrestigeFilter((prev) =>
                        prev === value ? ALL : value,
                      )
                    }
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                      prestigeFilter === value
                        ? "border-amber-300/70 bg-amber-400/20 text-amber-100"
                        : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-amber-400/50"
                    }`}
                  >
                    {Number(value) > 0 ? `${value}★` : "0★"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Jeu
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setGameFilter(ALL)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                    gameFilter === ALL
                      ? "border-emerald-300/70 bg-emerald-400/20 text-emerald-100"
                      : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-emerald-400/50"
                  }`}
                >
                  Tous
                </button>
                {filterOptions.games.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setGameFilter((prev) =>
                        prev === option.value ? ALL : option.value,
                      )
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                      gameFilter === option.value
                        ? "border-emerald-300/70 bg-emerald-400/20 text-emerald-100"
                        : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-emerald-400/50"
                    }`}
                  >
                    {renderOptionLabel(option)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Équipe
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setTeamFilter(ALL)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                    teamFilter === ALL
                      ? "border-amber-300/70 bg-amber-400/20 text-amber-100"
                      : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-amber-400/50"
                  }`}
                >
                  Toutes
                </button>
                {filterOptions.teams.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setTeamFilter((prev) =>
                        prev === option.value ? ALL : option.value,
                      )
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                      teamFilter === option.value
                        ? "border-amber-300/70 bg-amber-400/20 text-amber-100"
                        : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-amber-400/50"
                    }`}
                  >
                    {renderOptionLabel(option)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Rôle
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setRoleFilter(ALL)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                    roleFilter === ALL
                      ? "border-violet-300/70 bg-violet-400/20 text-violet-100"
                      : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-violet-400/50"
                  }`}
                >
                  Tous
                </button>
                {filterOptions.roles.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setRoleFilter((prev) =>
                        prev === option.value ? ALL : option.value,
                      )
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                      roleFilter === option.value
                        ? "border-violet-300/70 bg-violet-400/20 text-violet-100"
                        : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-violet-400/50"
                    }`}
                  >
                    {renderOptionLabel(option)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Nationalité
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setNationalityFilter(ALL)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                    nationalityFilter === ALL
                      ? "border-sky-300/70 bg-sky-400/20 text-sky-100"
                      : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-sky-400/50"
                  }`}
                >
                  Toutes
                </button>
                {filterOptions.nationalities.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setNationalityFilter((prev) =>
                        prev === option.value ? ALL : option.value,
                      )
                    }
                    title={option.label}
                    className={`inline-flex items-center rounded-full border p-1 text-[11px] font-semibold transition ${
                      nationalityFilter === option.value
                        ? "border-sky-300/70 bg-sky-400/20 text-sky-100"
                        : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-sky-400/50"
                    }`}
                  >
                    {renderOptionLabel(option, false)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {filteredCollection.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4 text-sm text-slate-400">
          Aucune carte ne correspond aux filtres sélectionnés.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {filteredCollection.map((row) => (
            <CardTile
              key={`${row.card_id}-${row.obtained_at}`}
              card={row.card}
              obtainedAt={row.obtained_at}
              prestigeStars={row.prestige_stars ?? 0}
              isOwned
              disableExpand={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
