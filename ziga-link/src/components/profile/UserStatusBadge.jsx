export const STATUS_CONFIG = {
  disponible:        { label: "Disponible",         emoji: "🟢", color: "bg-green-100 text-green-700 border-green-200",   dot: "#22c55e" },
  en_balade:         { label: "En balade",           emoji: "🔵", color: "bg-teal-100 text-teal-700 border-teal-200",     dot: "#14b8a6" },
  au_repos:          { label: "Au repos",            emoji: "🟡", color: "bg-yellow-100 text-yellow-700 border-yellow-200", dot: "#eab308" },
  cherche_compagnon: { label: "Cherche compagnon",   emoji: "🟣", color: "bg-purple-100 text-purple-700 border-purple-200", dot: "#a855f7" },
};

export default function UserStatusBadge({ status, size = "sm" }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.disponible;
  const sizeClass = size === "lg" ? "text-sm px-3 py-1.5" : "text-xs px-2.5 py-1";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-semibold ${cfg.color} ${sizeClass}`}>
      <span>{cfg.emoji}</span>
      <span>{cfg.label}</span>
    </span>
  );
}