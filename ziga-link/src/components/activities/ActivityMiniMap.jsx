import AnnouncementMiniMap from "@/components/announcements/AnnouncementMiniMap";

/**
 * Wrapper léger qui adapte une Activity pour l'afficher avec AnnouncementMiniMap.
 * Les deux entités partagent les mêmes champs de localisation.
 */
export default function ActivityMiniMap({ activity, isOrganizer, isParticipant }) {
  // AnnouncementMiniMap attend : latitude, longitude, meeting_place_lat/lng/name, city
  // Activity a exactement ces mêmes champs — on passe directement l'objet.
  return (
    <AnnouncementMiniMap
      announcement={activity}
      isOwner={isOrganizer}
      hasAcceptedRequest={isParticipant && !isOrganizer}
    />
  );
}