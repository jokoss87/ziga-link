/**
 * Utilitaire dates - corrige le décalage UTC sur les dates sans suffixe Z
 * Les dates Base44 sont stockées en UTC mais sans le "Z" final,
 * ce qui fait que JS les interprète en heure locale => décalage +1h en France.
 */

export function toUTC(dateStr) {
  if (!dateStr) return null;
  // Normaliser : remplacer espace par T (format Base44 parfois "2026-03-14 10:30:00")
  let s = dateStr.replace(" ", "T");
  // Si pas de timezone explicite, ajouter Z pour forcer UTC
  if (s.endsWith("Z") || s.includes("+") || s.includes("-", 10)) {
    return new Date(s);
  }
  return new Date(s + "Z");
}

/**
 * Equivalent de parseISO (date-fns) mais corrigé UTC.
 * À utiliser partout à la place de parseISO() sur les dates Base44.
 */
export function parseUTC(dateStr) {
  return toUTC(dateStr);
}

export function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - toUTC(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d}j`;
  return toUTC(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = toUTC(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800000) return d.toLocaleDateString("fr-FR", { weekday: "short" });
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}