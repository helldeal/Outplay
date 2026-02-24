import { PrismaClient, BoosterType, Rarity } from "@prisma/client";

const prisma = new PrismaClient();

function logStep(message) {
  console.log(`[seed] ${message}`);
}

const games = [
  {
    name: "League of Legends",
    slug: "league-of-legends",
    logoUrl: "https://example.com/games/lol.webp",
  },
  {
    name: "VALORANT",
    slug: "valorant",
    logoUrl: "https://example.com/games/valorant.webp",
  },
  {
    name: "Rocket League",
    slug: "rocket-league",
    logoUrl: "https://example.com/games/rocket-league.webp",
  },
];

const teams = [
  { name: "T1", slug: "t1", logoUrl: "https://example.com/teams/t1.webp" },
  {
    name: "G2 Esports",
    slug: "g2-esports",
    logoUrl: "https://example.com/teams/g2.webp",
  },
  {
    name: "Fnatic",
    slug: "fnatic",
    logoUrl: "https://example.com/teams/fnatic.webp",
  },
  {
    name: "Karmine Corp",
    slug: "karmine-corp",
    logoUrl: "https://example.com/teams/karmine.webp",
  },
  {
    name: "Team Vitality",
    slug: "team-vitality",
    logoUrl: "https://example.com/teams/vitality.webp",
  },
];

const nationalities = [
  { name: "France", code: "FR", flagUrl: "https://example.com/flags/fr.webp" },
  { name: "Korea", code: "KR", flagUrl: "https://example.com/flags/kr.webp" },
  {
    name: "United States",
    code: "US",
    flagUrl: "https://example.com/flags/us.webp",
  },
  { name: "Germany", code: "DE", flagUrl: "https://example.com/flags/de.webp" },
  { name: "Spain", code: "ES", flagUrl: "https://example.com/flags/es.webp" },
];

const roles = [
  { name: "Top", slug: "top", iconUrl: "https://example.com/roles/top.webp" },
  {
    name: "Jungle",
    slug: "jungle",
    iconUrl: "https://example.com/roles/jungle.webp",
  },
  { name: "Mid", slug: "mid", iconUrl: "https://example.com/roles/mid.webp" },
  { name: "ADC", slug: "adc", iconUrl: "https://example.com/roles/adc.webp" },
  {
    name: "Support",
    slug: "support",
    iconUrl: "https://example.com/roles/support.webp",
  },
];

const rarityPcValues = {
  ROOKIE: 100,
  CHALLENGER: 300,
  CHAMPION: 1000,
  WORLD_CLASS: 3500,
  LEGENDS: 20000,
};

function getRarity(number) {
  if (number <= 32) return Rarity.ROOKIE;
  if (number <= 52) return Rarity.CHALLENGER;
  if (number <= 62) return Rarity.CHAMPION;
  if (number <= 69) return Rarity.WORLD_CLASS;
  if (number === 70) return Rarity.LEGENDS;
  return Rarity.ROOKIE;
}

async function logDatabaseContext() {
  const context = await prisma.$queryRaw`
    SELECT
      current_database()::text AS database,
      current_schema()::text AS schema,
      current_user::text AS db_user,
      inet_server_addr()::text AS host
  `;

  const row = context?.[0];
  if (row) {
    logStep(
      `connected to db=${row.database} schema=${row.schema} user=${row.db_user} host=${row.host}`,
    );
  }
}

async function upsertCollections() {
  logStep("upserting games...");
  await Promise.all(
    games.map((game) =>
      prisma.game.upsert({
        where: { slug: game.slug },
        update: game,
        create: game,
      }),
    ),
  );

  logStep("upserting teams...");
  await Promise.all(
    teams.map((team) =>
      prisma.team.upsert({
        where: { slug: team.slug },
        update: team,
        create: team,
      }),
    ),
  );

  logStep("upserting nationalities...");
  await Promise.all(
    nationalities.map((nationality) =>
      prisma.nationality.upsert({
        where: { code: nationality.code },
        update: nationality,
        create: nationality,
      }),
    ),
  );

  logStep("upserting roles...");
  await Promise.all(
    roles.map((role) =>
      prisma.role.upsert({
        where: { slug: role.slug },
        update: role,
        create: role,
      }),
    ),
  );

  logStep("collections upsert complete");
}

