import { useState, useEffect } from "react";
import { useAsync } from "@/hooks/useAsync";
import { base44 } from "@/api/base44Client";
import { Map, Clock, Footprints, Navigation } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { parseUTC } from "@/components/lib/dateUtils";

export default function WalkRouteGallery({ dogId }) {
  const [routes, setRoutes] = useState([]);
  const { status, run } = useAsync();

  useEffect(() => {
    if (!dogId) return;
    run(async () => {
      const r = await base44.entities.WalkRoute.filter({ dog_id: dogId }, "-created_date", 5);
      setRoutes(r);
    });
  }, [dogId]);

  if (status === "loading") return (
    <div className="flex justify-center py-4">
      <div className="animate-spin rounded-full h-5 w-5 border-2 border-teal-400 border-t-transparent" />
    </div>
  );

  if (routes.length === 0 && status !== "loading") return (
    <div className="bg-white rounded-2xl border border-stone-100 p-5 text-center">
      <Map className="w-8 h-8 text-stone-200 mx-auto mb-2" />
      <p className="text-sm text-stone-400">Aucun trajet enregistré.<br />Activez le GPS dans le compteur de balade.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {routes.map(route => {
        const routeUrl = `/CarteFullscreen?route=${encodeURIComponent(JSON.stringify(route.points))}`;
        const dateStr = route.start_at ? format(parseUTC(route.start_at), "d MMM yyyy", { locale: fr }) : "—";
        return (
          <div key={route.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <a href={routeUrl} className="block bg-stone-100 h-24 relative group">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Navigation className="w-6 h-6 text-[#4CAF87] mx-auto mb-1" />
                  <span className="text-xs text-stone-500 font-medium">{route.points.length} points GPS</span>
                </div>
              </div>
              <div className="absolute inset-0 bg-[#4CAF87]/0 group-hover:bg-[#4CAF87]/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="bg-[#4CAF87] text-white text-xs font-bold px-3 py-1.5 rounded-full">Voir sur la carte →</span>
              </div>
            </a>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-bold text-stone-800">{dateStr}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-stone-400">
                    <Navigation className="w-3 h-3" /> {route.distance_km?.toFixed(2)} km
                  </span>
                  {route.steps > 0 && (
                    <span className="flex items-center gap-1 text-xs text-stone-400">
                      <Footprints className="w-3 h-3" /> {route.steps.toLocaleString("fr-FR")} pas
                    </span>
                  )}
                  {route.duration_minutes > 0 && (
                    <span className="flex items-center gap-1 text-xs text-stone-400">
                      <Clock className="w-3 h-3" /> {route.duration_minutes} min
                    </span>
                  )}
                </div>
              </div>
              <a href={routeUrl} className="text-xs font-bold text-[#4CAF87] bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-full">
                🗺️ Voir
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}