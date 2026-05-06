import { useState, useEffect, useRef } from "react";
import { SPORT_TYPES, OBEISSANCE_TYPES } from "@/components/lib/activityTypeConstants";
import { parseUTC } from "@/components/lib/dateUtils";
import { Link } from "react-router-dom";
import { ROUTES } from "@/lib/routes";
import { Plus, MapPin, Calendar, Lightbulb } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useOwnerPhoto } from "@/components/useOwnerPhoto";
import { base44 } from "@/api/base44Client";

// Card compacte — photo chargée via useOwnerPhoto (cache + lazy via IntersectionObserver)
function MiniDogCard({ ann }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { rootMargin: "100px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const photo = useOwnerPhoto(visible ? ann.created_by : null, ann.owner_photo || null);

  const isToday = ann.date && parseUTC(ann.date).toDateString() === new Date().toDateString();
  const dateLabel = ann.date
    ? parseUTC(ann.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
    : null;

  return (
    <Link
      ref={ref}
      to={`${ROUTES.announcementDetail}?id=${ann.id}`}
      className="flex-shrink-0 w-44 bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden active:scale-95 transition-all"
    >
      <div className="h-28 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #fef3c7, #fed7aa)" }}>
        {photo
          ? <img src={photo} alt="" className="w-full h-full object-cover" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center text-4xl">🐶</div>
        }
        <div className="absolute top-2 left-2">
          {isToday
            ? <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">Aujourd'hui</span>
            : <span className="bg-white/80 text-stone-600 text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">Dispo</span>
          }
        </div>
      </div>
      <div className="p-3">
        <p className="font-black text-stone-800 text-sm truncate">{ann.dog_name || ann.title || "Chien"}</p>
        <p className="text-stone-400 text-xs truncate mb-1.5">{ann.owner_name || ann.organizer_name}</p>
        {ann.city && (
          <p className="text-xs text-orange-500 flex items-center gap-1 truncate mb-1">
            <MapPin className="w-3 h-3 flex-shrink-0" /> {ann.city}
          </p>
        )}
        {dateLabel && (
          <p className="text-xs text-stone-400 flex items-center gap-1 truncate mb-2">
            <Calendar className="w-3 h-3 flex-shrink-0" /> {dateLabel}
          </p>
        )}
        <div className="text-center py-1.5 rounded-2xl font-bold text-xs text-white" style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}>
          Rejoindre 🐾
        </div>
      </div>
    </Link>
  );
}

// Section avec couleur cohérente : fond coloré + bordure + icône colorée
function Section({ title, emoji, color, announcements, addPage, addLabel, bg, border, iconBg }) {
  const linkTo = addPage;
  return (
    <div className="mb-3">
      {announcements.length === 0 ? (
        <Link
          to={linkTo}
          className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border ${border} ${bg} text-sm`}
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${iconBg}`}>{emoji}</div>
          <div className="flex-1">
            <p className={`font-bold text-sm ${color}`}>{title}</p>
            <p className="text-xs text-stone-400">{addLabel}</p>
          </div>
          <span className="text-stone-300 text-sm">›</span>
        </Link>
      ) : (
        <>
          <Link to={linkTo} className="flex items-center justify-between mb-2 px-1">
            <h3 className={`font-black text-sm flex items-center gap-2 ${color}`}>
              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-sm ${iconBg}`}>{emoji}</span>
              {title}
            </h3>
            <span className="text-xs text-stone-400 font-semibold">Voir tout ›</span>
          </Link>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {announcements.slice(0, 5).map(ann => <MiniDogCard key={ann.id} ann={ann} />)}
            <Link
              to={linkTo}
              className={`flex-shrink-0 w-32 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2 p-3 ${bg}`}
              style={{ borderColor: "#4CAF87" }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}>
                <Plus className="w-4 h-4 text-white" />
              </div>
              <p className="text-xs font-bold text-center leading-tight" style={{ color: "#4CAF87" }}>Proposer</p>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function SuggestionDuJour({ announcements }) {
  const suggestion = announcements[Math.floor(Math.random() * Math.max(announcements.length, 1))] || null;

  if (!suggestion) return null;

  return (
    <div className="mx-1 rounded-3xl p-4 border border-amber-200 bg-amber-50">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-black text-amber-700 uppercase tracking-wide">Suggestion du jour</span>
      </div>
      <Link to={`${ROUTES.announcementDetail}?id=${suggestion.id}`} className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-200 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
          🐾
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-stone-800 text-sm truncate">{suggestion.dog_name || "Chien"}</p>
          <p className="text-xs text-stone-500 truncate">{suggestion.title}</p>
          {suggestion.city && <p className="text-xs text-orange-500 truncate">📍 {suggestion.city}</p>}
        </div>
        <div className="px-3 py-1.5 rounded-2xl font-bold text-xs text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}>
          Rejoindre
        </div>
      </Link>
    </div>
  );
}

export default function ProposeDrawer({ open, onClose }) {
  const [announcements, setAnnouncements] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      base44.entities.MeetupAnnouncement.filter({ status: "open" }, "-created_date", 20).catch(() => []),
      base44.entities.Activity.filter({ status: "open" }, "-created_date", 20).catch(() => []),
    ]).then(([anns, acts]) => {
      setAnnouncements(anns);
      setActivities(acts);
    }).finally(() => setLoading(false));
  }, [open]);

  const balades = announcements;
  const sportives = activities.filter(a => SPORT_TYPES.includes(a.type));
  const obeissance = activities.filter(a => OBEISSANCE_TYPES.includes(a.type));
  const allForSuggestion = [...announcements, ...activities];

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent>
        <DrawerHeader className="border-b border-stone-100 pb-3">
          <DrawerTitle className="text-base font-black text-stone-800 text-left">Que voulez-vous proposer ?</DrawerTitle>
        </DrawerHeader>

        <div className="p-4 pb-8 overflow-y-auto max-h-[70vh]">
          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-stone-400 text-sm">
              <div className="w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
              Chargement…
            </div>
          ) : (
            <>
              <Section
                title="Proposer une balade"
                emoji="🐾"
                color="text-teal-700"
                announcements={balades}
                addPage={ROUTES.createAnnouncement}
                addLabel="Sortie libre avec un autre chien"
                bg="bg-teal-50"
                border="border-teal-200"
                iconBg="bg-teal-100"
              />
              <Section
                title="Activités sportives"
                emoji="🏃"
                color="text-orange-700"
                announcements={sportives}
                addPage={ROUTES.sport}
                addLabel="Canicross, agility, frisbee..."
                bg="bg-orange-50"
                border="border-orange-200"
                iconBg="bg-orange-100"
              />
              <Section
                title="Obéissance"
                emoji="🎯"
                color="text-purple-700"
                announcements={obeissance}
                addPage={ROUTES.dressage}
                addLabel="Séances de travail et dressage"
                bg="bg-purple-50"
                border="border-purple-200"
                iconBg="bg-purple-100"
              />
              <SuggestionDuJour announcements={allForSuggestion} />
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}