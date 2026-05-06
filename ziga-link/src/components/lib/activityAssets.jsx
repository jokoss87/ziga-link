// Centralisation des assets visuels pour les types d'activité
// Ajouter ici toute nouvelle image associée à un type d'activité

export const ACTIVITY_IMAGES = {
  canicross: "https://media.base44.com/images/public/699797b556ee6b9c51a26f9f/078871679_canicross.png",
};

/**
 * Retourne l'image associée à un type d'activité, ou null si aucune image n'est définie.
 * @param {string} type - Le type d'activité (ex: "canicross")
 * @returns {string|null}
 */
export function getActivityImage(type) {
  return ACTIVITY_IMAGES[type] ?? null;
}