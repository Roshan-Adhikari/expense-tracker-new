export function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

export function relDate(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-pink-500",
  "bg-emerald-500", "bg-orange-500", "bg-sky-500",
];

export function colorFor(id: string) {
  return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];
}

export function initials(name: string | null, email: string) {
  return name
    ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : email[0].toUpperCase();
}

export function shortName(
  userId: string,
  meId: string,
  name: string | null | undefined,
  email?: string
) {
  if (userId === meId) return "you";
  return name?.split(" ")[0] || email?.split("@")[0] || "Someone";
}
