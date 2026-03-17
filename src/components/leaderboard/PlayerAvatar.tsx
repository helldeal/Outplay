export function PlayerAvatar({
  avatarUrl,
  username,
  size = "sm",
}: {
  avatarUrl: string | null;
  username: string;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const dim =
    size === "lg"
      ? "h-20 w-20"
      : size === "md"
        ? "h-16 w-16"
        : size === "xs"
          ? "h-5 w-5"
          : "h-7 w-7";
  const textSize =
    size === "lg"
      ? "text-xl"
      : size === "md"
        ? "text-sm"
        : size === "xs"
          ? "text-[9px]"
          : "text-[10px]";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className={`${dim} rounded-full border border-slate-600/70 bg-slate-800 object-cover`}
        loading="lazy"
      />
    );
  }

  const initials =
    username
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "OP";

  return (
    <span
      className={`inline-flex ${dim} items-center justify-center rounded-full border border-slate-600/70 bg-slate-700 ${textSize} font-semibold text-slate-200`}
    >
      {initials}
    </span>
  );
}
