import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, ChevronRight, UserPlus, Clock, UserCheck, Info } from "lucide-react";
import { formatTime } from "@/components/lib/dateUtils";
import { STATUS_CONFIG } from "@/components/profile/UserStatusBadge";
import { useOwnerPhoto } from "@/components/useOwnerPhoto";

const CATEGORY_AVATAR = {
  balade:     { bg: "bg-teal-100",   icon: "text-teal-500"   },
  sport:      { bg: "bg-orange-100", icon: "text-orange-500" },
  obeissance: { bg: "bg-violet-100", icon: "text-violet-500" },
  social:     { bg: "bg-emerald-100",icon: "text-emerald-500"},
  default:    { bg: "bg-teal-100",   icon: "text-teal-500"   },
};

function Avatar({ photoUrl, otherEmail, displayName, isGroup, isAdminMessage, otherStatus, category }) {
  const fetchedPhoto = useOwnerPhoto((!photoUrl && !isGroup && !isAdminMessage) ? otherEmail : null, null);
  const finalPhoto = photoUrl || fetchedPhoto;
  const catStyle = CATEGORY_AVATAR[category] || CATEGORY_AVATAR.default;

  return (
    <div className="relative flex-shrink-0">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden ${
        isAdminMessage ? "bg-blue-100 text-blue-600" : isGroup ? catStyle.bg : "bg-teal-100 text-teal-600"
      }`}>
        {isAdminMessage
          ? "🛡️"
          : isGroup
            ? <Users className={`w-6 h-6 ${catStyle.icon}`} />
            : finalPhoto
              ? <img src={finalPhoto} alt="" className="w-full h-full object-cover" />
              : (displayName[0]?.toUpperCase() || "?")}
      </div>
      {!isGroup && !isAdminMessage && (
        <div
          className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm"
          style={{ backgroundColor: STATUS_CONFIG[otherStatus]?.dot || STATUS_CONFIG.disponible.dot }}
        />
      )}
    </div>
  );
}

export default function ConversationListItem({ conv, currentUserEmail, onClick, friendEmails, pendingEmails, onAddFriend }) {
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const pressTimer = useRef(null);

  const isGroup = conv.type === "group";
  const members = conv.members || [];
  const pseudos = conv.member_pseudos || [];
  const photos = conv.member_photos || [];
  const otherIndex = members.findIndex((e) => e !== currentUserEmail);

  const statuses = conv.member_statuses || [];
  const otherStatus = !isGroup && otherIndex >= 0 ? statuses[otherIndex] || null : null;
  const otherEmail = otherIndex >= 0 ? members[otherIndex] : null;
  const otherPseudo = otherIndex >= 0 ? pseudos[otherIndex] : null;
  const otherPhoto = otherIndex >= 0 ? photos[otherIndex] : null;
  const otherEmails = members.filter(e => e !== currentUserEmail);
  const displayName = conv.name || (isGroup ? "Groupe" : (otherPseudo ? otherPseudo : otherEmails[0] || "Conversation"));
  const photoUrl = !isGroup ? otherPhoto : null;
  const unread = conv.unread_counts?.[currentUserEmail] || 0;

  const isFriend = otherEmail && friendEmails?.has(otherEmail);
  const isPending = otherEmail && pendingEmails?.has(otherEmail);
  const showAddBtn = !isGroup && otherEmail && !isFriend && !isPending;
  const isAdminMessage = otherEmail && (otherEmail.includes("admin") || otherEmail === "admin@zigalink.local");

  const handleAddFriend = async (e) => {
    e.stopPropagation();
    if (adding || !onAddFriend) return;
    setAdding(true);
    await onAddFriend(otherEmail);
    setAdding(false);
  };

  const handleTouchStart = () => {
    if (isGroup || !otherEmail || isAdminMessage) return;
    pressTimer.current = setTimeout(() => {
      navigate(`${createPageUrl("PublicProfile")}?email=${otherEmail}`);
    }, 600);
  };
  const handleTouchEnd = () => { clearTimeout(pressTimer.current); };

  return (
    <button
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      className={`w-full rounded-2xl shadow-sm p-4 flex items-center gap-4 transition-all text-left active:bg-stone-50 border ${
        isAdminMessage
          ? "bg-blue-50 border-blue-300 hover:border-blue-400"
          : "bg-white border-stone-100 hover:border-teal-200"
      }`}
    >
      <Avatar
        photoUrl={photoUrl}
        otherEmail={otherEmail}
        displayName={displayName}
        isGroup={isGroup}
        isAdminMessage={isAdminMessage}
        otherStatus={otherStatus}
        category={conv.category}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`font-bold truncate ${unread > 0 ? "text-stone-900" : "text-stone-700"}`}>{displayName}</p>
          <span className="text-xs text-stone-400 flex-shrink-0">{formatTime(conv.last_message_at)}</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className={`text-sm truncate ${unread > 0 ? "text-stone-700 font-medium" : "text-stone-400"}`}>
            {conv.last_message || (isGroup ? `${conv.members?.length || 0} membres` : "Démarrer la discussion")}
          </p>
          {unread > 0 && (
            <span className={`ml-2 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 ${
              isAdminMessage ? "bg-blue-500" : "bg-teal-500"
            }`}>
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
      </div>

      {showAddBtn && (
        <button
          onClick={handleAddFriend}
          disabled={adding}
          className="flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50 flex-shrink-0"
          title="Ajouter en ami"
        >
          {adding
            ? <div className="w-3.5 h-3.5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            : <UserPlus className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">Ajouter</span>
        </button>
      )}
      {!isGroup && isPending && (
        <div className="flex items-center gap-1 text-amber-500 text-xs flex-shrink-0" title="Demande envoyée">
          <Clock className="w-3.5 h-3.5" />
        </div>
      )}
      {!isGroup && isFriend && (
        <div className="flex items-center gap-1 text-teal-400 text-xs flex-shrink-0" title="Ami(e)">
          <UserCheck className="w-3.5 h-3.5" />
        </div>
      )}
      {!isGroup && !isAdminMessage && otherEmail && (
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`${createPageUrl("PublicProfile")}?email=${otherEmail}`); }}
          className="p-1.5 rounded-full hover:bg-stone-100 transition-colors flex-shrink-0 text-stone-300 hover:text-teal-500"
          title="Voir le profil"
        >
          <Info className="w-4 h-4" />
        </button>
      )}
      <ChevronRight className="w-4 h-4 text-stone-300 flex-shrink-0" />
    </button>
  );
}