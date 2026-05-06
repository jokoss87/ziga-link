import { Link } from "react-router-dom";
import { parseUTC } from "@/components/lib/dateUtils";
import { createPageUrl } from "@/utils";
import { MapPin, Calendar, PawPrint, Share2, Trash2 } from "lucide-react";
import { usePseudoCache } from "@/components/lib/PseudoCacheContext";
import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import UserStatusBadge from "@/components/profile/UserStatusBadge";

function handleShare(e, announcement) {
  e.preventDefault();
  e.stopPropagation();
  const url = `${window.location.origin}${window.location.pathname}#${createPageUrl("AnnouncementDetail")}?id=${announcement.id}`;
  const detailUrl = `${window.location.href.split("?")[0].split("#")[0]}#/AnnouncementDetail?id=${announcement.id}`;
  const shareUrl = window.location.origin + "/?page=AnnouncementDetail&id=" + announcement.id;
  const finalUrl = `${window.location.origin}${createPageUrl("AnnouncementDetail")}?id=${announcement.id}`;
  if (navigator.share) {
    navigator.share({ title: announcement.title, text: `Rencontre chien : ${announcement.title}`, url: finalUrl });
  } else {
    navigator.clipboard.writeText(finalUrl);
    alert("Lien copié !");
  }
}

const ADMIN_EMAIL = "jotouillez@gmail.com";

export default function AnnouncementCard({ announcement, currentUser, onRefresh }) {
  const { resolvePseudos } = usePseudoCache();
  const [resolvedPseudo, setResolvedPseudo] = useState(null);
  const [ownerStatus, setOwnerStatus] = useState(null);

  useEffect(() => {
    if (!announcement.created_by) return;
    resolvePseudos([announcement.created_by]).then((map) => {
      setResolvedPseudo(map[announcement.created_by] || null);
    });
    base44.entities.UserProfile.filter({ created_by: announcement.created_by }, "-created_date", 1)
      .then(r => setOwnerStatus(r[0]?.user_status || null))
      .catch(() => {});
  }, [announcement.created_by]);

  const ownerDisplay = resolvedPseudo || announcement.owner_name || null;
  const isAdmin = currentUser?.email === ADMIN_EMAIL;

  const handleAdminDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("🛡️ [ADMIN] Supprimer définitivement cette annonce ?")) return;
    await base44.entities.MeetupAnnouncement.delete(announcement.id);
    onRefresh?.();
  };

  return (
    <Link to={`${createPageUrl("AnnouncementDetail")}?id=${announcement.id}`}>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-2xl flex-shrink-0 border-2 border-amber-200">
            🐶
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-amber-900 truncate">{announcement.title}</h3>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {ownerStatus && <UserStatusBadge status={ownerStatus} />}
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  Ouverte
                </span>
                <button
                  onClick={(e) => handleShare(e, announcement)}
                  className="w-7 h-7 rounded-full bg-amber-50 hover:bg-amber-100 flex items-center justify-center transition-colors"
                  title="Partager"
                >
                  <Share2 className="w-3.5 h-3.5 text-amber-500" />
                </button>
                {isAdmin && (
                  <button
                    onClick={handleAdminDelete}
                    className="w-7 h-7 rounded-full bg-red-50 hover:bg-red-100 border border-red-200 flex items-center justify-center transition-colors"
                    title="Supprimer (admin)"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-amber-600 text-sm flex items-center gap-1 mt-0.5">
              <PawPrint className="w-3.5 h-3.5" />
              {announcement.dog_name}{ownerDisplay ? ` · ` : ""}{ownerDisplay && <span className="text-amber-500">{ownerDisplay}</span>}
            </p>
            {announcement.description && (
              <p className="text-amber-700 text-sm mt-1.5 line-clamp-2">{announcement.description}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-amber-500">
              {announcement.date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {parseUTC(announcement.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  {announcement.time && ` · ${announcement.time}`}
                </span>
              )}
              {announcement.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {announcement.city}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}