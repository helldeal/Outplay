/// <reference types="node" />

import { BoosterType, PrismaClient, Rarity } from "@prisma/client";
import { s1Cards, s1Series } from "./series/s1.mjs";

const prisma = new PrismaClient();

function logStep(message: string) {
  console.log(`[seed] ${message}`);
}

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const nationalityCodeByName: Record<string, string> = {
  Turquie: "TR",
  "Corée du Sud": "KR",
  Taïwan: "TW",
  Chine: "CN",
  Lituanie: "LT",
  France: "FR",
  Pologne: "PL",
  USA: "US",
  Canada: "CA",
  "Rép. Tchèque": "CZ",
  Espagne: "ES",
  Allemagne: "DE",
  Suède: "SE",
  Bulgarie: "BG",
  Slovénie: "SI",
  Croatie: "HR",
  Danemark: "DK",
};

const rarityPcValues: Record<Rarity, number> = {
  ROOKIE: 100,
  CHALLENGER: 250,
  CHAMPION: 800,
  WORLD_CLASS: 2500,
  LEGENDS: 10000,
};

const roleIconByName: Record<string, string> = {
  Toplaner: "/src/assets/roles/toplaner.png",
  Jungler: "/src/assets/roles/jungler.png",
  Midlaner: "/src/assets/roles/midlaner.png",
  ADC: "/src/assets/roles/adc.png",
  Support: "/src/assets/roles/support.png",
  "Mid / ADC": "/src/assets/roles/mid-adc.png",
};

const gameByName: Record<
  string,
  { name: string; slug: string; logoUrl: string }
> = {
  LoL: {
    name: "League of Legends",
    slug: "league-of-legends",
    logoUrl: "/src/assets/games/league-of-legends.png",
  },
};

const teamLogoByName: Record<string, string> = {
  "100 Thieves": "/src/assets/teams/100-thieves.png",
  BLG: "/src/assets/teams/blg.png",
  CFO: "/src/assets/teams/cfo.png",
  Cloud9: "/src/assets/teams/cloud9.png",
  "Damwon Gaming": "/src/assets/teams/damwon-gaming.png",
  "Dplus KIA": "/src/assets/teams/dplus-kia.png",
  DRX: "/src/assets/teams/drx.png",
  EDG: "/src/assets/teams/edg.png",
  FlyQuest: "/src/assets/teams/flyquest.svg",
  Fnatic: "/src/assets/teams/fnatic.png",
  FPX: "/src/assets/teams/fpx.png",
  "G2 Esports": "/src/assets/teams/g2-esports.webp",
  GameWard: "/src/assets/teams/gameward.png",
  "Gen.G": "/src/assets/teams/gen-g.png",
  GiantX: "/src/assets/teams/giantx.png",
  "Hanwha Life": "/src/assets/teams/hanwha-life.png",
  "Invictus Gaming": "/src/assets/teams/invictus-gaming.png",
  JDG: "/src/assets/teams/jdg.png",
  "Karmine Corp": "/src/assets/teams/karmine-corp.png",
  Kwangdong: "/src/assets/teams/kwangdong.png",
  "KT Rolster": "/src/assets/teams/kt-rolster.png",
  "MAD Lions": "/src/assets/teams/mad-lions.png",
  "MAD Lions KOI": "/src/assets/teams/mad-lions-koi.png",
  NIP: "/src/assets/teams/nip.svg",
  RNG: "/src/assets/teams/rng.png",
  T1: "/src/assets/teams/t1.png",
  TES: "/src/assets/teams/tes.png",
  "Team BDS": "/src/assets/teams/team-bds.png",
  "Team Liquid": "/src/assets/teams/team-liquid.png",
  "Team Vitality": "/src/assets/teams/team-vitality.png",
  "Team WE": "/src/assets/teams/team-we.png",
  Vitality: "/src/assets/teams/vitality.png",
  "Weibo Gaming": "/src/assets/teams/weibo-gaming.png",
};

