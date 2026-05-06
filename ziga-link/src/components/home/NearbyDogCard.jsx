import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, MapPin } from "lucide-react";
import { parseUTC } from "@/components/lib/dateUtils";

export default function NearbyDogCard({ announcement }) {
  const dateLabel = announcement.date
    ? parseUTC(announcement.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
    : null;

  return (
    <Link
      to={`${createPageUrl("AnnouncementDetail")}?id=${announcement.id}`}
      className="flex-shrink-0 w-44 bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden hover:shadow-md hover:border-orange-200 transition-all active:scale-95"
    >
      {/* Dog avatar */}
      <div className="h-28 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-5xl relative">
        🐶
        <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />
      </div>

      <div className="p-3">
        <p className="font-black text-stone-800 text-sm truncate">{announcement.dog_name || "Chien"}</p>
        <p className="text-stone-400 text-xs truncate mb-2">{announcement.owner_name}</p>

        {announcement.city && (
          <p className="text-xs text-orange-500 flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 flex-shrink-0" /> {announcement.city}
          </p>
        )}
        {dateLabel && (
          <p className="text-xs text-stone-400 flex items-center gap-1 mt-1 truncate">
            <Calendar className="w-3 h-3 flex-shrink-0" /> {dateLabel}
          </p>
        )}

        <div className="mt-3 bg-orange-50 border border-orange-100 rounded-xl py-1.5 text-center">
          <span className="text-xs font-bold text-orange-500">Rejoindre 🐾</span>
        </div>
      </div>
    </Link>
  );
}