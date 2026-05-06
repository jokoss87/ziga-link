/**
 * homeLayout.config.js
 * Ordre et visibilité des sections de la page d'accueil.
 * Modifier ici pour tester différents ordres par zone, sans toucher au code.
 *
 * Sections disponibles :
 *   "nearby"      → 🐾 Chiens disponibles
 *   "map"         → 🗺️ Carte canine
 *   "activities"  → ⚡ Activités proches
 *   "suggestion"  → 💡 Suggestion du jour
 *   "challenge"   → 🎯 Défis / progression
 *   "feed"        → 📰 Feed local
 */

export const HOME_SECTIONS = [
  "nearby",
  "map",
  "activities",
  "suggestion",
  "challenge",
  "feed",
];

// Pour tester un ordre différent par zone, remplacer la liste ci-dessus.
// Exemple Limoges : ["suggestion", "nearby", "map", "activities", "challenge", "feed"]
// Les sections absentes de la liste seront simplement ignorées.