import { useState, useEffect } from "react";
import { Bell, X, MessageCircle, PawPrint, Trophy, Check, XCircle, Heart, MapPin, CheckCircle, Play } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const photoCache = {};
async function getSenderPhoto(email) {
  if (!email) return null;
  if (photoCache[email] !== undefined) return photoCache[email];
  const profiles = await base44.entities.UserProfile.filter({ created_by: email }, "-created_date", 1).catch(() => []);
  photoCache[email] = profiles[0]?.photo_url || null;
  return photoCache[email];
}

// Cache global pour éviter les rechargements trop fréquents (rate limit)
let lastLoadTime = 0;
let cachedNotifs = null;
const NOTIF_COOLDOWN_MS = 60_000; // 1 minute minimum entre chaque fetch

const TYPE_CONFIG = {
  message: { icon: MessageCircle, color: "text-teal-500", bg: "bg-teal-50" },
  group_message: { icon: MessageCircle, color: "text-purple-500", bg: "bg-purple-50" },
  walk_request: { icon: PawPrint, color: "text-amber-500", bg: "bg-amber-50" },
  activity_join: { icon: Trophy, color: "text-violet-500", bg: "bg-violet-50" },
  walk_accepted: { icon: Check, color: "text-green-500", bg: "bg-green-50" },
  walk_declined: { icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
  match_suggestion: { icon: Heart, color: "text-rose-500", bg: "bg-rose-50" },
  level_up: { icon: Trophy, color: "text-amber-600", bg: "bg-amber-100" },
  encounter_rating: { icon: PawPrint, color: "text-yellow-500", bg: "bg-yellow-50" },
  bug_response: { icon: MessageCircle, color: "text-blue-500", bg: "bg-blue-50" },
  place_updated: { icon: MapPin, color: "text-teal-500", bg: "bg-teal-50" },
  activity_ended: { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50" },
  activity_started: { icon: Play, color: "text-green-500", bg: "bg-green-50" },
  participant_absent: { icon: XCircle, color: "text-red-400", bg: "bg-red-50" }
};

const DEFAULT_BODY = {
  walk_request:       "Un chien souhaite vous rejoindre pour une balade.",
  activity_join:      "Un participant a rejoint votre activité.",
  walk_accepted:      "Votre demande de balade a été acceptée !",
  walk_declined:      "Votre demande de balade a été refusée.",
  match_suggestion:   "Un nouveau chien compatible avec le vôtre a été trouvé.",
  level_up:           "Bravo ! Vous avez atteint un nouveau niveau.",
  bug_response:       "L'équipe a répondu à votre signalement de bug.",
  place_updated:      "Un lieu sur la carte a été mis à jour près de chez vous.",
  activity_ended:     "Une activité à laquelle vous participiez vient de se terminer.",
  activity_started:   "Une activité à laquelle vous participez vient de démarrer.",
  participant_absent: "Un participant ne s'est pas présenté à la balade.",
};

function getDefaultBody(type) {
  return DEFAULT_BODY[type] || "Appuyez pour voir les détails.";
}

export default function NotificationBell({ userEmail, dark = false }) {
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const [senderPhotos, setSenderPhotos] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    if (!userEmail) return;
    loadNotifs();
    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.type === "create" && event.data?.user_email === userEmail) {
        setNotifs((prev) => [event.data, ...prev]);
      } else if (event.type === "update") {
        setNotifs((prev) => prev.map((n) => n.id === event.id ? event.data : n));
      }
    });
    return unsub;
  }, [userEmail]);

  const loadNotifs = async (force = false) => {
    const now = Date.now();
    if (!force && cachedNotifs && now - lastLoadTime < NOTIF_COOLDOWN_MS) {
      setNotifs(cachedNotifs);
      return;
    }
    const all = await base44.entities.Notification.filter({ user_email: userEmail }, "-created_date", 30).catch(() => cachedNotifs || []);
    cachedNotifs = all;
    lastLoadTime = Date.now();
    setNotifs(all);
    // Preload sender photos (max 5 pour éviter le rate limit)
    const emails = [...new Set(all.map((n) => n.sender_email).filter(Boolean))].slice(0, 5);
    if (emails.length > 0) {
      const results = await Promise.all(emails.map(async (e) => [e, await getSenderPhoto(e)]));
      setSenderPhotos(Object.fromEntries(results));
    }
  };

  // Exclure les notifications de messages (elles vont dans l'onglet Messages)
  const visibleNotifs = notifs.filter((n) => n.type !== "message" && n.type !== "group_message");
  const unreadCount = visibleNotifs.filter((n) => !n.is_read).length;

  // Marquer toutes comme lues quand on ouvre le panneau
  const handleOpen = async () => {
    const newOpen = !open;
    setOpen(newOpen);
    if (newOpen && unreadCount > 0) {
      const unread = visibleNotifs.filter((n) => !n.is_read);
      await Promise.all(unread.map((n) => base44.entities.Notification.update(n.id, { is_read: true })));
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  const handleClick = async (notif) => {
    setOpen(false);
    if (notif.link_page && notif.link_param) {
      navigate(`${createPageUrl(notif.link_page)}?${notif.link_param}`);
    } else if (notif.link_page) {
      navigate(createPageUrl(notif.link_page));
    }
  };

  const formatTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  };

  const bellColor = dark ? "text-stone-600" : "text-white";
  const hoverBg = dark ? "hover:bg-stone-100" : "hover:bg-white/20";

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className={`relative w-16 h-16 flex items-center justify-center rounded-full ${hoverBg} transition-colors`}>

        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699797b556ee6b9c51a26f9f/2ac207547_logo4.png"
          alt="notifications" className="w-20 h-20 object-contain drop-shadow-md" />


        {unreadCount > 0 &&
        <span className="absolute top-0.5 right-0.5 min-w-[22px] h-[22px] bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center px-1 shadow-lg">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        }
      </button>

      {open &&
      <>
          <div className="fixed inset-0 z-[9998] bg-black/30" onClick={() => setOpen(false)} />
          <div className="fixed right-4 top-16 z-[9999] bg-white rounded-2xl shadow-2xl w-80 max-h-[70vh] flex flex-col border border-stone-100">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 sticky top-0 bg-white rounded-t-2xl">
              <h3 className="font-bold text-stone-800">Notifications</h3>
              <button onClick={() => setOpen(false)}>
                <X className="w-4 h-4 text-stone-400" />
              </button>
            </div>

            {visibleNotifs.length === 0 ?
          <div className="py-12 text-center text-stone-400">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699797b556ee6b9c51a26f9f/2ac207547_logo4.png" alt="" className="w-8 h-8 mx-auto mb-2 opacity-30 object-contain" />
                <p className="text-sm">Aucune notification</p>
                <p className="text-xs text-stone-300 mt-1">Les messages sont dans l'onglet Messages</p>
              </div> :

          <div className="overflow-y-auto flex-1">
                {visibleNotifs.map((notif) => {
              const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.message;
              const Icon = cfg.icon;
              const senderPhoto = senderPhotos[notif.sender_email];
              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b last:border-0 ${
                    notif.type === "level_up" && !notif.is_read
                      ? "bg-amber-50 border-l-2 border-amber-400 border-b-amber-100 hover:bg-amber-100"
                      : "hover:bg-stone-50 border-stone-50"
                  }`}>

                       <div className="relative flex-shrink-0">
                         {notif.type === "level_up" ? (
                           <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-300 to-orange-400 shadow-sm">
                             <span className="text-base leading-none">🏆</span>
                           </div>
                         ) : senderPhoto ? (
                           <img src={senderPhoto} alt="" className="w-9 h-9 rounded-full object-cover" />
                         ) : (
                           <div className={`w-9 h-9 rounded-full flex items-center justify-center ${cfg.bg}`}>
                             <Icon className={`w-4 h-4 ${cfg.color}`} />
                           </div>
                         )}
                       </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-tight font-medium text-stone-800">
                          {notif.title}
                        </p>
                        <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{notif.body || getDefaultBody(notif.type)}</p>
                        <p className="text-xs text-stone-300 mt-1">{formatTime(notif.created_date)}</p>
                      </div>
                    </button>);

            })}
              </div>
          }
          </div>
        </>
      }
    </div>);

}