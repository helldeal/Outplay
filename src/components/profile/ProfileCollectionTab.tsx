import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { CardTile } from "../CardTile";
import { rarityLabel } from "../../utils/rarity";
import type { UserCardRow } from "../../types";

const ALL = "__ALL__";

function getSeriesName(row: UserCardRow): string {
  return row.card.series?.name ?? "Sans serie";
}

function getTeamName(row: UserCardRow): string {
  return row.card.team?.name ?? "Sans team";
}

function getRoleName(row: UserCardRow): string {
  return row.card.role?.name ?? "Sans role";
}

function normalizeSelectValues(values: string[]): string[] {
  return values.filter(Boolean).sort((a, b) => a.localeCompare(b, "fr"));
}

export function ProfileCollectionTab({
  collection,
}: {
  collection: UserCardRow[];
}) {
  const [seriesFilter, setSeriesFilter] = useState<string>(ALL);
  const [rarityFilter, setRarityFilter] = useState<string>(ALL);
  const [gameFilter, setGameFilter] = useState<string>(ALL);
  const [teamFilter, setTeamFilter] = useState<string>(ALL);
  const [roleFilter, setRoleFilter] = useState<string>(ALL);
  const [nationalityFilter, setNationalityFilter] = useState<string>(ALL);

  const filterOptions = useMemo(() => {
    const series = normalizeSelectValues(
      Array.from(new Set(collection.map((row) => getSeriesName(row)))),
    );
    const games = normalizeSelectValues(
      Array.from(new Set(collection.map((row) => row.card.game.name))),
    );
    const teams = normalizeSelectValues(
      Array.from(new Set(collection.map((row) => getTeamName(row)))),
    );
    const roles = normalizeSelectValues(
      Array.from(new Set(collection.map((row) => getRoleName(row)))),
    );
    const nationalities = normalizeSelectValues(
      Array.from(
        new Set(collection.map((row) => row.card.nationality.code ?? "N/A")),
      ),
    );

    return { series, games, teams, roles, nationalities };
  }, [collection]);

  const filteredCollection = useMemo(() => {
    return collection
      .filter((row) =>
        seriesFilter === ALL ? true : getSeriesName(row) === seriesFilter,
      )
      .filter((row) =>
        rarityFilter === ALL ? true : row.card.rarity === rarityFilter,
      )
      .filter((row) =>
        gameFilter === ALL ? true : row.card.game.name === gameFilter,
      )
      .filter((row) =>
        teamFilter === ALL ? true : getTeamName(row) === teamFilter,
      )
      .filter((row) =>
        roleFilter === ALL ? true : getRoleName(row) === roleFilter,
      )
      .filter((row) =>
        nationalityFilter === ALL
          ? true
          : row.card.nationality.code === nationalityFilter,
      )
      .sort((a, b) => b.card.pc_value - a.card.pc_value);
  }, [
    collection,
    seriesFilter,
    rarityFilter,
    gameFilter,
    teamFilter,
    roleFilter,
    nationalityFilter,
  ]);

  const hasActiveFilters =
    seriesFilter !== ALL ||
    rarityFilter !== ALL ||
    gameFilter !== ALL ||
    teamFilter !== ALL ||
    roleFilter !== ALL ||
    nationalityFilter !== ALL;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/55 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.11em] text-cyan-200">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtres collection
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{filteredCollection.length} carte(s) affichée(s)</span>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSeriesFilter(ALL);
                  setRarityFilter(ALL);
                  setGameFilter(ALL);
                  setTeamFilter(ALL);
                  setRoleFilter(ALL);
                  setNationalityFilter(ALL);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-900/75 px-2 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-cyan-400 hover:text-cyan-100"
              >
                <X className="h-3.5 w-3.5" />
                Reset
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="space-y-1 text-xs">
            <span className="ml-1 text-slate-400">Serie</span>
            <select
              value={seriesFilter}
              onChange={(event) => setSeriesFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-2 text-xs text-white outline-none transition focus:border-cyan-300/60"
            >
              <option value={ALL}>Toutes</option>
              {filterOptions.series.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs">
            <span className="ml-1 text-slate-400">Rarete</span>
            <select
              value={rarityFilter}
              onChange={(event) => setRarityFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-2 text-xs text-white outline-none transition focus:border-cyan-300/60"
            >
              <option value={ALL}>Toutes</option>
              <option value="LEGENDS">{rarityLabel("LEGENDS")}</option>
              <option value="WORLD_CLASS">{rarityLabel("WORLD_CLASS")}</option>
              <option value="CHAMPION">{rarityLabel("CHAMPION")}</option>
              <option value="CHALLENGER">{rarityLabel("CHALLENGER")}</option>
              <option value="ROOKIE">{rarityLabel("ROOKIE")}</option>
            </select>
          </label>

          <label className="space-y-1 text-xs">
            <span className="ml-1 text-slate-400">Jeu</span>
            <select
              value={gameFilter}
              onChange={(event) => setGameFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-2 text-xs text-white outline-none transition focus:border-cyan-300/60"
            >
              <option value={ALL}>Tous</option>
              {filterOptions.games.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs">
            <span className="ml-1 text-slate-400">Team</span>
            <select
              value={teamFilter}
              onChange={(event) => setTeamFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-2 text-xs text-white outline-none transition focus:border-cyan-300/60"
            >
              <option value={ALL}>Toutes</option>
              {filterOptions.teams.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs">
            <span className="ml-1 text-slate-400">Role</span>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-2 text-xs text-white outline-none transition focus:border-cyan-300/60"
            >
              <option value={ALL}>Tous</option>
              {filterOptions.roles.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs">
            <span className="ml-1 text-slate-400">Nationalite</span>
            <select
              value={nationalityFilter}
              onChange={(event) => setNationalityFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-2 text-xs text-white outline-none transition focus:border-cyan-300/60"
            >
              <option value={ALL}>Toutes</option>
              {filterOptions.nationalities.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {filteredCollection.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4 text-sm text-slate-400">
          Aucune carte ne correspond aux filtres selectionnes.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {filteredCollection.map((row) => (
            <CardTile
              key={`${row.card_id}-${row.obtained_at}`}
              card={row.card}
              obtainedAt={row.obtained_at}
              isOwned
              disableExpand={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
