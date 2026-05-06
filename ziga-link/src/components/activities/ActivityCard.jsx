import { Calendar, MapPin, Users, Trophy, Check, FlagTriangleRight, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { invalidateUserLevelCache } from "@/components/lib/userLevelCache";
import { usePseudoCache } from "@/components/lib/PseudoCacheContext";
import { useActivityConfig } from "@/components/lib/useActivityConfig";
import { CAT, getCategoryFromType } from "@/components/lib/categoryColors";
import { parseUTC } from "@/components/lib/dateUtils";
import StatusActivityBadge from "@/components/ui/StatusActivityBadge";

const LEVEL_LABEL = { all: "Tous niveaux", beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé" };
const ADMIN_EMAIL = "jotouillez@gmail.com";

function OrganizerPhoto({ src, fallbackBg }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (error) return <div className={`w-6 h-6 rounded-full ${fallbackBg} flex items-center justify-center text-xs`}>👤</div>;
  return (
    <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
      {!loaded && <div className="absolute inset-0 bg-stone-200 animate-pulse rounded-full" />}
      <img src={src} alt="" loading="lazy" className="w-6 h-6 rounded-full object-cover" onLoad={() => setLoaded(true)} onError={() => setError(true)} />
    </div>
  );
}

export default function ActivityCard({ activity, currentUser, onRefresh }) {
  const [finishing, setFinishing] = useState(false);
  const navigate = useNavigate();
  const { resolvePseudos } = usePseudoCache();
  const { getLabel, getImage, getEmoji } = useActivityConfig();

  const [resolvedPseudo, setResolvedPseudo] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (activity.created_by) {
      resolvePseudos([activity.created_by]).then((map) => {
        setResolvedPseudo(map[activity.created_by] || null);
      });
    }
  }, [activity.created_by]);

  useEffect(() => {
    if (isOrganizer) {
      base44.entities.MeetupRequest.filter({ announcement_id: activity.id, status: "pending" }, "-created_date", 10)
        .then(reqs => setPendingCount(reqs.length))
        .catch(() => {});
    }
  }, [activity.id]);

  const goToDetail = () => navigate(`${createPageUrl("ActivityDetail")}?id=${activity.id}`);

  const organizerDisplay = resolvedPseudo || activity.organizer_name || null;
  const participants = activity.participants || [];
  const isJoined = currentUser && participants.includes(currentUser.email);
  const effectiveMax = activity.max_participants || 5;
  const isFull = participants.length >= effectiveMax;
  const isOrganizer = currentUser && activity.created_by === currentUser.email;
  const isAdmin = currentUser?.email === ADMIN_EMAIL;

  const handleAdminDelete = async (e) => {
    e.stopPropagation();
    if (!confirm("🛡️ [ADMIN] Supprimer définitivement cette activité ?")) return;
    await base44.entities.Activity.delete(activity.id);
    onRefresh?.();
  };

  const handleFinish = async (e) => {
    e?.stopPropagation();
    if (!confirm("Marquer cette activité comme terminée ?")) return;
    setFinishing(true);
    await base44.entities.Activity.update(activity.id, { status: "completed" });
    invalidateUserLevelCache(currentUser?.email);
    navigate(createPageUrl("JournalVie"));
  };

  const cat = CAT[getCategoryFromType(activity.type)] || CAT.sport;

  return (
    <div
      className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:border-stone-200 transition-all"
      onClick={goToDetail}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-xl ${cat.iconBg} flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden`}>
            {getImage(activity.type)
              ? <img src={getImage(activity.type)} alt={activity.type} className="w-full h-full object-cover rounded-xl" />
              : <span>{getEmoji(activity.type)}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            {activity.type && (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold ${cat.textLight} mb-0.5`}>
                {getImage(activity.type)
                  ? <img src={getImage(activity.type)} alt="" className="w-4 h-4 object-cover rounded-sm" />
                  : <span>{getEmoji(activity.type)}</span>
                }
                {getLabel(activity.type)}
              </span>
            )}
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-stone-800 leading-tight">{activity.title}</h3>
              <span className={`text-xs ${cat.bg} ${cat.textLight} border ${cat.border} rounded-full px-2 py-0.5 flex-shrink-0 font-medium`}>
                {LEVEL_LABEL[activity.level_required] || "Tous niveaux"}
              </span>
              {activity.status && activity.status !== "open" && (
                <StatusActivityBadge status={activity.status} className="ml-1" />
              )}
            </div>
            {activity.description && (
              <p className="text-sm text-stone-500 mt-1 line-clamp-2">{activity.description}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-3 text-xs text-stone-500">
          {activity.date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {activity.date && parseUTC(activity.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
              {activity.time && ` à ${activity.time}`}
            </div>
          )}
          {activity.city && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {activity.city}
            </div>
          )}
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {participants.length}/{effectiveMax} participants
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-50">
          {organizerDisplay && (
            <div className="flex items-center gap-2">
              {activity.organizer_photo ? (
                <OrganizerPhoto src={activity.organizer_photo} fallbackBg={cat.iconBg} />
              ) : (
                <div className={`w-6 h-6 rounded-full ${cat.iconBg} flex items-center justify-center text-xs`}>👤</div>
              )}
              <span className="text-xs text-stone-500">Organisé par <span className="font-medium text-stone-700">{organizerDisplay}</span></span>
            </div>
          )}
          {isAdmin && (
            <button
              onClick={handleAdminDelete}
              className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-100 transition-colors"
              title="Supprimer (admin)"
            >
              <Trash2 className="w-3 h-3" /> Suppr.
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 flex flex-col gap-2">
        {!isOrganizer && !isJoined && activity.status === "open" && (
          <Button
            onClick={e => { e.stopPropagation(); goToDetail(); }}
            disabled={isFull}
            size="sm"
            className="w-full rounded-xl font-semibold text-white"
            style={!isFull ? { background: cat.gradient } : { background: "#d3d3d3" }}
          >
            {isFull ? "Complet" : <span className="flex items-center gap-1.5 justify-center"><Trophy className="w-3.5 h-3.5" /> Rejoindre</span>}
          </Button>
        )}
        {isJoined && (
          <div className="text-center text-green-600 text-sm font-medium bg-green-50 rounded-xl py-2">
            <Check className="w-4 h-4 inline mr-1" /> Vous participez
          </div>
        )}
        {isOrganizer && (
          <div className="flex items-center justify-between">
            {pendingCount > 0 && (
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                {pendingCount} demande(s) en attente
              </span>
            )}
            <Button
              onClick={e => { e.stopPropagation(); handleFinish(); }}
              disabled={finishing}
              size="sm"
              variant="outline"
              className="ml-auto rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <FlagTriangleRight className="w-3.5 h-3.5 mr-1" /> Terminer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}