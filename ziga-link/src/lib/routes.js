/**
 * Source unique de vérité pour toutes les routes de l'application.
 * Importez ROUTES depuis ce fichier — ne jamais écrire un chemin en dur dans les composants.
 *
 * Usage :
 *   import { ROUTES } from "@/lib/routes";
 *   <Link to={ROUTES.sport}>Activités sportives</Link>
 */

export const ROUTES = {
  // Accueil
  home: "/Home",
  social: "/Social",
  messages: "/Messages",
  matching: "/Matching",

  // Annonces & activités
  createAnnouncement: "/CreateAnnouncement",
  announcementDetail: "/AnnouncementDetail",
  activityDetail: "/ActivityDetail",
  sport: "/ActivitesSport",
  dressage: "/ActivitesDressage",

  // Profil & chiens
  profil: "/Profil",
  myDogs: "/MyDogs",
  friends: "/Friends",

  // Journal & balade
  journalVie: "/JournalVie",
  balade: "/Balade",
  carteFullscreen: "/CarteFullscreen",
  sportsCanins: "/SportsCanins",

  // Divers
  feedback: "/Feedback",
  regles: "/Regles",
  support: "/SupportPage",
  bugDetail: "/BugDetail",
  chat: "/Chat",
  encounterRating: "/EncounterRatingPage",
};