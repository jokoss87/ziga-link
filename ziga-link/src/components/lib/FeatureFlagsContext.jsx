import { createContext, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Flags par défaut — toutes les fonctionnalités existantes sont actives
// show_welcome_hero est false par défaut : activé uniquement par zone via ZoneConfig
const DEFAULT_FLAGS = {
  sports_canins: true,
  balade_evenement: true,
  rencontres_chiens: true,
  show_map: true,
  show_activities: true,
  show_feed: true,
  show_challenge: true,
  matching_advanced: false,
  show_welcome_hero: false, // désactivé par défaut — à activer par zone dans AdminZoneConfig
};

const FeatureFlagsContext = createContext(DEFAULT_FLAGS);

export function FeatureFlagsProvider({ children, zoneTag }) {
  const [flags, setFlags] = useState(DEFAULT_FLAGS);

  useEffect(() => {
    if (!zoneTag) return;
    base44.entities.ZoneConfig.filter({ zoneTag, is_active: true }, "-created_date", 1)
      .then((results) => {
        const config = results[0];
        if (config?.feature_flags) {
          // Merge : les flags par défaut sont la base, la zone peut surcharger
          setFlags({ ...DEFAULT_FLAGS, ...config.feature_flags });
        }
      })
      .catch(() => {
        // En cas d'erreur, on garde les flags par défaut (tout activé)
      });
  }, [zoneTag]);

  return (
    <FeatureFlagsContext.Provider value={flags}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}

// Helper pour lire un flag individuel avec fallback
export function useFlag(flagName, defaultValue = true) {
  const flags = useFeatureFlags();
  return flags[flagName] ?? defaultValue;
}