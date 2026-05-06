import { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Circle, Popup, Marker, CircleMarker, Polyline, useMapEvents, useMap } from "react-leaflet";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { ArrowLeft, Plus, X, MapPin, Filter } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import WalkSpotPanel from "@/components/map/WalkSpotPanel";
import { SPORT_TYPES as SPORT_TYPES_CONST, OBEISSANCE_TYPES as OBEISSANCE_TYPES_CONST } from "@/components/lib/activityTypeConstants";
import { useLocation } from "@/components/location/LocationContext";
import { MapLocationBanner, MyLocationButton } from "@/components/location/LocationPermissionModals";

const TEST_LOCATION = { lat: 45.7272, lng: 1.7194 };
const spotCache = new Map();

function makeIcon(emoji, size = 32) {
  return L.divIcon({
    html: `<div style="font-size:${size}px;line-height:1;text-align:center;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.35))">${emoji}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

const WALK_SPOT_COLORS = {
  forest:    { color: "#15803d", fill: "#22c55e" },
  park:      { color: "#166534", fill: "#4ade80" },
  dog_park:  { color: "#b45309", fill: "#f59e0b" },
  garden:    { color: "#065f46", fill: "#34d399" },
  grassland: { color: "#3f6212", fill: "#a3e635" },
  heath:     { color: "#92400e", fill: "#d97706" },
  water:     { color: "#0e7490", fill: "#22d3ee" },
  mixed:     { color: "#4f46e5", fill: "#818cf8" },
};

const WALK_SPOT_EMOJIS = {
  forest: "🌲", park: "🌳", dog_park: "🐕",
  garden: "🌳", grassland: "🌿", heath: "🌾",
  water: "💧", mixed: "📍",
};

const COMMUNITY_SPOT_TYPES = [
  { key: "meetup",    label: "Rencontre",          emoji: "🐕" },
  { key: "walk",      label: "Spot promenade",      emoji: "🌳" },
  { key: "bar",       label: "Bar dog friendly",    emoji: "🍺" },
  { key: "hotel",     label: "Hôtel dog friendly",  emoji: "🏨" },
  { key: "beach",     label: "Plage autorisée",      emoji: "🏖" },
  { key: "forbidden", label: "Lieu interdit",        emoji: "🚫" },
  { key: "zone",      label: "Zone canine",          emoji: "📍" },
];

function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center[0], center[1]]);
  return null;
}

function MapMoveHandler({ onMapMove }) {
  const map = useMap();
  useMapEvents({
    moveend() {
      const c = map.getCenter();
      onMapMove({ lat: c.lat, lng: c.lng });
    },
  });
  return null;
}

function MapClickHandler({ mode, onMapClick }) {
  useMapEvents({
    click(e) {
      if (mode !== "normal") onMapClick(e.latlng, mode);
    },
  });
  return null;
}

function CreateSpotModal({ spotType, onConfirm, onCancel }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40">
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-5 pb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{spotType.emoji}</span>
          <h3 className="font-bold text-stone-800">{spotType.label}</h3>
        </div>
        <input
          type="text" placeholder="Nom du spot..."
          value={title} onChange={e => setTitle(e.target.value)}
          className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:border-teal-400"
        />
        <textarea
          placeholder="Description (optionnel)..."
          value={desc} onChange={e => setDesc(e.target.value)}
          rows={2}
          className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm mb-4 resize-none focus:outline-none focus:border-teal-400"
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold text-stone-600">Annuler</button>
          <button
            onClick={async () => {
              if (!title.trim()) return;
              setSaving(true);
              await onConfirm({ title: title.trim(), description: desc.trim() });
              setSaving(false);
            }}
            disabled={!title.trim() || saving}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
          >
            {saving ? "Enregistrement..." : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterPanel({ filters, onChange, onClose }) {
  return (
    <div className="absolute bottom-24 left-4 right-4 bg-white rounded-2xl shadow-2xl z-[1100] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-stone-800">🔍 Filtres</h3>
        <button onClick={onClose}><X className="w-4 h-4 text-stone-500" /></button>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-stone-500 mb-2">Afficher</p>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "walkSpots", label: "🌲 Spots promenade" },
              { key: "communitySpots", label: "📍 Communautaires" },
              { key: "announcements", label: "🐕 Annonces" },
              { key: "nearbyUsers", label: "👥 Chiens proches" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onChange({ ...filters, [key]: !filters[key] })}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  filters[key] ? "bg-teal-500 text-white border-teal-500" : "bg-white text-stone-600 border-stone-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-stone-500 mb-2">Activité canine</p>
          <div className="flex gap-2">
            {[
              { v: "low", l: "Faible" },
              { v: "medium", l: "Moyenne" },
              { v: "high", l: "Élevée" },
            ].map(({ v, l }) => (
              <button
                key={v}
                onClick={() => onChange({ ...filters, activityFilter: filters.activityFilter === v ? null : v })}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  filters.activityFilter === v ? "bg-teal-500 text-white border-teal-500" : "bg-white text-stone-600 border-stone-200"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendPanel({ onClose }) {
  return (
    <div className="absolute bottom-24 left-4 right-4 bg-white rounded-2xl shadow-2xl z-[1100] p-4 max-h-72 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-stone-800">📖 Légende</h3>
        <button onClick={onClose}><X className="w-4 h-4 text-stone-500" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        {[
          ["🟢", "#22c55e", "Forêt"], ["🟢", "#4ade80", "Parc"],
          ["🟡", "#f59e0b", "Parc à chiens"], ["🔵", "#22d3ee", "Eau"],
          ["🟢", "#4CAF87", "🐾 Balade"], ["🟠", "#f97316", "🏃 Sport"],
          ["🟣", "#a855f7", "🎯 Obéissance"], ["🔵", "#14b8a6", "Votre position"],
        ].map(([emoji, color, label]) => (
          <div key={label} className="flex items-center gap-2">
            {color
              ? <span style={{ width: 12, height: 12, borderRadius: "50%", background: color, display: "inline-block", border: "1.5px solid rgba(0,0,0,0.2)", flexShrink: 0 }} />
              : <span>{emoji}</span>
            }
            <span className="text-stone-600">{label}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-stone-100 pt-2">
        <p className="text-xs font-semibold text-stone-400 mb-1">Activité canine</p>
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-400 inline-block" /><span>Faible</span></div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /><span>Moyenne</span></div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /><span>Élevée</span></div>
        </div>
      </div>
    </div>
  );
}

function AddSpotMenu({ onSelect, onClose }) {
  return (
    <div className="absolute bottom-24 left-4 right-4 bg-white rounded-2xl shadow-2xl z-[1100] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-stone-800">Ajouter un spot</h3>
        <button onClick={onClose}><X className="w-4 h-4 text-stone-500" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {COMMUNITY_SPOT_TYPES.map(s => (
          <button key={s.key} onClick={() => onSelect(s)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors text-left">
            <span className="text-xl">{s.emoji}</span>
            <span className="text-xs font-medium text-stone-700">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CarteFullscreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { permissionStatus, userLocation: gpsLocation, requestLocation } = useLocation();

  const urlLat = parseFloat(searchParams.get("lat"));
  const urlLng = parseFloat(searchParams.get("lng"));
  const urlZoom = parseInt(searchParams.get("zoom")) || 13;
  const initCenter = (urlLat && urlLng) ? { lat: urlLat, lng: urlLng } : TEST_LOCATION;

  const rawRoute = searchParams.get("route");
  const importedRoute = rawRoute ? (() => { try { return JSON.parse(decodeURIComponent(rawRoute)); } catch { return []; } })() : [];

  const { user: currentUser } = useUserProfile();
  const SPORT_TYPES_MAP = SPORT_TYPES_CONST;
  const OBEISSANCE_TYPES_MAP = OBEISSANCE_TYPES_CONST;

  const getActivityMarkerColor = (act) => {
    if (OBEISSANCE_TYPES_MAP.includes(act.type)) return { color: "#7c3aed", fill: "#a855f7" };
    return { color: "#c2410c", fill: "#f97316" };
  };

  const [userLocation, setUserLocation] = useState(initCenter);
  const [userProfile, setUserProfile] = useState(null);
  const [walkSpots, setWalkSpots] = useState([]);
  const [communitySpots, setCommunitySpots] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [activities, setActivities] = useState([]);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [selectedWalkSpot, setSelectedWalkSpot] = useState(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [addingSpotType, setAddingSpotType] = useState(null);
  const [pendingLatlng, setPendingLatlng] = useState(null);
  const [mapMode, setMapMode] = useState("normal");
  const [loadingOsm, setLoadingOsm] = useState(false);
  const [osmLoaded, setOsmLoaded] = useState(false);
  const [mapCenter, setMapCenter] = useState(initCenter);
  const lastLoadedCenter = useRef(null);

  const [filters, setFilters] = useState({
    walkSpots: true,
    communitySpots: true,
    announcements: true,
    nearbyUsers: true,
    activityFilter: null,
  });

  useEffect(() => {
    const init = async () => {
      const [anns, comSpots, acts] = await Promise.all([
        base44.entities.MeetupAnnouncement.filter({ status: "open" }, "-created_date", 30).catch(() => []),
        base44.entities.MapSpot.list("-created_date", 80).catch(() => []),
        base44.entities.Activity.filter({ status: "open" }, "-created_date", 30).catch(() => []),
      ]);
      setAnnouncements(anns);
      setCommunitySpots(comSpots);
      setActivities(acts);
    };
    init();

    // Subscribe temps réel sur les activités
    const unsub = base44.entities.Activity.subscribe((event) => {
      if (event.type === "create" && event.data?.status === "open") {
        setActivities(prev => [event.data, ...prev]);
      } else if (event.type === "update") {
        setActivities(prev => prev.map(a => a.id === event.id ? event.data : a).filter(a => a.status === "open"));
      } else if (event.type === "delete") {
        setActivities(prev => prev.filter(a => a.id !== event.id));
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const [profiles, allProfiles, dbWalkSpots] = await Promise.all([
        base44.entities.UserProfile.filter({ created_by: currentUser.email }, "-created_date", 1).catch(() => []),
        base44.entities.UserProfile.filter({ latitude: { $ne: null } }, "-updated_date", 100).catch(() => []),
        base44.entities.WalkSpot.list("-walk_count", 100).catch(() => []),
      ]);
      setUserProfile(profiles[0] || null);
      setNearbyUsers(allProfiles.filter(p => {
        if (!p.latitude || !p.longitude || p.created_by === currentUser.email) return false;
        const dlat = (p.latitude - userLocation.lat) * 111;
        const dlng = (p.longitude - userLocation.lng) * 111 * Math.cos(userLocation.lat * Math.PI / 180);
        return Math.sqrt(dlat * dlat + dlng * dlng) <= 25;
      }));
      if (dbWalkSpots.length > 0) {
        setWalkSpots(dbWalkSpots);
        setOsmLoaded(true);
      }
    })();
  }, [currentUser?.email]);

  useEffect(() => {
    if (gpsLocation) setUserLocation(gpsLocation);
  }, [gpsLocation]);

  const loadOsmSpots = useCallback(async (center = null) => {
    if (loadingOsm) return;
    const loc = center || userLocation;
    const cacheKey = `${Math.round(loc.lat * 20) / 20}_${Math.round(loc.lng * 20) / 20}`;
    if (spotCache.has(cacheKey)) {
      const cached = spotCache.get(cacheKey);
      setWalkSpots(prev => {
        const existingIds = new Set(prev.map(s => s.osm_id || s.id).filter(Boolean));
        const newSpots = cached.filter(s => !existingIds.has(s.osm_id || s.id));
        return newSpots.length > 0 ? [...prev, ...newSpots] : prev;
      });
      setOsmLoaded(true);
      return;
    }
    if (lastLoadedCenter.current) {
      const dlat = (loc.lat - lastLoadedCenter.current.lat) * 111;
      const dlng = (loc.lng - lastLoadedCenter.current.lng) * 111;
      const distKm = Math.sqrt(dlat * dlat + dlng * dlng);
      if (distKm < 3) return;
    }
    setLoadingOsm(true);
    lastLoadedCenter.current = loc;
    const resp = await base44.functions.invoke("osmWalkSpots", {
      lat: loc.lat, lng: loc.lng, radius_km: 8,
    }).catch(() => null);
    const spots = resp?.data?.spots || [];
    if (spots.length > 0) {
      spotCache.set(cacheKey, spots);
      setWalkSpots(prev => {
        const existingIds = new Set(prev.map(s => s.osm_id || s.id).filter(Boolean));
        return [...prev, ...spots.filter(s => !existingIds.has(s.osm_id || s.id))];
      });
    }
    setOsmLoaded(true);
    setLoadingOsm(false);
  }, [userLocation, loadingOsm]);

  const handleMapMove = useCallback((newCenter) => {
    setMapCenter(newCenter);
    loadOsmSpots(newCenter);
  }, [loadOsmSpots]);

  const handleMapClick = useCallback((latlng, mode) => {
    if (mode === "add_spot" && addingSpotType) setPendingLatlng(latlng);
    else if (mode === "set_location") {
      setUserLocation({ lat: latlng.lat, lng: latlng.lng });
      setMapMode("normal");
    }
  }, [addingSpotType]);

  const handleConfirmSpot = async ({ title, description }) => {
    const newSpot = await base44.entities.MapSpot.create({
      type: addingSpotType.key, title, description,
      latitude: pendingLatlng.lat, longitude: pendingLatlng.lng,
      author_name: userProfile?.pseudo || currentUser?.full_name || "Anonyme",
      zoneTag: userProfile?.zoneTag || "eymoutiers",
    });
    setCommunitySpots(prev => [...prev, newSpot]);
    setAddingSpotType(null);
    setPendingLatlng(null);
    setMapMode("normal");
  };

  const handleSelectWalkSpot = (spot) => {
    setSelectedWalkSpot(spot);
    if (spot.id) {
      base44.entities.WalkSpot.update(spot.id, { walk_count: (spot.walk_count || 0) + 1 }).catch(() => {});
    }
  };

  const MAX_KM = 25;
  const nearbyWalkSpots = walkSpots.filter(s => {
    const dlat = (s.latitude - userLocation.lat) * 111;
    const dlng = (s.longitude - userLocation.lng) * 111 * Math.cos(userLocation.lat * Math.PI / 180);
    return Math.sqrt(dlat * dlat + dlng * dlng) <= MAX_KM;
  });

  const visibleWalkSpots = filters.walkSpots
    ? nearbyWalkSpots.filter(s => !filters.activityFilter || s.activity_level === filters.activityFilter)
    : [];
  const visibleCommunity = filters.communitySpots ? communitySpots : [];
  const visibleAnns = filters.announcements ? announcements.filter(a => a.latitude && a.longitude) : [];
  const visibleActivities = filters.announcements ? activities.filter(a => a.latitude && a.longitude) : [];
  const visibleUsers = filters.nearbyUsers ? nearbyUsers : [];

  const activeBanner = mapMode === "set_location" || (mapMode === "add_spot" && addingSpotType && !pendingLatlng);
  const center = [userLocation.lat, userLocation.lng];
  const activeFilterCount = (filters.activityFilter ? 1 : 0) +
    (!filters.walkSpots || !filters.communitySpots || !filters.announcements || !filters.nearbyUsers ? 1 : 0);
  const locationGranted = permissionStatus === "granted";

  return (
    <div className="fixed inset-0 z-50 bg-stone-900 flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-sm border-b border-stone-100">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-stone-700 font-semibold py-2 px-2 -ml-2 active:opacity-70 transition-opacity pointer-events-auto">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-black">Ziga Link Map</span>
        </button>
        <div className="flex items-center gap-2">
          {!osmLoaded ? (
            <button onClick={loadOsmSpots} disabled={loadingOsm} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-teal-500 text-white disabled:opacity-60">
              {loadingOsm
                ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Chargement OSM...</>
                : <>🌲 Charger spots</>
              }
            </button>
          ) : (
            <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-full border border-teal-200">
              🌲 {nearbyWalkSpots.length} spots
            </span>
          )}
          <button
            onClick={() => {
              setMapMode(m => m === "set_location" ? "normal" : "set_location");
              setShowAddMenu(false); setShowLegend(false); setShowFilters(false);
            }}
            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-full border transition-colors ${
              mapMode === "set_location" ? "bg-teal-600 text-white border-teal-600" : "bg-white text-stone-600 border-stone-200"
            }`}
          >
            <MapPin className="w-3 h-3" />
          </button>
        </div>
      </div>

      {activeBanner && (
        <div className="absolute top-14 left-4 right-4 z-[1000] bg-teal-600 text-white rounded-xl px-4 py-2.5 flex items-center justify-between shadow-lg">
          <span className="text-sm font-medium">
            {mapMode === "set_location" ? "📍 Tapez pour définir votre position" : `${addingSpotType?.emoji} Tapez sur la carte pour placer le spot`}
          </span>
          <button onClick={() => { setMapMode("normal"); setAddingSpotType(null); }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex-1 pt-12">
        <MapContainer center={center} zoom={urlZoom} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
          <MapRecenter center={center} />
          <MapMoveHandler onMapMove={handleMapMove} />
          <MapClickHandler mode={mapMode} onMapClick={handleMapClick} />



          {importedRoute.length > 1 && (
            <>
              <Polyline positions={importedRoute} pathOptions={{ color: "#f97316", weight: 4, opacity: 0.85, dashArray: "8, 4" }} />
              <CircleMarker center={importedRoute[0]} radius={8} pathOptions={{ color: "#16a34a", fillColor: "#4ade80", fillOpacity: 1, weight: 2 }}>
                <Popup><div className="text-xs font-bold">🟢 Départ</div></Popup>
              </CircleMarker>
              <CircleMarker center={importedRoute[importedRoute.length - 1]} radius={8} pathOptions={{ color: "#dc2626", fillColor: "#f87171", fillOpacity: 1, weight: 2 }}>
                <Popup><div className="text-xs font-bold">🔴 Arrivée</div></Popup>
              </CircleMarker>
            </>
          )}

          {visibleWalkSpots.map((spot, i) => {
            const colors = WALK_SPOT_COLORS[spot.spot_type] || WALK_SPOT_COLORS.mixed;
            const emoji = WALK_SPOT_EMOJIS[spot.spot_type] || "📍";
            const radius = spot.area_m2 ? Math.min(Math.max(Math.sqrt(spot.area_m2 / Math.PI) / 12, 8), 28) : 12;
            return (
              <CircleMarker
                key={spot.id || spot.osm_id || i}
                center={[spot.latitude, spot.longitude]}
                radius={radius}
                pathOptions={{ color: colors.color, fillColor: colors.fill, fillOpacity: 0.6, weight: 2 }}
                eventHandlers={{ click: () => handleSelectWalkSpot(spot) }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold">{emoji} {spot.name}</p>
                    <p className="text-stone-400 text-xs">{spot.circuits?.length || 0} circuit(s) · {spot.path_count || 0} chemin(s)</p>
                    {spot.area_m2 && <p className="text-stone-400 text-xs">{(spot.area_m2 / 10000).toFixed(1)} ha</p>}
                    <button onClick={() => handleSelectWalkSpot(spot)} className="text-teal-600 font-semibold text-xs mt-1 block">Voir les circuits →</button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {visibleCommunity.map(spot => {
            const spotDef = COMMUNITY_SPOT_TYPES.find(s => s.key === spot.type);
            return (
              <Marker key={`cs-${spot.id}`} position={[spot.latitude, spot.longitude]} icon={makeIcon(spotDef?.emoji || "📍", 28)}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold">{spot.title}</p>
                    {spot.description && <p className="text-stone-500 text-xs">{spot.description}</p>}
                    <p className="text-stone-400 text-xs mt-1">Par {spot.author_name || "Anonyme"}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {pendingLatlng && addingSpotType && (
            <Marker position={[pendingLatlng.lat, pendingLatlng.lng]} icon={makeIcon(addingSpotType.emoji, 32)} />
          )}

          {visibleAnns.map(ann => (
            <CircleMarker key={`ann-${ann.id}`} center={[ann.latitude, ann.longitude]} radius={14} pathOptions={{ color: "#15803d", fillColor: "#4CAF87", fillOpacity: 0.75, weight: 2 }}>
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">🐾 {ann.dog_name || "Chien"}</p>
                  <p className="text-stone-400 text-xs">{ann.title}</p>
                  <Link to={`${createPageUrl("AnnouncementDetail")}?id=${ann.id}`} className="text-teal-600 font-semibold text-xs">Voir →</Link>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {visibleActivities.map(act => {
            const colors = getActivityMarkerColor(act);
            const isObeissance = OBEISSANCE_TYPES_MAP.includes(act.type);
            const emoji = isObeissance ? "🎯" : "🏃";
            return (
              <CircleMarker key={`act-${act.id}`} center={[act.latitude, act.longitude]} radius={14} pathOptions={{ color: colors.color, fillColor: colors.fill, fillOpacity: 0.75, weight: 2 }}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold">{emoji} {act.title}</p>
                    <p className="text-stone-400 text-xs">{act.city}</p>
                    <Link to={`${createPageUrl("ActivityDetail")}?id=${act.id}`} style={{ color: colors.fill }} className="font-semibold text-xs">Voir →</Link>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {visibleUsers.map(profile => (
<CircleMarker key={`u-${profile.id}`} center={[profile.latitude, profile.longitude]} radius={35} pathOptions={{ color: "#1d4ed8", fillColor: "#60a5fa", fillOpacity: 0.15, weight: 1 }}>
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">🐕 {profile.pseudo || "Utilisateur"}</p>
                  <p className="text-stone-400 text-xs">{profile.city}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {!locationGranted && <MapLocationBanner onRequest={requestLocation} />}

      <div className="absolute bottom-6 right-4 z-[1000] flex flex-col gap-3">
        <MyLocationButton onPress={requestLocation} />
        <button onClick={() => { setShowLegend(!showLegend); setShowFilters(false); setShowAddMenu(false); }} className="w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center border border-stone-200 text-lg">
          📖
        </button>
        <button
          onClick={() => { setShowFilters(!showFilters); setShowLegend(false); setShowAddMenu(false); }}
          className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center border relative ${showFilters ? "bg-teal-500 border-teal-500" : "bg-white border-stone-200"}`}
        >
          <Filter className={`w-4 h-4 ${showFilters ? "text-white" : "text-stone-600"}`} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-white text-[9px] font-black flex items-center justify-center">{activeFilterCount}</span>
          )}
        </button>
        <button
          onClick={() => { setShowAddMenu(!showAddMenu); setShowLegend(false); setShowFilters(false); }}
          className="w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #FF7A59, #e8634a)" }}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="absolute bottom-6 left-4 z-[1000] flex flex-col gap-1.5">
        {visibleWalkSpots.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold text-teal-700 shadow border border-teal-100">
            🌲 {visibleWalkSpots.length} spot{visibleWalkSpots.length > 1 ? "s" : ""} promenade
          </div>
        )}
        {visibleAnns.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold text-teal-700 shadow border border-teal-100">
            🐾 {visibleAnns.length} balade{visibleAnns.length > 1 ? "s" : ""}
          </div>
        )}
        {visibleActivities.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold text-orange-700 shadow border border-orange-100">
            🏃 {visibleActivities.length} activité{visibleActivities.length > 1 ? "s" : ""}
          </div>
        )}
        {visibleUsers.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold text-blue-700 shadow border border-blue-100">
            👥 {visibleUsers.length} chien{visibleUsers.length > 1 ? "s" : ""} proche{visibleUsers.length > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {showAddMenu && (
        <AddSpotMenu onSelect={t => { setAddingSpotType(t); setMapMode("add_spot"); setShowAddMenu(false); }} onClose={() => setShowAddMenu(false)} />
      )}
      {showLegend && <LegendPanel onClose={() => setShowLegend(false)} />}
      {showFilters && <FilterPanel filters={filters} onChange={setFilters} onClose={() => setShowFilters(false)} />}

      {pendingLatlng && addingSpotType && (
        <CreateSpotModal
          spotType={addingSpotType}
          onConfirm={handleConfirmSpot}
          onCancel={() => { setAddingSpotType(null); setPendingLatlng(null); setMapMode("normal"); }}
        />
      )}

      {selectedWalkSpot && <WalkSpotPanel spot={selectedWalkSpot} onClose={() => setSelectedWalkSpot(null)} />}
    </div>
  );
}