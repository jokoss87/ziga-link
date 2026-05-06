import { X } from "lucide-react";

const DIFFICULTY_COLOR = { facile: "text-green-600 bg-green-50", modéré: "text-amber-600 bg-amber-50", difficile: "text-red-600 bg-red-50" };
const TYPE_INFO = {
  forest:    { emoji: "🌲", label: "Forêt" },
  park:      { emoji: "🌳", label: "Parc" },
  dog_park:  { emoji: "🐕", label: "Parc à chiens" },
  garden:    { emoji: "🌳", label: "Jardin" },
  grassland: { emoji: "🌿", label: "Prairie" },
  heath:     { emoji: "🌾", label: "Lande" },
  water:     { emoji: "💧", label: "Plan d'eau" },
  mixed:     { emoji: "📍", label: "Zone naturelle" },
};
const ACTIVITY_INFO = {
  low:    { label: "Faible activité", color: "text-stone-500 bg-stone-100" },
  medium: { label: "Activité moyenne", color: "text-amber-600 bg-amber-100" },
  high:   { label: "Zone très fréquentée", color: "text-green-700 bg-green-100" },
};

export default function WalkSpotPanel({ spot, onClose }) {
  if (!spot) return null;
  const info = TYPE_INFO[spot.spot_type] || TYPE_INFO.mixed;
  const activity = ACTIVITY_INFO[spot.activity_level] || ACTIVITY_INFO.low;
  const circuits = spot.circuits || [];
  const areaHa = spot.area_m2 ? (spot.area_m2 / 10000).toFixed(1) : null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1100] bg-white rounded-t-3xl shadow-2xl max-h-[70vh] overflow-y-auto">
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 bg-stone-200 rounded-full" />
      </div>

      <div className="px-5 pb-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{info.emoji}</div>
            <div>
              <h2 className="font-black text-stone-800 text-lg leading-tight">{spot.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">{info.label}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${activity.color}`}>{activity.label}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-stone-100 flex-shrink-0">
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {areaHa && (
            <div className="bg-stone-50 rounded-2xl p-3 text-center">
              <div className="text-xs text-stone-400 mb-1">Surface</div>
              <div className="font-black text-stone-700 text-base">{areaHa} ha</div>
            </div>
          )}
          <div className="bg-stone-50 rounded-2xl p-3 text-center">
            <div className="text-xs text-stone-400 mb-1">Chemins</div>
            <div className="font-black text-stone-700 text-base">{spot.path_count || 0}</div>
          </div>
          <div className="bg-stone-50 rounded-2xl p-3 text-center">
            <div className="text-xs text-stone-400 mb-1">Balades</div>
            <div className="font-black text-stone-700 text-base">{spot.walk_count || 0}</div>
          </div>
        </div>

        {/* Badges info */}
        <div className="flex gap-2 flex-wrap mb-5">
          {spot.has_water && (
            <span className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              💧 Point d'eau
            </span>
          )}
          {spot.spot_type === 'dog_park' && (
            <span className="flex items-center gap-1 text-xs font-semibold text-teal-600 bg-teal-50 px-3 py-1 rounded-full">
              🐕 Parc à chiens officiel
            </span>
          )}
          {(spot.area_m2 || 0) > 50000 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
              🌲 Grande zone
            </span>
          )}
        </div>

        {/* Circuits */}
        {circuits.length > 0 ? (
          <div>
            <h3 className="font-black text-stone-700 text-sm mb-3">🥾 Circuits disponibles</h3>
            <div className="space-y-2">
              {circuits.map((c, i) => (
                <div key={i} className="bg-gradient-to-r from-stone-50 to-white border border-stone-100 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-stone-800 text-sm">{c.label}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${DIFFICULTY_COLOR[c.difficulty] || "text-stone-500 bg-stone-100"}`}>
                      {c.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-stone-500">
                    <span>📏 {c.distance_km} km</span>
                    <span>⏱ {c.duration_min} min</span>
                    <span className="capitalize">{TYPE_INFO[c.surface]?.emoji || "🌿"} {TYPE_INFO[c.surface]?.label || c.surface}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-stone-400 text-sm">
            <div className="text-2xl mb-1">🥾</div>
            Pas encore de circuit généré pour ce spot
          </div>
        )}
      </div>
    </div>
  );
}