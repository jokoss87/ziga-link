import { SPORT_TYPES, OBEISSANCE_TYPES } from "./activityTypeConstants";

/**
 * Palette centralisée par catégorie d'activité
 * Source unique de vérité — importer ce fichier partout
 *
 * Catégories :
 *  balade     → Teal   — sorties libres, balades
 *  sport      → Orange — canicross, agility, frisbee...
 *  obeissance → Violet — dressage, shaping, socialisation
 *  social     → Vert   — communauté, matchs (couleur brand Ziga Link)
 */

export const CAT = {
  balade: {
    hex:        "#14b8a6",           // teal-500
    hexLight:   "#ccfbf1",           // teal-100
    gradient:   "linear-gradient(135deg, #14b8a6, #0d9488)",
    border:     "border-teal-200",
    bg:         "bg-teal-50",
    iconBg:     "bg-teal-100",
    text:       "text-teal-800",
    textLight:  "text-teal-600",
    tailwind:   "teal",
  },
  sport: {
    hex:        "#f97316",           // orange-500
    hexLight:   "#ffedd5",           // orange-100
    gradient:   "linear-gradient(135deg, #f97316, #ea580c)",
    border:     "border-orange-200",
    bg:         "bg-orange-50",
    iconBg:     "bg-orange-100",
    text:       "text-orange-800",
    textLight:  "text-orange-600",
    tailwind:   "orange",
  },
  obeissance: {
    hex:        "#8b5cf6",           // violet-500
    hexLight:   "#ede9fe",           // violet-100
    gradient:   "linear-gradient(135deg, #8b5cf6, #7c3aed)",
    border:     "border-violet-200",
    bg:         "bg-violet-50",
    iconBg:     "bg-violet-100",
    text:       "text-violet-800",
    textLight:  "text-violet-600",
    tailwind:   "violet",
  },
  social: {
    hex:        "#4CAF87",           // brand green
    hexLight:   "#d1fae5",           // emerald-100
    gradient:   "linear-gradient(135deg, #4CAF87, #3d9e78)",
    border:     "border-emerald-200",
    bg:         "bg-emerald-50",
    iconBg:     "bg-emerald-100",
    text:       "text-emerald-800",
    textLight:  "text-emerald-600",
    tailwind:   "emerald",
  },
};

/**
 * Statuts des annonces / activités
 * Utiliser STATUS_ACTIVITY[status].badge dans tous les composants
 */
export const STATUS_ACTIVITY = {
  // Annonces (MeetupAnnouncement)
  open:      { label: "Ouverte",          badge: "bg-emerald-100 text-emerald-700 border border-emerald-200", dot: "#10b981" },
  matched:   { label: "Rencontre prévue", badge: "bg-blue-100 text-blue-700 border border-blue-200",         dot: "#3b82f6" },
  completed: { label: "Terminée",         badge: "bg-stone-100 text-stone-500 border border-stone-200",      dot: "#a8a29e" },
  cancelled: { label: "Annulée",          badge: "bg-red-100 text-red-600 border border-red-200",            dot: "#ef4444" },
  // Activités (Activity)
  full:      { label: "Complet",          badge: "bg-orange-100 text-orange-700 border border-orange-200",   dot: "#f97316" },
};

/**
 * Retourne la catégorie principale d'un type d'activité
 * @param {string} type — champ Activity.type
 * @returns {"balade"|"sport"|"obeissance"|"social"}
 */
export function getCategoryFromType(type) {
  const sport = SPORT_TYPES;
  const obed  = OBEISSANCE_TYPES;
  if (sport.includes(type)) return "sport";
  if (obed.includes(type))  return "obeissance";
  return "balade";
}