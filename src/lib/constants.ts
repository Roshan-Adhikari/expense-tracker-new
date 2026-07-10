export const CATEGORIES = [
  "Food", "Transport", "Entertainment", "Shopping",
  "Health", "Housing", "Utilities", "Education", "Travel", "General",
] as const;

export const CATEGORY_ICONS: Record<string, string> = {
  Food: "🍔", Transport: "🚗", Entertainment: "🎮", Shopping: "🛍️",
  Health: "💊", Housing: "🏠", Utilities: "⚡", Education: "📚",
  Travel: "✈️", General: "📦",
};

export const CATEGORY_COLORS: Record<string, string> = {
  Food: "bg-orange-500/15 text-orange-500 border-orange-500/20",
  Transport: "bg-blue-500/15 text-blue-500 border-blue-500/20",
  Entertainment: "bg-purple-500/15 text-purple-500 border-purple-500/20",
  Shopping: "bg-pink-500/15 text-pink-500 border-pink-500/20",
  Health: "bg-green-500/15 text-green-500 border-green-500/20",
  Housing: "bg-yellow-500/15 text-yellow-500 border-yellow-500/20",
  Utilities: "bg-cyan-500/15 text-cyan-500 border-cyan-500/20",
  Education: "bg-indigo-500/15 text-indigo-500 border-indigo-500/20",
  Travel: "bg-sky-500/15 text-sky-500 border-sky-500/20",
  General: "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

export const CHART_COLORS: Record<string, string> = {
  Food: "#f97316",
  Transport: "#3b82f6",
  Entertainment: "#a855f7",
  Shopping: "#ec4899",
  Health: "#22c55e",
  Housing: "#eab308",
  Utilities: "#06b6d4",
  Education: "#6366f1",
  Travel: "#0ea5e9",
  General: "#6b7280",
};
