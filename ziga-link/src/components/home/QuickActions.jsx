import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const actions = [
  { to: "Matching", emoji: "❤️", label: "Matching", sub: "Trouve ton match", color: "from-pink-100 to-rose-100", border: "border-pink-200", text: "text-rose-600" },
{ to: "ActivitesSport", emoji: "🏆", label: "Activités", sub: "Sport & travail", color: "from-purple-100 to-violet-100", border: "border-purple-200", text: "text-purple-600" },  { to: "Social", emoji: "💬", label: "Communauté", sub: "Posts & actus", color: "from-teal-100 to-emerald-100", border: "border-teal-200", text: "text-teal-600" },
  { to: "Carnet", emoji: "📓", label: "Carnet", sub: "Mes progrès", color: "from-amber-100 to-yellow-100", border: "border-amber-200", text: "text-amber-600" },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map(({ to, emoji, label, sub, color, border, text }) => (
        <Link
          key={to}
          to={createPageUrl(to)}
          className={`bg-gradient-to-br ${color} border ${border} rounded-2xl p-3 flex flex-col items-center gap-1 hover:shadow-md transition-all active:scale-95`}
        >
          <span className="text-2xl">{emoji}</span>
          <span className={`text-xs font-black ${text} leading-tight text-center`}>{label}</span>
          <span className="text-xs text-stone-400 leading-tight text-center hidden sm:block">{sub}</span>
        </Link>
      ))}
    </div>
  );
}