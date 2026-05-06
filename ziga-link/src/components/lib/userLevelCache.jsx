const TTL = 60 * 60 * 1000; // 1 heure

export function getUserLevelCache(email) {
  try {
    const raw = localStorage.getItem(`paw_level_${email}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > TTL) {
      localStorage.removeItem(`paw_level_${email}`);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function setUserLevelCache(email, data) {
  try {
    localStorage.setItem(`paw_level_${email}`, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

export function invalidateUserLevelCache(email) {
  if (email) localStorage.removeItem(`paw_level_${email}`);
}