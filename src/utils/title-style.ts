const TITLE_STYLE_TABLE: Array<{
  keys: string[];
  textClass: string;
}> = [
  {
    keys: ["legende", "legend", "mythique", "mythic"],
    textClass: "text-amber-300",
  },
  {
    keys: ["world", "world class", "champion du monde", "goat"],
    textClass: "text-fuchsia-300",
  },
  {
    keys: ["champion", "elite", "elite"],
    textClass: "text-purple-300",
  },
  {
    keys: ["clutch", "hitter", "big"],
    textClass: "text-rose-300",
  },
  {
    keys: ["kairyyuu", "dragon", "drac"],
    textClass: "text-cyan-300",
  },
  {
    keys: ["master", "veteran", "vétéran"],
    textClass: "text-emerald-300",
  },
  {
    keys: ["rookie", "debutant", "débutant", "newbie", "beta"],
    textClass: "text-sky-300",
  },
];

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

  return match?.textClass ?? "";
}
