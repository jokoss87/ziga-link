import { format } from "date-fns";
import { parseUTC } from "@/components/lib/dateUtils";
import { fr } from "date-fns/locale";
import { Share2, Trash2, Navigation, Footprints, Map } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useState } from "react";

function WalkRouteButton({ entryId }) {
  const [loading, setLoading] = useState(false);

  const openRoute = async () => {
    setLoading(true);
    const routes = await base44.entities.WalkRoute.filter({ entry_id: entryId }, "-created_date", 1);
    setLoading(false);
    if (routes[0]?.points?.length > 1) {
      window.location.href = `/CarteFullscreen?route=${encodeURIComponent(JSON.stringify(routes[0].points))}`;
    }
  };

  return (
    <button onClick={openRoute} disabled={loading}
      className="flex items-center gap-1 text-[11px] font-bold text-teal-600 bg-teal-50 border border-teal-200 rounded-full px-2.5 py-1 hover:bg-teal-100 transition-colors">
      {loading ? <span className="w-3 h-3 border border-teal-400 border-t-transparent rounded-full animate-spin" /> : <Map className="w-3 h-3" />}
      Voir le trajet
    </button>
  );
}

const TYPE_CONFIG = {
  balade: { emoji: "🐾", label: "Balade", bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700" },
  obeissance: { emoji: "🎓", label: "Entraînement", bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700" },
  randonnee: { emoji: "🏔️", label: "Randonnée", bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
  sport: { emoji: "🏅", label: "Sport", bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
  jeu: { emoji: "🎾", label: "Jeu", bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700" },
  soin: { emoji: "💊", label: "Soin", bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-700" },
  socialisation: { emoji: "🐕", label: "Socialisation", bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
  autre: { emoji: "✨", label: "Autre", bg: "bg-stone-50", border: "border-stone-200", text: "text-stone-700" },
};

const MOOD_ICONS = { excellent: "😄", bien: "🙂", moyen: "😐", difficile: "😔" };

export default function JournalFeed({ entries, onDelete, onShare }) {
  if (!entries.length) return (
    <div className="text-center py-10">
      <div className="text-4xl mb-3">📓</div>
      <p className="text-stone-500 text-sm font-medium">Aucune activité enregistrée</p>
      <p className="text-stone-400 text-xs mt-1">Appuyez sur + pour commencer !</p>
    </div>
  );

  // Grouper par jour
  const grouped = entries.reduce((acc, e) => {
    const date = e.created_date ? format(parseUTC(e.created_date), "yyyy-MM-dd") : "?";
    if (!acc[date]) acc[date] = [];
    acc[date].push(e);
    return acc;
  }, {});

  const handleDelete = async (id) => {
    await base44.entities.ProgressEntry.delete(id);
    onDelete?.();
  };

  return (
    <div className="space-y-4">
      {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([date, dayEntries]) => {
        const dateObj = date !== "?" ? parseUTC(date) : null;
        return (
          <div key={date}>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2 capitalize">
              {dateObj ? format(dateObj, "EEEE d MMMM", { locale: fr }) : "Date inconnue"}
            </p>
            <div className="space-y-2">
              {dayEntries.map(entry => {
                const cfg = TYPE_CONFIG[entry.session_type] || TYPE_CONFIG.autre;
                return (
                  <div key={entry.id} className={`${cfg.bg} border ${cfg.border} rounded-2xl p-4`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="text-2xl flex-shrink-0 mt-0.5">{cfg.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border}`}>{cfg.label}</span>
                            {entry.mood && <span className="text-sm">{MOOD_ICONS[entry.mood] || ""}</span>}
                          </div>
                          <p className="text-sm font-bold text-stone-800 mt-1 leading-tight">{entry.dog_name && `${entry.dog_name} · `}{entry.title}</p>
                          {entry.notes && <p className="text-xs text-stone-500 mt-1 line-clamp-2">{entry.notes}</p>}
                          <div className="flex gap-3 mt-2 flex-wrap">
                            {entry.duration_minutes > 0 && (
                              <span className="text-[11px] text-stone-500 flex items-center gap-1">⏱ {entry.duration_minutes} min</span>
                            )}
                            {entry.distance_km > 0 && (
                              <span className="text-[11px] text-stone-500 flex items-center gap-1">
                                <Navigation className="w-3 h-3" /> {entry.distance_km} km
                              </span>
                            )}
                            {entry.steps > 0 && (
                              <span className="text-[11px] text-stone-500 flex items-center gap-1">
                                <Footprints className="w-3 h-3" /> {entry.steps.toLocaleString("fr-FR")} pas
                              </span>
                            )}
                          </div>
                          {entry.session_type === "balade" && entry.id && (
                            <div className="mt-2">
                              <WalkRouteButton entryId={entry.id} />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <button onClick={() => onShare?.(entry)}
                          className="p-1.5 rounded-lg bg-white/60 hover:bg-white text-stone-400 hover:text-stone-600 transition-colors">
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(entry.id)}
                          className="p-1.5 rounded-lg bg-white/60 hover:bg-red-50 text-stone-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {entry.media_url && (
                      <img src={entry.media_url} alt="" className="mt-3 w-full h-40 object-cover rounded-xl" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}