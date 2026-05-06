/**
 * Hook useUserLocation
 * Mémorise la position approximative en localStorage pour éviter
 * les doubles demandes de permission de localisation.
 */
import { useState, useCallback, useEffect } from "react";

const CACHE_KEY = "zigalink_user_location_cache";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { lat, lng, city, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return { lat, lng, city };
  } catch {
    return null;
  }
}

function setCache(lat, lng, city = "") {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ lat, lng, city, ts: Date.now() }));
  } catch {}
}

/**
 * Retourne la localisation approximative mise en cache.
 * Si le cache est valide, ne redemande JAMAIS la permission.
 * @returns {{ location: {lat, lng, city} | null, isLoading, resolveLocation }}
 */
export function useUserLocation() {
  const [location, setLocation] = useState(() => getCache());
  const [isLoading, setIsLoading] = useState(false);

  // Synchronise la localisation depuis le contexte GPS global si dispo
  const resolveFromCoords = useCallback((lat, lng) => {
    // Approximation : arrondi à 2 décimales (~1km de précision)
    const approxLat = Math.round(lat * 100) / 100;
    const approxLng = Math.round(lng * 100) / 100;

    // Reverse geocoding pour la ville
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${approxLat}&lon=${approxLng}&format=json`)
      .then(r => r.json())
      .then(data => {
        const city = data.address?.city || data.address?.town || data.address?.village || "";
        const loc = { lat: approxLat, lng: approxLng, city };
        setCache(approxLat, approxLng, city);
        setLocation(loc);
        setIsLoading(false);
      })
      .catch(() => {
        const loc = { lat: approxLat, lng: approxLng, city: "" };
        setCache(approxLat, approxLng, "");
        setLocation(loc);
        setIsLoading(false);
      });
  }, []);

  /**
   * Résout la localisation :
   * 1. Si cache valide → retourne immédiatement sans demander GPS
   * 2. Si déjà accordé → fetch silencieux
   * 3. Sinon → appelle requestLocation du contexte (modale)
   */
  const resolveLocation = useCallback((requestLocationFn, permissionStatus, gpsPos) => {
    const cached = getCache();
    if (cached) {
      setLocation(cached);
      return cached;
    }

    if (permissionStatus === "granted" && gpsPos) {
      setIsLoading(true);
      resolveFromCoords(gpsPos.lat, gpsPos.lng);
      return null;
    }

    if (requestLocationFn) {
      setIsLoading(true);
      requestLocationFn();
    }
    return null;
  }, [resolveFromCoords]);

  // Quand le GPS devient disponible, met à jour le cache si pas déjà en cache
  const updateFromGps = useCallback((gpsPos) => {
    if (!gpsPos) return;
    const cached = getCache();
    if (cached) return; // déjà en cache, pas besoin de mettre à jour
    setIsLoading(true);
    resolveFromCoords(gpsPos.lat, gpsPos.lng);
  }, [resolveFromCoords]);

  return { location, isLoading, resolveLocation, updateFromGps };
}