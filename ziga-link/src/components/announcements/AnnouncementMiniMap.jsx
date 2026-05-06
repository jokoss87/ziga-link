import { useState, useEffect } from "react";
import { copyToClipboard } from "@/components/lib/clipboard";
import { MapContainer, TileLayer, Circle, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { MapPin, Expand, Copy, Check, Lock } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const meetingIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// V1 : rayon simple — 500m en ville (postalCode commence par une grande agglomération),
// 1500m en zone rurale. Peut évoluer vers géo-hashing en V2.
const getApproximationRadius = (city) => {
  if (!city) return 1500;
  // Villes de taille significative → cercle plus petit
  const urbanKeywords = ["paris", "lyon", "marseille", "bordeaux", "lille", "toulouse",
    "nantes", "limoges", "strasbourg", "rennes", "montpellier"];
  const cityLower = city.toLowerCase();
  if (urbanKeywords.some(k => cityLower.includes(k))) return 500;
  return 1500; // rural (Eymoutiers, etc.)
};

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export default function AnnouncementMiniMap({ announcement, isOwner, hasAcceptedRequest }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [showUpdatedBadge, setShowUpdatedBadge] = useState(false);

  // Dès qu'une demande est acceptée par le créateur, le participant peut voir la localisation exacte
  const canSeeExact = isOwner || hasAcceptedRequest;

  // Badge "Lieu mis à jour" — affiché si arrivée via scroll=map ET lieu changé depuis dernière visite
  useEffect(() => {
    if (!announcement?.id || searchParams.get("scroll") !== "map") return;
    if (!announcement.meeting_place_lat) return;

    const storageKey = `zigalink_ann_visit_${announcement.id}`;
    const lastVisit = localStorage.getItem(storageKey);
    const updatedAt = announcement.updated_date || announcement.created_date;
    const now = Date.now();

    if (lastVisit && updatedAt) {
      const updatedMs = new Date(updatedAt).getTime();
      const age = now - updatedMs;
      if (updatedMs > parseInt(lastVisit, 10) && age < 24 * 60 * 60 * 1000) {
        setShowUpdatedBadge(true);
      }
    }

    localStorage.setItem(storageKey, String(now));
  }, [announcement?.id, announcement?.updated_date]);

  // Position à afficher
  const hasExactMeeting = canSeeExact && announcement.meeting_place_lat && announcement.meeting_place_lng;
  const displayLat = hasExactMeeting ? announcement.meeting_place_lat : announcement.latitude;
  const displayLng = hasExactMeeting ? announcement.meeting_place_lng : announcement.longitude;

  if (!displayLat || !displayLng) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-amber-100">
        <h3 className="font-bold text-amber-900 flex items-center gap-2 mb-3">
          <MapPin className="w-5 h-5" /> Localisation
        </h3>
        <div className="h-40 rounded-xl bg-stone-100 flex items-center justify-center text-stone-400 text-sm">
          Localisation non disponible
        </div>
      </div>
    );
  }

  const center = [displayLat, displayLng];
  const radius = getApproximationRadius(announcement.city);
  const zoom = hasExactMeeting ? 16 : 13;

  const handleCopy = () => {
    const address = announcement.meeting_place_name
      ? `${announcement.meeting_place_name} (${displayLat.toFixed(5)}, ${displayLng.toFixed(5)})`
      : `${displayLat.toFixed(5)}, ${displayLng.toFixed(5)}`;
    // Fallback pour Safari iOS et navigateurs sans clipboard API
    copyToClipboard(address);
    setCopied(true);
    toast.success("Adresse copiée !");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFullscreen = () => {
    navigate(`${createPageUrl("CarteFullscreen")}?lat=${displayLat}&lng=${displayLng}&zoom=${zoom}`);
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-amber-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-amber-900 flex items-center gap-2">
          <MapPin className="w-5 h-5" /> Localisation
          {showUpdatedBadge && (
            <span className="text-[10px] font-bold bg-amber-400 text-white px-2 py-0.5 rounded-full animate-pulse">
              📍 Lieu mis à jour
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {hasExactMeeting && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors font-medium"
              title="Copier l'adresse"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copié !" : "Copier"}
            </button>
          )}
          <button
            onClick={handleFullscreen}
            className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors"
            title="Voir en plein écran"
          >
            <Expand className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="relative h-52 rounded-xl overflow-hidden border border-stone-100">
        <MapContainer
          key={`${hasExactMeeting ? "exact" : "approx"}-${displayLat}-${displayLng}`}
          center={center}
          zoom={zoom}
          scrollWheelZoom={false}
          zoomControl={false}
          attributionControl={false}
          className="h-full w-full"
          style={{ zIndex: 1 }}
        >
          <RecenterMap center={center} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {hasExactMeeting ? (
            <Marker position={center} icon={meetingIcon} />
          ) : (
            <Circle
              center={center}
              radius={radius}
              pathOptions={{
                color: "#FF7A59",
                fillColor: "#FF7A59",
                fillOpacity: 0.2,
                weight: 2,
              }}
            />
          )}
        </MapContainer>

        {/* Badge de confidentialité si approximatif */}
        {!hasExactMeeting && (
          <div className="absolute bottom-2 left-2 z-[400] flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs text-stone-500 shadow-sm">
            <Lock className="w-3 h-3" /> Zone approximative
          </div>
        )}
      </div>

      {/* Info adresse */}
      <div className="mt-3">
        {hasExactMeeting ? (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
            <MapPin className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-green-700">Point de rencontre</p>
              <p className="text-sm font-bold text-green-800">
                {announcement.meeting_place_name || `${displayLat.toFixed(4)}, ${displayLng.toFixed(4)}`}
              </p>
            </div>
          </div>
        ) : canSeeExact && !hasExactMeeting ? (
          <p className="text-xs text-stone-400 italic">
            Le lieu de rencontre exact sera défini par l'organisateur.
          </p>
        ) : (
          <p className="text-xs text-stone-400">
            📍 Zone approximative · {announcement.city || "Localisation masquée"}
          </p>
        )}
      </div>
    </div>
  );
}