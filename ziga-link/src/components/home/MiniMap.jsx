import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Circle, Popup } from "react-leaflet";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Maximize2, Map, List, Dog, MessageCircle, Calendar, Expand } from "lucide-react";
import { useOwnerPhoto } from "@/components/useOwnerPhoto";
import UserActionSheet from "@/components/home/UserActionSheet";
import { base44 } from "@/api/base44Client";
import "leaflet/dist/leaflet.css";

import { SPORT_TYPES, OBEISSANCE_TYPES } from "@/components/lib/activityTypeConstants";

function getMarkerColor(item) {
  if (item._kind === "activity") {
    if (OBEISSANCE_TYPES.includes(item.type)) return { color: "#7c3aed", fill: "#a855f7" }; // violet
    return { color: "#c2410c", fill: "#f97316" }; // orange sport
  }
  return { color: "#15803d", fill: "#4CAF87" }; // teal balade
}

function getMarkerEmoji(item) {
  if (item._kind === "activity") {
    if (OBEISSANCE_TYPES.includes(item.type)) return "🎯";
    return "🏃";
  }
  return "🐾";
}

function AnnListRow({ ann, onAction }) {
  const ownerPhoto = useOwnerPhoto(ann.created_by, ann.owner_photo || ann.organizer_photo);
  const colors = getMarkerColor(ann);

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors">
      <div className="w-11 h-11 rounded-full overflow-hidden bg-amber-100 flex items-center justify-center flex-shrink-0 border-2 border-white shadow-sm">
        {ownerPhoto ? (
          <img src={ownerPhoto} alt="" className="w-full h-full object-cover" />
        ) : (
          <Dog className="w-5 h-5 text-amber-500" />
        )}
      </div>
      <Link
        to={ann._kind === "activity"
          ? `${createPageUrl("ActivityDetail")}?id=${ann.id}`
          : `${createPageUrl("AnnouncementDetail")}?id=${ann.id}`
        }
        className="flex-1 min-w-0"
      >
        <div className="font-semibold text-sm text-stone-800 truncate">
          {ann.dog_name || ann.title || "Activité"}
          {(ann.owner_name || ann.organizer_name) && (
            <span className="font-normal text-stone-400"> · {ann.owner_name || ann.organizer_name}</span>
          )}
        </div>
        <div className="text-xs text-stone-400 truncate">{ann.title}</div>
        {ann.city && (
          <div className="text-xs font-medium" style={{ color: colors.fill }}>📍 {ann.city}</div>
        )}
      </Link>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => onAction(ann)}
          className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center hover:bg-orange-100 transition-colors"
        >
          <Calendar className="w-4 h-4 text-orange-500" />
        </button>
        <button
          onClick={() => onAction(ann)}
          className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center hover:bg-teal-100 transition-colors"
        >
          <MessageCircle className="w-4 h-4 text-teal-500" />
        </button>
      </div>
    </div>
  );
}

