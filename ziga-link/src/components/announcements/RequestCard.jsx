import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { CheckCircle, XCircle, MessageCircle, MapPin } from "lucide-react";
import SupportBadge from "@/components/support/SupportBadge";
import { Button } from "@/components/ui/button";
import MeetingPlacePicker from "./MeetingPlacePicker";

const statusColors = { pending: "bg-yellow-50 border-yellow-200", accepted: "bg-green-50 border-green-200", declined: "bg-red-50 border-red-200" };
const statusLabels = { pending: "En attente", accepted: "✓ Acceptée", declined: "✗ Refusée" };
const statusTextColors = { pending: "text-yellow-700", accepted: "text-green-700", declined: "text-red-600" };

export default function RequestCard({ request, announcement, onAccept, onDecline, onRefresh }) {
  const [showPlacePicker, setShowPlacePicker] = useState(false);

  const handlePlaceSelected = async (place) => {
    await base44.entities.MeetupRequest.update(request.id, { meeting_place_name: place.name, meeting_place_lat: place.lat, meeting_place_lng: place.lng });
    await base44.entities.MeetupAnnouncement.update(announcement.id, { meeting_place_name: place.name, meeting_place_lat: place.lat, meeting_place_lng: place.lng });
    setShowPlacePicker(false);
    onRefresh();
  };

  return (
    <div className={`rounded-2xl p-4 border ${statusColors[request.status]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {request.requester_dog_photo ? (
              <img src={request.requester_dog_photo} alt={request.requester_dog_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-amber-200" />
            ) : (
              <span className="text-2xl">🐾</span>
            )}
            <div>
              <p className="font-semibold text-amber-900">{request.requester_dog_name}</p>
              <div className="flex items-center gap-1">
                <p className="text-sm text-amber-600">{request.requester_name}</p>
                <SupportBadge userEmail={request.created_by} badgeText="🐾" />
              </div>
            </div>
          </div>
          {request.message && <p className="text-sm text-amber-800 mt-2 italic">"{request.message}"</p>}
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs font-medium ${statusTextColors[request.status]}`}>{statusLabels[request.status]}</span>
            {request.status === "accepted" && (
              <span className={`text-xs font-semibold ml-auto ${
                request.confirmed === true ? "text-green-500" :
                request.confirmed === false ? "text-red-400" :
                "text-stone-400"
              }`}>
                {request.confirmed === true ? "✅ Présent" :
                 request.confirmed === false ? "❌ Absent" :
                 "⏳ Pas encore confirmé"}
              </span>
            )}
          </div>
        </div>
      </div>
      {request.status === "pending" && (
        <div className="flex gap-2 mt-3">
          <Button onClick={onAccept} size="sm" className="bg-green-500 hover:bg-green-600 text-white flex-1">
            <span className="flex items-center gap-1.5 justify-center"><CheckCircle className="w-4 h-4" /> Accepter</span>
          </Button>
          <Button onClick={onDecline} size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 flex-1">
            <span className="flex items-center gap-1.5 justify-center"><XCircle className="w-4 h-4" /> Refuser</span>
          </Button>
        </div>
      )}
      {request.status === "accepted" && (
         <div className="flex flex-wrap gap-2 mt-3">
           {announcement.conversation_id ? (
             <Link to={`${createPageUrl("GroupChat")}?id=${announcement.conversation_id}`} className="flex-1">
               <Button size="sm" className="w-full bg-amber-400 hover:bg-amber-500 text-white gap-1.5">
                 <span className="flex items-center gap-1.5 justify-center"><MessageCircle className="w-4 h-4" /> Chat</span>
               </Button>
             </Link>
           ) : (
             <Button size="sm" disabled className="w-full bg-stone-100 text-stone-400 gap-1.5">
               <span className="flex items-center gap-1.5 justify-center"><MessageCircle className="w-4 h-4" /> En attente</span>
             </Button>
           )}
           <Button size="sm" variant="outline" onClick={() => setShowPlacePicker(true)} className="border-amber-200 text-amber-700 hover:bg-amber-50 gap-1.5 flex-1">
             <span className="flex items-center gap-1.5 justify-center"><MapPin className="w-4 h-4" /> {request.meeting_place_name ? "Changer le lieu" : "Proposer un lieu"}</span>
           </Button>
         </div>
       )}
      {request.meeting_place_name && (
        <div className="mt-2 text-xs text-amber-600 flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-lg">
          <MapPin className="w-3 h-3" /> Lieu proposé : <strong>{request.meeting_place_name}</strong>
        </div>
      )}
      {showPlacePicker && (
        <div className="mt-3">
          <MeetingPlacePicker lat={announcement.latitude} lng={announcement.longitude} onSelect={handlePlaceSelected} onCancel={() => setShowPlacePicker(false)} />
        </div>
      )}
    </div>
  );
}