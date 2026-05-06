import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, subMonths, addMonths } from "date-fns";
import { parseUTC } from "@/components/lib/dateUtils";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const TYPE_COLORS = {
  balade: "#14b8a6",
  obeissance: "#6366f1",
  randonnee: "#22c55e",
  sport: "#f97316",
  jeu: "#eab308",
  soin: "#ec4899",
  socialisation: "#a855f7",
  autre: "#a8a29e",
};

const TYPE_LABELS = {
  balade: "🐾 Balade",
  obeissance: "🧠 Entraînement",
  randonnee: "🏔 Randonnée",
  sport: "🏅 Sport",
  jeu: "🎾 Jeu",
  soin: "💊 Soin",
  socialisation: "🤝 Socialisation",
  autre: "📝 Activité",
};

export default function JournalCalendar({ entries, onSelectDay, onAddTraining }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null); // pour voir le détail d'un point

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = (getDay(days[0]) + 6) % 7;

  const getEntries = (day) =>
    entries.filter(e => {
      const d = e.created_date ? parseUTC(e.created_date) : null;
      return d && isSameDay(d, day);
    });

  const handleDay = (day) => {
    const dayEntries = getEntries(day);
    setSelectedDay(day);
    setSelectedEntry(null);
    onSelectDay?.(day, dayEntries);
    // Si jour vide → ouvre directement la fiche séance
    if (dayEntries.length === 0) {
      onAddTraining?.(day);
    }
  };

  const selectedEntries = selectedDay ? getEntries(selectedDay) : [];

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      {/* Nav mois */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-1.5 rounded-full hover:bg-stone-100">
          <ChevronLeft className="w-4 h-4 text-stone-500" />
        </button>
        <span className="text-sm font-bold text-stone-700 capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: fr })}
        </span>
        <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-1.5 rounded-full hover:bg-stone-100">
          <ChevronRight className="w-4 h-4 text-stone-500" />
        </button>
      </div>

      {/* Jours de la semaine */}
      <div className="grid grid-cols-7 text-center px-3 pb-1">
        {["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map(d => (
          <div key={d} className="text-[10px] font-semibold text-stone-400 py-1">{d}</div>
        ))}
      </div>

      {/* Grille */}
      <div className="grid grid-cols-7 px-3 pb-3 gap-y-1">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
        {days.map(day => {
          const dayEntries = getEntries(day);
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          // Un point vert par entrée (max 4 visibles)
          const dots = dayEntries.slice(0, 4);

          return (
            <button key={day.toISOString()} onClick={() => handleDay(day)}
              className={`flex flex-col items-center py-1 rounded-xl transition-all ${isSelected ? "bg-teal-500" : isToday ? "bg-teal-50" : "hover:bg-stone-50"}`}>
              <span className={`text-xs font-semibold ${isSelected ? "text-white" : isToday ? "text-teal-600" : "text-stone-700"}`}>
                {format(day, "d")}
              </span>
              {/* Points verts — 1 par activité validée */}
              <div className="flex gap-0.5 mt-0.5 h-2 flex-wrap justify-center">
                {dots.map((e, idx) => (
                  <span
                    key={idx}
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: TYPE_COLORS[e.session_type] || "#22c55e" }}
                  />
                ))}
                {dayEntries.length > 4 && (
                  <span className="text-[8px] text-stone-400 leading-none">+{dayEntries.length - 4}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-3 px-4 pb-3">
        {Object.entries(TYPE_COLORS).slice(0, 4).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[9px] text-stone-400">{TYPE_LABELS[type]?.replace(/^[^\s]+\s/, "")}</span>
          </div>
        ))}
      </div>

      {/* Détail jour sélectionné */}
      {selectedDay && selectedEntries.length > 0 && (
        <div className="border-t border-stone-100 px-4 py-3 bg-stone-50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-stone-500 capitalize">
              {format(selectedDay, "EEEE d MMMM", { locale: fr })} · {selectedEntries.length} activité{selectedEntries.length > 1 ? "s" : ""}
            </p>
            <button
              onClick={() => onAddTraining?.(selectedDay)}
              className="flex items-center gap-1 text-[10px] font-black bg-[#4CAF87] text-white px-2.5 py-1.5 rounded-full shadow-sm hover:bg-[#3d9e78] active:scale-95 transition-all"
            >
              + Fiche séance
            </button>
          </div>

          <div className="space-y-2">
            {selectedEntries.map(e => (
              <div key={e.id}>
                {/* Clic sur un point → voir le détail */}
                <button
                  onClick={() => setSelectedEntry(selectedEntry?.id === e.id ? null : e)}
                  className="w-full flex items-center gap-2 text-left hover:bg-white rounded-xl px-2 py-1.5 transition-colors"
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[e.session_type] || "#a8a29e" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-stone-700 truncate">{e.title}</p>
                    <p className="text-[10px] text-stone-400">{TYPE_LABELS[e.session_type] || "Activité"}{e.duration_minutes ? ` · ${e.duration_minutes}min` : ""}</p>
                  </div>
                  <span className="text-[10px] text-stone-300">{selectedEntry?.id === e.id ? "▲" : "▼"}</span>
                </button>

                {/* Détail de l'entrée */}
                {selectedEntry?.id === e.id && (
                  <div className="mx-2 mb-2 bg-white border border-stone-100 rounded-xl p-3 text-xs text-stone-600 space-y-1">
                    {e.notes && e.notes.split("\n").filter(Boolean).map((line, i) => (
                      <p key={i} className="leading-tight">{line}</p>
                    ))}
                    {!e.notes && <p className="text-stone-400 italic">Aucune note.</p>}
                    {e.mood && (
                      <div className="mt-2 pt-2 border-t border-stone-50">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-100">
                          Humeur : {e.mood}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={() => onAddTraining?.(selectedDay)}
              className="flex items-center gap-1 text-[10px] font-semibold text-[#4CAF87] hover:text-teal-700 mt-1 px-2"
            >
              + Ajouter une fiche
            </button>
          </div>
        </div>
      )}
    </div>
  );
}