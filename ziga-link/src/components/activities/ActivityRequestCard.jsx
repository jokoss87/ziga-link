import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, MessageCircle, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MeetingPlacePicker from "@/components/announcements/MeetingPlacePicker";

const statusColors = {
  pending: "bg-yellow-50 border-yellow-200 text-yellow-700",
  accepted: "bg-green-50 border-green-200 text-green-700",
  declined: "bg-red-50 border-red-200 text-red-700",
};

const statusLabels = {
  pending: "En attente",
  accepted: "Acceptée",
  declined: "Refusée",
};

export default function ActivityRequestCard({ request, activity, onAccept, onDecline, onRefresh }) {
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [showPlacePicker, setShowPlacePicker] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    await onAccept?.();
    setAccepting(false);
  };

  const handleDecline = async () => {
    setDeclining(true);
    await onDecline?.();
    setDeclining(false);
  };

  const handlePlaceSelected = async (place) => {
    await base44.entities.MeetupRequest.update(request.id, {
      meeting_place_name: place.name,
      meeting_place_lat: place.lat,
      meeting_place_lng: place.lng,
    });
    setShowPlacePicker(false);
    onRefresh?.();
  };

  const isAccepted = request.status === "accepted";

  return (
    <>
      <div className={`rounded-2xl border p-4 space-y-3 ${statusColors[request.status] || statusColors.pending}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="font-semibold text-stone-800">{request.requester_dog_name}</div>
            <div className="text-xs text-stone-500 mt-0.5">Demandeur: {request.requester_name}</div>
            {request.message && (
              <div className="text-sm text-stone-600 mt-2 p-2 bg-white/50 rounded-lg italic">
                "{request.message}"
              </div>
            )}
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[request.status]}`}>
            {statusLabels[request.status]}
          </span>
        </div>

        {request.status === "pending" && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleAccept}
              disabled={accepting}
              size="sm"
              className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-1"
            >
              <CheckCircle className="w-4 h-4" /> Accepter
            </Button>
            <Button
              onClick={handleDecline}
              disabled={declining}
              size="sm"
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 gap-1"
            >
              <XCircle className="w-4 h-4" /> Refuser
            </Button>
          </div>
        )}

        {isAccepted && (
          <div className="flex flex-wrap gap-2 pt-2">
            {activity.conversation_id ? (
              <Link to={`${createPageUrl("GroupChat")}?id=${activity.conversation_id}`} className="flex-1">
                <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-1">
                  <MessageCircle className="w-4 h-4" /> Chat
                </Button>
              </Link>
            ) : (
              <Button size="sm" disabled className="w-full bg-stone-100 text-stone-400 gap-1">
                <MessageCircle className="w-4 h-4" /> En attente
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPlacePicker(true)}
              className="flex-1 border-purple-200 text-purple-700 hover:bg-purple-50 gap-1"
            >
              <MapPin className="w-4 h-4" /> {request.meeting_place_name ? "Changer lieu" : "Proposer lieu"}
            </Button>
          </div>
        )}
      </div>

      {showPlacePicker && (
        <MeetingPlacePicker
          announcement={{ latitude: activity.latitude, longitude: activity.longitude, city: activity.city }}
          onClose={() => setShowPlacePicker(false)}
          onSelect={handlePlaceSelected}
        />
      )}
    </>
  );
}