async function seedSeriesAndCards() {
  logStep("loading collections for card generation...");
  const [allGames, allTeams, allNationalities, allRoles] = await Promise.all([
    prisma.game.findMany({ orderBy: { slug: "asc" } }),
    prisma.team.findMany({ orderBy: { slug: "asc" } }),
    prisma.nationality.findMany({ orderBy: { code: "asc" } }),
    prisma.role.findMany({ orderBy: { slug: "asc" } }),
  ]);

  logStep(
    `loaded games=${allGames.length}, teams=${allTeams.length}, nationalities=${allNationalities.length}, roles=${allRoles.length}`,
  );

  const series = await prisma.series.upsert({
    where: { code: "S1" },
    update: {
      name: "Season 1",
      slug: "season-1",
      code: "S1",
      coverImage: "https://example.com/series/S1-cover.webp",
    },
    create: {
      name: "Season 1",
      slug: "season-1",
      code: "S1",
      coverImage: "https://example.com/series/S1-cover.webp",
    },
  });

  logStep(`series ready: ${series.code} (${series.id})`);

  logStep("upserting 70 cards...");

  for (let number = 1; number <= 70; number += 1) {
    const cardId = `S1-${String(number).padStart(2, "0")}`;
    const game = allGames[(number - 1) % allGames.length];
    const team =
      number % 5 === 0 ? null : allTeams[(number - 1) % allTeams.length];
    const nationality =
      allNationalities[(number - 1) % allNationalities.length];
    const role =
      number % 6 === 0 ? null : allRoles[(number - 1) % allRoles.length];

    await prisma.card.upsert({
      where: { id: cardId },
      update: {
        name: `Player ${number}`,
        rarity: getRarity(number),
        pcValue: rarityPcValues[getRarity(number)],
        imageUrl: `https://example.com/cards/S1/${cardId}.webp`,
        animationUrl:
          number % 10 === 0
            ? `https://example.com/cards/S1/${cardId}.webm`
            : null,
        seriesId: series.id,
        gameId: game.id,
        teamId: team?.id ?? null,
        nationalityId: nationality.id,
        roleId: role?.id ?? null,
      },
      create: {
        id: cardId,
        name: `Player ${number}`,
        rarity: getRarity(number),
        pcValue: rarityPcValues[getRarity(number)],
        imageUrl: `https://example.com/cards/S1/${cardId}.webp`,
        animationUrl:
          number % 10 === 0
            ? `https://example.com/cards/S1/${cardId}.webm`
            : null,
        seriesId: series.id,
        gameId: game.id,
        teamId: team?.id ?? null,
        nationalityId: nationality.id,
        roleId: role?.id ?? null,
      },
    });

    if (number % 10 === 0 || number === 70) {
      logStep(`cards progress: ${number}/70`);
    }
  }

  const boosters = [
    {
      name: "S1 Normal Booster",
      type: BoosterType.NORMAL,
      pricePc: 1200,
      imageUrl: "https://example.com/boosters/S1-normal.webp",
      isDailyOnly: false,
      dropRates: {
        ROOKIE: 70,
        CHALLENGER: 20,
        CHAMPION: 7,
        WORLD_CLASS: 2.9,
        LEGENDS: 0.1,
      },
    },
    {
      name: "S1 Luck Booster",
      type: BoosterType.LUCK,
      pricePc: 2600,
      imageUrl: "https://example.com/boosters/S1-luck.webp",
      isDailyOnly: false,
      dropRates: {
        ROOKIE: 45,
        CHALLENGER: 30,
        CHAMPION: 15,
        WORLD_CLASS: 9,
        LEGENDS: 1,
      },
    },
    {
      name: "S1 Premium Booster",
      type: BoosterType.PREMIUM,
      pricePc: 5000,
      imageUrl: "https://example.com/boosters/S1-premium.webp",
      isDailyOnly: false,
      dropRates: {
        ROOKIE: 25,
        CHALLENGER: 30,
        CHAMPION: 25,
        WORLD_CLASS: 17,
        LEGENDS: 3,
      },
    },
    {
      name: "S1 Godpack Daily",
      type: BoosterType.GODPACK,
      pricePc: 0,
      imageUrl: "https://example.com/boosters/S1-godpack.webp",
      isDailyOnly: true,
      dropRates: {
        ROOKIE: 0,
        CHALLENGER: 20,
        CHAMPION: 40,
        WORLD_CLASS: 35,
        LEGENDS: 5,
      },
    },
  ];

  await Promise.all(
    boosters.map((booster) =>
      prisma.booster.upsert({
        where: {
          seriesId_type: {
            seriesId: series.id,
            type: booster.type,
          },
        },
        update: {
          name: booster.name,
          pricePc: booster.pricePc,
          imageUrl: booster.imageUrl,
          isDailyOnly: booster.isDailyOnly,
          dropRates: booster.dropRates,
        },
        create: {
          name: booster.name,
          type: booster.type,
          pricePc: booster.pricePc,
          imageUrl: booster.imageUrl,
          isDailyOnly: booster.isDailyOnly,
          dropRates: booster.dropRates,
          seriesId: series.id,
        },
      }),
    ),
  );

  logStep("boosters upsert complete");
}

async function logFinalCounts() {
  const [
    gamesCount,
    teamsCount,
    nationalitiesCount,
    rolesCount,
    seriesCount,
    cardsCount,
    boostersCount,
  ] = await Promise.all([
    prisma.game.count(),
    prisma.team.count(),
    prisma.nationality.count(),
    prisma.role.count(),
    prisma.series.count(),
    prisma.card.count(),
    prisma.booster.count(),
  ]);

  logStep(
    `final counts => games=${gamesCount}, teams=${teamsCount}, nationalities=${nationalitiesCount}, roles=${rolesCount}, series=${seriesCount}, cards=${cardsCount}, boosters=${boostersCount}`,
  );
}

async function main() {
  console.time("seed_duration");
  logStep("start");
  await logDatabaseContext();
  await upsertCollections();
  await seedSeriesAndCards();
  await logFinalCounts();
  logStep("done");
  console.timeEnd("seed_duration");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
