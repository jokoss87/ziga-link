import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const PHOTO_CACHE_VERSION = "v2";
const PHOTO_PREFIX = `photo_${PHOTO_CACHE_VERSION}_`;

function getCached(key) {
  try {
    const val = sessionStorage.getItem(PHOTO_PREFIX + key);
    if (val && val.startsWith("http")) return val;
    return undefined;
  } catch { return undefined; }
}

function setCached(key, value) {
  if (!value || !value.startsWith("http")) return;
  try {
    sessionStorage.setItem(PHOTO_PREFIX + key, value);
  } catch {}
}

const memCache = {};
const inflight = {};

export function useOwnerPhoto(createdBy, fallbackPhoto) {
  const validFallback = (fallbackPhoto && fallbackPhoto.startsWith("http")) ? fallbackPhoto : null;

  // Initialisation immédiate depuis le cache mémoire ou fallback
  const getInitial = () => {
    if (validFallback) return validFallback;
    if (createdBy && memCache[createdBy]) return memCache[createdBy];
    if (createdBy) { const c = getCached(createdBy); if (c) return c; }
    return null;
  };

  const [photo, setPhoto] = useState(getInitial);

  useEffect(() => {
    if (!createdBy) { setPhoto(validFallback); return; }

    // Si on reçoit un fallback valide (données qui arrivent après le mount), l'utiliser
    if (validFallback) {
      setPhoto(validFallback);
      memCache[createdBy] = validFallback;
      return;
    }

    // Vérifier le cache mémoire
    if (memCache[createdBy]) { setPhoto(memCache[createdBy]); return; }

    // Vérifier sessionStorage
    const cached = getCached(createdBy);
    if (cached) { memCache[createdBy] = cached; setPhoto(cached); return; }

    // Fetch async
    if (!inflight[createdBy]) {
      inflight[createdBy] = base44.entities.UserProfile.filter({ created_by: createdBy }, "-created_date", 1)
        .then(async profiles => {
          const profilePhoto = profiles[0]?.photo_url;
          if (profilePhoto && profilePhoto.startsWith("http")) {
            memCache[createdBy] = profilePhoto;
            setCached(createdBy, profilePhoto);
            return profilePhoto;
          }
          return null;
        })
        .catch(() => null)
        .finally(() => { delete inflight[createdBy]; });
    }

    inflight[createdBy].then(p => { if (p) setPhoto(p); }).catch(() => {});
  }, [createdBy, fallbackPhoto]);

  return photo;
}