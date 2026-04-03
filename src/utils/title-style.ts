const TITLE_STYLE_TABLE: Array<{
  keys: string[];
  textClass: string;
}> = [
  {
    keys: ["legende", "legend", "mythique", "mythic", "god"],
    textClass:
      "bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-400 bg-clip-text text-transparent",
  },
  {
    keys: ["world", "world class", "champion du monde", "goat"],
    textClass:
      "bg-gradient-to-r from-fuchsia-300 via-purple-300 to-orange-300 bg-clip-text text-transparent",
  },
  {
    keys: ["champion", "elite", "split hunter", "hunter"],
    textClass:
      "bg-gradient-to-r from-purple-300 to-violet-400 bg-clip-text text-transparent",
  },
  {
    keys: ["clutch", "hitter", "big", "premium triple", "triple", "master"],
    textClass:
      "bg-gradient-to-r from-rose-300 to-pink-400 bg-clip-text text-transparent",
  },
  {
    keys: ["kairyyuu", "dragon", "drac", "specialist"],
    textClass:
      "bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent",
  },
  {
    keys: ["veteran", "vétéran", "split master", "enjoyer", "grind"],
    textClass:
      "bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent",
  },
  {
    keys: [
      "rookie",
      "debutant",
      "débutant",
      "newbie",
      "beta",
      "warm-up",
      "warm up",
      "start",
    ],
    textClass:
      "bg-gradient-to-r from-sky-300 to-indigo-300 bg-clip-text text-transparent",
  },
];

const FALLBACK_TITLE_COLORS = [
  "bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent",
  "bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent",
  "bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent",
  "bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent",
  "bg-gradient-to-r from-rose-300 to-pink-300 bg-clip-text text-transparent",
  "bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent",
] as const;

function normalizeTitle(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getTitleColorClass(title: string | null | undefined): string {
  const normalized = normalizeTitle(title);

  if (!normalized) {
    return "text-slate-300";
  }

  const match = TITLE_STYLE_TABLE.find(({ keys }) =>
    keys.some((key) => normalized.includes(key)),
  );

  if (match?.textClass) {
    return match.textClass;
  }

  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) % 2147483647;
  }

  return FALLBACK_TITLE_COLORS[hash % FALLBACK_TITLE_COLORS.length];
}