const cardImageById: Record<string, string> = {
  "S1-02": "/src/assets/cards/S1/S1-02.jpg",
  "S1-03": "/src/assets/cards/S1/S1-03.jpeg",
  "S1-05": "/src/assets/cards/S1/S1-05.jpg",
  "S1-26": "/src/assets/cards/S1/S1-26.jpg",
  "S1-27": "/src/assets/cards/S1/S1-27.jpg",
  "S1-29": "/src/assets/cards/S1/S1-29.jpg",
  "S1-35": "/src/assets/cards/S1/S1-35.jpg",
  "S1-36": "/src/assets/cards/S1/S1-36.jpg",
  "S1-38": "/src/assets/cards/S1/S1-38.jpg",
  "S1-40": "/src/assets/cards/S1/S1-40.jpg",
  "S1-49": "/src/assets/cards/S1/S1-49.avif",
  "S1-52": "/src/assets/cards/S1/S1-52.jpeg",
  "S1-53": "/src/assets/cards/S1/S1-53.jpeg",
  "S1-54": "/src/assets/cards/S1/S1-54.jpeg",
  "S1-55": "/src/assets/cards/S1/S1-55.jpg",
  "S1-56": "/src/assets/cards/S1/S1-56.jpg",
  "S1-57": "/src/assets/cards/S1/S1-57.jpeg",
  "S1-58": "/src/assets/cards/S1/S1-58.jpg",
  "S1-59": "/src/assets/cards/S1/S1-59.jpg",
  "S1-60": "/src/assets/cards/S1/S1-60.jpg",
  "S1-63": "/src/assets/cards/S1/S1-63.jpeg",
  "S1-65": "/src/assets/cards/S1/S1-65.jpg",
  "S1-66": "/src/assets/cards/S1/S1-66.jpg",
  "S1-67": "/src/assets/cards/S1/S1-67.avif",
  "S1-68": "/src/assets/cards/S1/S1-68.jpg",
  "S1-69": "/src/assets/cards/S1/S1-69.avif",
};

const getCardImageUrl = (cardId: string): string => {
  return cardImageById[cardId] ?? `/src/assets/cards/S1/${cardId}.webp`;
};

async function clearDatabase() {
  logStep("clearing existing seeded data...");

  await prisma.userCard.deleteMany();
  await prisma.userAchievement.deleteMany();
  await prisma.loginStreak.deleteMany();
  await prisma.boosterOpening.deleteMany();
  await prisma.booster.deleteMany();
  await prisma.card.deleteMany();
  await prisma.series.deleteMany();
  await prisma.role.deleteMany();
  await prisma.team.deleteMany();
  await prisma.nationality.deleteMany();
  await prisma.game.deleteMany();

  logStep("database cleared");
}

async function seedCollections() {
  logStep("seeding games...");
  const gameRows = await Promise.all(
    Array.from(new Set(s1Cards.map((card) => card.game))).map((gameName) => {
      const game = gameByName[gameName] ?? {
        name: gameName,
        slug: slugify(gameName),
        logoUrl: `/src/assets/games/${slugify(gameName)}.png`,
      };

      return prisma.game.create({ data: game });
    }),
  );

  const gameIdByName = new Map(gameRows.map((game) => [game.name, game.id]));
  gameIdByName.set("LoL", gameRows[0]?.id ?? "");

  logStep("seeding teams...");
  const teamRows = await Promise.all(
    Array.from(new Set(s1Cards.map((card) => card.team))).map((teamName) =>
      prisma.team.create({
        data: {
          name: teamName,
          slug: slugify(teamName),
          logoUrl:
            teamLogoByName[teamName] ??
            `/src/assets/teams/${slugify(teamName)}.png`,
        },
      }),
    ),
  );

  const teamIdByName = new Map(teamRows.map((team) => [team.name, team.id]));

  logStep("seeding nationalities with FlagCDN...");
  const nationalityRows = await Promise.all(
    Array.from(new Set(s1Cards.map((card) => card.nationality))).map(
      (nationalityName) => {
        const code = nationalityCodeByName[nationalityName];
        if (!code) {
          throw new Error(
            `Missing ISO code mapping for nationality: ${nationalityName}`,
          );
        }

        return prisma.nationality.create({
          data: {
            name: nationalityName,
            code,
            flagUrl: `https://flagcdn.com/w80/${code.toLowerCase()}.png`,
          },
        });
      },
    ),
  );

  const nationalityIdByName = new Map(
    nationalityRows.map((nationality) => [nationality.name, nationality.id]),
  );

  logStep("seeding roles...");
  const roleRows = await Promise.all(
    Array.from(new Set(s1Cards.map((card) => card.role))).map((roleName) =>
      prisma.role.create({
        data: {
          name: roleName,
          slug: slugify(roleName),
          iconUrl:
            roleIconByName[roleName] ??
            `/src/assets/roles/${slugify(roleName)}.png`,
        },
      }),
    ),
  );

  const roleIdByName = new Map(roleRows.map((role) => [role.name, role.id]));

  return { gameIdByName, teamIdByName, nationalityIdByName, roleIdByName };
}

