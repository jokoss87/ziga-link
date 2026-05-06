import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, Trophy } from "lucide-react";

export default function AdminMap() {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const profiles = await base44.entities.UserProfile.list("-created_date", 500);
    const cityCount = {};
    profiles.forEach(p => {
      if (p.city) {
        const c = p.city.trim();
        cityCount[c] = (cityCount[c] || 0) + 1;
      }
    });
    const sorted = Object.entries(cityCount)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);
    setCities(sorted);
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-400 border-t-transparent" /></div>;

  const top5 = cities.slice(0, 5);
  const maxCount = top5[0]?.count || 1;

  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

  return (
    <div className="space-y-6">
      {/* Top 5 */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <h3 className="font-bold text-stone-700 mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" /> Top 5 villes actives
        </h3>
        {top5.length === 0 ? (
          <p className="text-stone-400 text-sm">Aucune ville renseignée pour l'instant.</p>
        ) : (
          <div className="space-y-3">
            {top5.map((c, i) => (
              <div key={c.city} className="flex items-center gap-3">
                <div className="text-xl w-8 text-center">{medals[i]}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-stone-700">{c.city}</span>
                    <span className="text-xs font-bold text-teal-600">{c.count} utilisateur{c.count > 1 ? "s" : ""}</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(c.count / maxCount) * 100}%`, background: "linear-gradient(90deg, #4CAF87, #3d9e78)" }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toutes les villes */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <h3 className="font-bold text-stone-700 mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-teal-500" /> Toutes les villes
          <span className="ml-auto text-xs font-normal text-stone-400">{cities.length} villes</span>
        </h3>
        {cities.length === 0 ? (
          <p className="text-stone-400 text-sm">Aucune donnée de ville disponible.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {cities.map((c) => (
              <div key={c.city} className="flex items-center justify-between bg-stone-50 rounded-xl px-3 py-2">
                <span className="text-sm text-stone-700 font-medium truncate">{c.city}</span>
                <span className="text-xs font-bold text-teal-600 ml-2 flex-shrink-0">{c.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 text-sm text-teal-700">
        💡 La carte interactive nécessite une intégration GPS supplémentaire. Les données de villes proviennent des profils utilisateurs.
      </div>
    </div>
  );
}