export default function MiniMap({ announcements, currentUser }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState("map");
  const [selectedAnn, setSelectedAnn] = useState(null);
  const [activities, setActivities] = useState([]);
  const [nearbyUsers, setNearbyUsers] = useState([]);

  // Charger les activités et s'abonner aux mises à jour temps réel
  useEffect(() => {
    base44.entities.Activity.filter({ status: "open" }, "-created_date", 20).then(acts => {
      setActivities(acts.map(a => ({ ...a, _kind: "activity" })));
    }).catch(() => {});

    const unsub = base44.entities.Activity.subscribe((event) => {
      if (event.type === "create" && event.data?.status === "open") {
        setActivities(prev => [{ ...event.data, _kind: "activity" }, ...prev]);
      } else if (event.type === "update") {
        setActivities(prev => prev.map(a => a.id === event.id
          ? { ...event.data, _kind: "activity" }
          : a
        ).filter(a => a.status === "open"));
      } else if (event.type === "delete") {
        setActivities(prev => prev.filter(a => a.id !== event.id));
      }
    });
    return () => unsub();
  }, []);

  // Charger les utilisateurs proches géolocalisés
  useEffect(() => {
    if (!currentUser) return;
    base44.entities.UserProfile.filter({ latitude: { $ne: null } }, "-updated_date", 100)
      .then(profiles => {
        setNearbyUsers(profiles.filter(p => p.latitude && p.longitude && p.created_by !== currentUser.email));
      })
      .catch(() => {});
  }, [currentUser?.email]);

  // Fusionner annonces + activités avec tag _kind
  const allItems = [
    ...announcements.map(a => ({ ...a, _kind: "balade" })),
    ...activities,
  ];

  const withLocation = allItems.filter(a => a.latitude && a.longitude);
  const center = withLocation.length > 0
    ? [withLocation[0].latitude, withLocation[0].longitude]
    : [48.8566, 2.3522];
  const mapHeight = expanded ? 300 : 180;

  return (
    <section className="px-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-black text-stone-800 text-base">🗺️ Carte canine</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-stone-100 rounded-full p-0.5">
            <button
              onClick={() => setView("map")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                view === "map" ? "bg-white shadow text-stone-700" : "text-stone-400"
              }`}
            >
              <Map className="w-3 h-3" /> Carte
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                view === "list" ? "bg-white shadow text-stone-700" : "text-stone-400"
              }`}
            >
              <List className="w-3 h-3" /> Liste
            </button>
          </div>

          {view === "map" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 text-xs font-bold text-stone-500 bg-white border border-stone-200 px-3 py-1.5 rounded-full hover:border-stone-300 transition-colors"
              >
                <Maximize2 className="w-3 h-3" /> {expanded ? "Réduire" : "Agrandir"}
              </button>
              <button
                onClick={() => navigate(createPageUrl("CarteFullscreen"))}
                className="flex items-center gap-1.5 text-xs font-bold text-teal-600 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-full hover:bg-teal-100 transition-colors"
              >
                <Expand className="w-3 h-3" /> Plein écran
              </button>
            </div>
          )}
        </div>
      </div>

      {view === "map" && (
        <div className="rounded-3xl overflow-hidden border border-stone-200 shadow-sm" style={{ height: mapHeight }}>
          {withLocation.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center bg-stone-100 gap-2">
              <div className="text-3xl">🗺️</div>
              <p className="text-stone-400 text-xs font-medium text-center px-4">
                Activez la localisation lors de la création d'annonces pour apparaître sur la carte
              </p>
            </div>
          ) : (
            <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} zoomAnimation={false}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
              {withLocation.map(item => {
                const fuzzyLat = item.latitude + (Math.random() - 0.5) * 0.005;
                const fuzzyLng = item.longitude + (Math.random() - 0.5) * 0.005;
                const colors = getMarkerColor(item);
                const emoji = getMarkerEmoji(item);
                return (
                  <Circle
                    key={item.id}
                    center={[fuzzyLat, fuzzyLng]}
                    radius={300}
                    pathOptions={{ color: colors.color, fillColor: colors.fill, fillOpacity: 0.5, weight: 2 }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-bold">{emoji} {item.dog_name || item.title || "Activité"}</p>
                        <Link
                          to={item._kind === "activity"
                            ? `${createPageUrl("ActivityDetail")}?id=${item.id}`
                            : `${createPageUrl("AnnouncementDetail")}?id=${item.id}`
                          }
                          className="font-medium text-xs"
                          style={{ color: colors.fill }}
                        >
                          Voir →
                        </Link>
                      </div>
                    </Popup>
                  </Circle>
                );
              })}
              {nearbyUsers.map(profile => (
                <Circle
                  key={`u-${profile.id}`}
                  center={[profile.latitude, profile.longitude]}
                  radius={500}
                  pathOptions={{ color: "#1d4ed8", fillColor: "#60a5fa", fillOpacity: 0.15, weight: 1.5 }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold">🐕 {profile.pseudo || "Utilisateur"}</p>
                      {profile.city && <p className="text-stone-400 text-xs">{profile.city}</p>}
                    </div>
                  </Popup>
                </Circle>
              ))}
            </MapContainer>
          )}
        </div>
      )}

      {/* Légende rapide */}
      {view === "map" && withLocation.length > 0 && (
        <div className="flex gap-3 mt-2 px-1">
          <div className="flex items-center gap-1 text-xs text-stone-500">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: "#4CAF87" }} /> Balade
          </div>
          <div className="flex items-center gap-1 text-xs text-stone-500">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: "#f97316" }} /> Sport
          </div>
          <div className="flex items-center gap-1 text-xs text-stone-500">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: "#a855f7" }} /> Obéissance
          </div>
          {nearbyUsers.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-stone-500">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: "#60a5fa" }} /> Chiens proches
            </div>
          )}
        </div>
      )}

      {view === "list" && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          {allItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <div className="text-3xl">🐶</div>
              <p className="text-stone-400 text-xs font-medium text-center px-4">
                Aucune annonce autour de vous pour le moment
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {allItems.slice(0, 10).map(item => (
                <AnnListRow key={`${item._kind}-${item.id}`} ann={item} onAction={setSelectedAnn} />
              ))}
              {allItems.length > 10 && (
                <div className="px-4 py-3 text-center">
                  <Link to={createPageUrl("Matching")} className="text-xs font-bold text-teal-600">
                    Voir toutes les annonces →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedAnn && (
        <UserActionSheet
          announcement={selectedAnn}
          onClose={() => setSelectedAnn(null)}
        />
      )}
    </section>
  );
}