async function seedSeriesAndCards(ids: {
  gameIdByName: Map<string, string>;
  teamIdByName: Map<string, string>;
  nationalityIdByName: Map<string, string>;
  roleIdByName: Map<string, string>;
}) {
  logStep(`seeding series ${s1Series.code}...`);
  const series = await prisma.series.create({
    data: {
      name: s1Series.name,
      slug: s1Series.slug,
      code: s1Series.code,
      coverImage: s1Series.coverImage,
    },
  });

  logStep(`seeding ${s1Cards.length} cards...`);
  for (const card of s1Cards) {
    const gameId =
      ids.gameIdByName.get("League of Legends") ??
      ids.gameIdByName.get(card.game);
    const teamId = ids.teamIdByName.get(card.team);
    const nationalityId = ids.nationalityIdByName.get(card.nationality);
    const roleId = ids.roleIdByName.get(card.role);

    if (!gameId || !teamId || !nationalityId || !roleId) {
      throw new Error(`Missing relation id(s) for card ${card.id}`);
    }

    const rarity = card.rarity as Rarity;
    await prisma.card.create({
      data: {
        id: card.id,
        name: card.name,
        rarity,
        pcValue: rarityPcValues[rarity],
        imageUrl: getCardImageUrl(card.id),
        animationUrl: null,
        seriesId: series.id,
        gameId,
        teamId,
        nationalityId,
        roleId,
      },
    });
  }

  const boosters = [
    {
      name: `${s1Series.code} Normal Booster`,
      type: BoosterType.NORMAL,
      pricePc: 1250,
      imageUrl: "/src/assets/series/rift-champions.jpg",
      isDailyOnly: false,
      dropRates: {
        ROOKIE: 80,
        CHALLENGER: 14,
        CHAMPION: 4.5,
        WORLD_CLASS: 1.45,
        LEGENDS: 0.05,
      },
    },
    {
      name: `${s1Series.code} Luck Booster`,
      type: BoosterType.LUCK,
      pricePc: 3500,
      imageUrl: "/src/assets/series/rift-champions.jpg",
      isDailyOnly: false,
      dropRates: {
        ROOKIE: 60,
        CHALLENGER: 24,
        CHAMPION: 11,
        WORLD_CLASS: 4.8,
        LEGENDS: 0.2,
      },
    },
    {
      name: `${s1Series.code} Premium Booster`,
      type: BoosterType.PREMIUM,
      pricePc: 8000,
      imageUrl: "/src/assets/series/rift-champions.jpg",
      isDailyOnly: false,
      dropRates: {
        ROOKIE: 40,
        CHALLENGER: 27,
        CHAMPION: 20,
        WORLD_CLASS: 12.2,
        LEGENDS: 0.8,
      },
    },
    {
      name: `${s1Series.code} Godpack Daily`,
      type: BoosterType.GODPACK,
      pricePc: 0,
      imageUrl: null,
      isDailyOnly: true,
      dropRates: {
        ROOKIE: 0,
        CHALLENGER: 30,
        CHAMPION: 28,
        WORLD_CLASS: 40,
        LEGENDS: 2,
      },
    },
  ];

  await Promise.all(
    boosters.map((booster) =>
      prisma.booster.create({
        data: {
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

  logStep("series, cards and boosters seeded");
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
  await clearDatabase();
  const ids = await seedCollections();
  await seedSeriesAndCards(ids);
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
