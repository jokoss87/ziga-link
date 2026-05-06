/**
 * Source unique de vérité pour les listes de types d'activité.
 * Importez depuis ce fichier partout — ne dupliquez jamais ces listes.
 */

export const SPORT_TYPES = [
  "canicross", "cani_vtt", "randonnee", "agility", "frisbee",
  "traction", "parkour", "pistage", "concours",
  "mantrailing", "dog_dancing", "autre_sport",
];

export const OBEISSANCE_TYPES = [
  "obeissance", "shaping", "socialisation",
  "marche_laisse", "gestion_emotions", "renoncement",
  "nosework", "concours_dressage", "libre", "autre_dressage",
];

/** Retourne "sport", "obeissance" ou "balade" pour un type donné */
export function getCategoryFromTypeKey(type) {
  if (SPORT_TYPES.includes(type)) return "sport";
  if (OBEISSANCE_TYPES.includes(type)) return "obeissance";
  return "balade";
}