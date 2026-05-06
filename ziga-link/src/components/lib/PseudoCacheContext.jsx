import { createContext, useContext, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const PseudoCacheContext = createContext(null);

// Cache global MODULE-LEVEL pour survivre aux re-renders
const globalCache = {};   // email → pseudo (string) | null
const pendingMap = {};    // email → Promise

export function PseudoCacheProvider({ children }) {
  const getPseudo = useCallback(async (email) => {
    if (!email) return null;
    if (email in globalCache) return globalCache[email];
    if (pendingMap[email]) return pendingMap[email];

    pendingMap[email] = base44.entities.UserProfile
      .filter({ created_by: email }, "-created_date", 1)
      .then(r => {
        const pseudo = r?.[0]?.pseudo || null;
        globalCache[email] = pseudo;
        delete pendingMap[email];
        return pseudo;
      })
      .catch(() => {
        globalCache[email] = null;
        delete pendingMap[email];
        return null;
      });

    return pendingMap[email];
  }, []);

  const resolvePseudos = useCallback(async (emails) => {
    const unique = [...new Set(emails.filter(Boolean))];
    const results = await Promise.all(unique.map(getPseudo));
    // Retourne un objet email→pseudo pour que les composants puissent setState
    const map = {};
    unique.forEach((email, i) => { map[email] = results[i]; });
    return map;
  }, [getPseudo]);

  const getCached = useCallback((email) => {
    return globalCache[email] ?? null;
  }, []);

  return (
    <PseudoCacheContext.Provider value={{ getPseudo, resolvePseudos, getCached }}>
      {children}
    </PseudoCacheContext.Provider>
  );
}

export function usePseudoCache() {
  return useContext(PseudoCacheContext);
}