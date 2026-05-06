import { useState, useCallback } from "react";
import { MapPin, Search, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

// Fix icône Leaflet par défaut
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapClickHandler({ onPick }) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      // Reverse geocode via Nominatim
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        const name = data.display_name
          ? data.display_name.split(",").slice(0, 2).join(", ")
          : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        const city = data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || "";
        onPick({ name, lat, lng, city });
      } catch {
        onPick({ name: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng });
      }
    },
  });
  return null;
}

export default function MeetingPlacePicker({ lat, lng, onSelect, onCancel }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState(null);

  const centerLat = lat || 45.75;
  const centerLng = lng || 4.85;

  const searchPlaces = async (searchQuery) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`;
    const res = await fetch(url);
    const data = await res.json();
    setResults(data.map((item) => ({
      name: item.display_name.split(",").slice(0, 2).join(", "),
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    })));
    setLoading(false);
  };

  const handleMapPick = useCallback((place) => {
    setPicked(place);
    setResults([]);
  }, []);

  return (
    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-amber-900 text-sm flex items-center gap-1.5">
          <MapPin className="w-4 h-4" /> Choisir un lieu de rencontre
        </h4>
        <button onClick={onCancel}><X className="w-4 h-4 text-amber-500" /></button>
      </div>

      {/* Recherche texte */}
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchPlaces(query)}
          placeholder="Rechercher un parc, jardin..."
          className="border-amber-200 bg-white text-sm"
        />
        <Button size="sm" onClick={() => searchPlaces(query)} disabled={loading} className="bg-amber-400 hover:bg-amber-500 text-white px-3">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </div>

      {/* Résultats recherche */}
      {results.length > 0 && (
        <div className="space-y-1.5">
          {results.map((place, i) => (
            <button
              key={i}
              onClick={() => { setPicked(place); setResults([]); }}
              className="w-full text-left text-sm px-3 py-2 bg-white rounded-lg border border-amber-100 hover:border-amber-300 hover:bg-amber-50 transition-colors text-amber-800"
            >
              📍 {place.name}
            </button>
          ))}
        </div>
      )}

      {/* Carte cliquable */}
      <div className="rounded-xl overflow-hidden border border-amber-200" style={{ height: 220 }}>
        <MapContainer
          center={[picked?.lat || centerLat, picked?.lng || centerLng]}
          zoom={13}
          style={{ width: "100%", height: "100%" }}
          zoomControl={true}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClickHandler onPick={handleMapPick} />
          {picked && <Marker position={[picked.lat, picked.lng]} icon={markerIcon} />}
        </MapContainer>
      </div>
      <p className="text-xs text-amber-600 text-center">Touchez la carte pour placer le point de rendez-vous</p>

      {/* Lieu sélectionné */}
      {picked && (
        <div className="bg-white border border-amber-300 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
          <span className="text-sm text-amber-800 font-medium truncate">📍 {picked.name}</span>
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" onClick={() => setPicked(null)} variant="outline" className="border-amber-200 text-amber-600 text-xs px-2 py-1 h-auto">
              Changer
            </Button>
            <Button size="sm" onClick={() => onSelect(picked)} className="bg-amber-400 hover:bg-amber-500 text-white text-xs px-3 py-1 h-auto">
              Confirmer ✓
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}