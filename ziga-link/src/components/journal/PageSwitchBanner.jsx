import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PageSwitchBanner({ activePage, dogName }) {
  return (
    <div className="flex w-full" style={{ minHeight: 72 }}>
      {/* Côté violet — Obéissance */}
      <Link
        to={createPageUrl("Obeissance")}
        className={`flex-1 flex flex-col justify-center px-5 pt-8 pb-4 transition-all ${
          activePage === "obeissance"
            ? "bg-gradient-to-br from-violet-600 via-indigo-600 to-indigo-700"
            : "bg-violet-800/80 hover:bg-violet-700"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📚</span>
          <div>
            <p className={`font-black text-base leading-tight ${activePage === "obeissance" ? "text-white" : "text-violet-200"}`}>
              Journal de {dogName || "Coco"}
            </p>
            <p className={`text-xs mt-0.5 ${activePage === "obeissance" ? "text-indigo-200" : "text-violet-300"}`}>
              Défis · Séances · Progression
            </p>
          </div>
        </div>
        <div className={`mt-1.5 h-0.5 rounded-full transition-all duration-500 ${
          activePage === "obeissance" ? "w-10 bg-white/80" : "w-0 bg-transparent"
        }`} />
      </Link>

      {/* Côté or — Journal de Vie */}
      <Link
        to={createPageUrl("JournalVie")}
        className={`flex-1 flex flex-col justify-center px-5 pt-8 pb-4 transition-all ${
          activePage === "journal"
            ? "bg-amber-400"
            : "bg-amber-500/90 hover:bg-amber-400"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🐾</span>
          <div>
            <p className={`font-black text-base leading-tight ${activePage === "journal" ? "text-amber-900" : "text-amber-100"}`}>
              Suivi & Activité
            </p>
            <p className={`text-xs mt-0.5 ${activePage === "journal" ? "text-amber-800" : "text-amber-200"}`}>
              Balades · Activités · Stats
            </p>
          </div>
        </div>
        <div className={`mt-1.5 h-0.5 rounded-full transition-all duration-500 ${
          activePage === "journal" ? "w-10 bg-amber-900/50" : "w-0 bg-transparent"
        }`} />
      </Link>
    </div>
  );
}