import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { MapPin, Search, X, Navigation } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import L from "leaflet";
import { useLocation } from "@/components/location/LocationContext";

// Fix leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({ latitude, longitude, city, onLocationChange, accentColor = "amber" }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsPermDenied, setGpsPermDenied] = useState(false);
  const [showMap, setShowMap] = useState(!!(latitude && longitude));
  const searchTimeout = useRef(null);
  const { permissionStatus, userLocation: gpsPos, requestLocation } = useLocation();

  const colors = {
    amber: { border: "border-amber-200", focus: "focus:border-amber-400", button: "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200", text: "text-amber-700" },
    stone: { border: "border-stone-200", focus: "focus:border-stone-400", button: "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200", text: "text-stone-700" },
  };
  const c = colors[accentColor] || colors.amber;

  const searchAddress = async (q) => {
    if (!q || q.length < 3) { setSuggestions([]); return; }
    setSearching(true);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=fr,be,ch`);
    const data = await res.json();
    setSuggestions(data);
    setSearching(false);
  };

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchAddress(e.target.value), 500);
  };

  const handleSelectSuggestion = (place) => {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    const cityName = place.address?.city || place.address?.town || place.address?.village || place.display_name.split(",")[0];
    setQuery(place.display_name);
    setSuggestions([]);
    setShowMap(true);
    onLocationChange({ latitude: lat, longitude: lng, city: cityName });
  };

  const handleMapClick = (lat, lng) => {
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
      .then(r => r.json())
      .then(data => {
        const cityName = data.address?.city || data.address?.town || data.address?.village || "";
        onLocationChange({ latitude: lat, longitude: lng, city: cityName });
        if (!query) setQuery(data.display_name || "");
      })
      .catch(() => onLocationChange({ latitude: lat, longitude: lng, city: "" }));
  };

  const handleGPS = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    setGpsPermDenied(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
          .then(r => r.json())
          .then(data => {
            const cityName = data.address?.city || data.address?.town || data.address?.village || "";
            onLocationChange({ latitude: lat, longitude: lng, city: cityName });
            setQuery(data.display_name || "");
            setShowMap(true);
            setGpsLoading(false);
          })
          .catch(() => {
            onLocationChange({ latitude: lat, longitude: lng, city: "" });
            setShowMap(true);
            setGpsLoading(false);
          });
      },
      (err) => { if (err.code === 1) setGpsPermDenied(true); setGpsLoading(false); },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const clearLocation = () => {
    setQuery("");
    setSuggestions([]);
    setShowMap(false);
    onLocationChange({ latitude: null, longitude: null, city: "" });
  };

  return (
    <>
    <div className="space-y-2">
      {/* 1. GPS button — primary action */}
      <Button
        type="button"
        variant="outline"
        onClick={handleGPS}
        disabled={gpsLoading}
        className={`w-full gap-2 font-semibold ${c.button}`}
      >
        <Navigation className="w-4 h-4" />
        {gpsLoading ? "Localisation en cours..." : "📍 Utiliser ma position"}
      </Button>

      {gpsPermDenied && (
        <p className="text-xs text-amber-600 -mt-1">
          Autorise la localisation dans les réglages de ton navigateur.
        </p>
      )}

      {/* 2. Map — click to place a pin */}
      {showMap && latitude && longitude ? (
        <div className="rounded-xl overflow-hidden border border-stone-200 shadow-sm" style={{ height: 220 }}>
          <MapContainer center={[latitude, longitude]} zoom={14} style={{ height: "100%", width: "100%" }} key={`map-${Math.round(latitude*100)}-${Math.round(longitude*100)}`} zoomAnimation={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapClickHandler onLocationSelect={handleMapClick} />
            <Marker position={[latitude, longitude]} />
          </MapContainer>
        </div>
      ) : (
        <div
          className="rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 flex flex-col items-center justify-center cursor-pointer hover:bg-stone-100 transition-colors"
          style={{ height: 130 }}
          onClick={() => {
            setShowMap(true);
            if (!latitude) onLocationChange({ latitude: 46.603354, longitude: 1.888334, city: "" });
          }}
        >
          <MapPin className="w-8 h-8 text-stone-300 mb-1" />
          <p className="text-sm font-semibold text-stone-500">Cliquer pour ouvrir la carte</p>
          <p className="text-xs text-stone-400 mt-0.5">Puis cliquez sur la carte pour placer un point</p>
        </div>
      )}

      {latitude && longitude && (
        <p className="text-xs text-stone-400 flex items-center gap-1">
          <MapPin className="w-3 h-3" /> Position enregistrée · Cliquez sur la carte pour ajuster
        </p>
      )}

      {/* 3. Search bar — secondary/manual option */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <Input
          value={query}
          onChange={handleQueryChange}
          placeholder="Ou rechercher une adresse..."
          className={`pl-9 pr-9 ${c.border}`}
        />
        {query && (
          <button onClick={clearLocation} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
            <X className="w-4 h-4" />
          </button>
        )}
        {suggestions.length > 0 && (
          <div
            className="absolute z-50 w-full bg-white border border-stone-200 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.stopPropagation(); handleSelectSuggestion(s); }}
                className="w-full text-left px-4 py-2.5 hover:bg-stone-50 text-sm text-stone-700 border-b border-stone-50 last:border-0"
              >
                <MapPin className="w-3.5 h-3.5 inline mr-2 text-stone-400" />
                {s.display_name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>

    </>
  );
}