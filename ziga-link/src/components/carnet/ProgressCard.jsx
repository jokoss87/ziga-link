import { Clock, Trash2, Navigation, Footprints, Map } from "lucide-react";
import { parseUTC } from "@/components/lib/dateUtils";
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
      className="flex items-center gap-1 text-xs font-bold text-teal-600 bg-teal-50 border border-teal-200 rounded-full px-3 py-1.5 hover:bg-teal-100 transition-colors mt-2">
      {loading ? <span className="w-3 h-3 border border-teal-400 border-t-transparent rounded-full animate-spin" /> : <Map className="w-3 h-3" />}
      🗺️ Voir le trajet sur la carte
    </button>
  );
}

const SESSION_EMOJI = {
  obeissance: "🎓", sport: "🏃", socialisation: "🐕", balade: "🦮",
  jeu: "🎾", soin: "💊", autre: "📝",
};
const MOOD_COLOR = {
  excellent: "bg-green-100 text-green-700",
  bien: "bg-teal-100 text-teal-700",
  moyen: "bg-amber-100 text-amber-700",
  difficile: "bg-red-100 text-red-700",
};
const MOOD_LABEL = { excellent: "Excellent 🌟", bien: "Bien 😊", moyen: "Moyen 😐", difficile: "Difficile 😓" };

export default function ProgressCard({ entry, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Supprimer cette séance ?")) return;
    setDeleting(true);
    await base44.entities.ProgressEntry.delete(entry.id);
    onDelete();
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-xl flex-shrink-0">
            {SESSION_EMOJI[entry.session_type] || "📝"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-stone-800 text-sm leading-tight">{entry.title}</h3>
                {entry.dog_name && <p className="text-xs text-stone-400 mt-0.5">🐶 {entry.dog_name}</p>}
              </div>
              <button onClick={handleDelete} disabled={deleting} className="text-stone-300 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {entry.mood && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${MOOD_COLOR[entry.mood]}`}>
                  {MOOD_LABEL[entry.mood]}
                </span>
              )}
              {entry.duration_minutes && (
                <span className="text-xs text-stone-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {entry.duration_minutes} min
                </span>
              )}
              {entry.distance_km > 0 && (
                <span className="text-xs text-stone-500 flex items-center gap-1">
                  <Navigation className="w-3 h-3" /> {entry.distance_km} km
                </span>
              )}
              {entry.steps > 0 && (
                <span className="text-xs text-stone-500 flex items-center gap-1">
                  <Footprints className="w-3 h-3" /> {entry.steps.toLocaleString("fr-FR")} pas
                </span>
              )}
              {entry.badge_earned && (
                <span className="text-xs bg-amber-50 text-amber-600 border border-amber-100 rounded-full px-2 py-0.5">
                  🏅 {entry.badge_earned}
                </span>
              )}
            </div>
            {entry.session_type === "balade" && entry.id && (
              <WalkRouteButton entryId={entry.id} />
            )}
          </div>
        </div>

        {entry.notes && <p className="text-sm text-stone-600 mt-3 border-t border-stone-50 pt-3">{entry.notes}</p>}

        {entry.exercises?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {entry.exercises.map((ex, i) => (
              <span key={i} className="text-xs bg-stone-50 text-stone-500 border border-stone-100 rounded-full px-2 py-0.5">{ex}</span>
            ))}
          </div>
        )}

        {entry.media_url && (
          <div className="mt-3">
            <img src={entry.media_url} alt="séance" className="w-full rounded-xl object-cover max-h-48" />
          </div>
        )}

        <p className="text-xs text-stone-300 mt-2">
          {parseUTC(entry.created_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>
    </div>
  );
}