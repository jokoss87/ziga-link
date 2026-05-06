/**
 * Cache local intelligent avec TTL
 * Évite les requêtes redondantes et améliore les temps de chargement
 */

const store = new Map();
const DEFAULT_TTL = 60 * 1000; // 1 minute

export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheSet(key, value, ttl = DEFAULT_TTL) {
  store.set(key, { value, expiresAt: Date.now() + ttl });
}

/**
 * Wrapper : retourne le cache si valide, sinon exécute fn() et met en cache
 */
export function cacheInvalidate(key) {
  store.delete(key);
}

export function invalidateShadowBanCache() {
  cacheInvalidate("shadow_banned_emails");
  cacheInvalidate("home_announcements");
  cacheInvalidate("home_activities");
}

export async function cachedFetch(key, fn, ttl = DEFAULT_TTL) {
  const cached = cacheGet(key);
  if (cached !== null) return cached;
  const result = await fn();
  cacheSet(key, result, ttl);
  return result;
}