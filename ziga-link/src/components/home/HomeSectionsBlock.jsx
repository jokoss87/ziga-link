import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "@/lib/routes";
import { createPageUrl } from "@/utils";
import { Plus, MapPin, Calendar, Lightbulb, Trash2, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cachedFetch } from "@/components/lib/cache";
import MiniMap from "@/components/home/MiniMap";
import { CAT } from "@/components/lib/categoryColors";
import { SPORT_TYPES, OBEISSANCE_TYPES } from "@/components/lib/activityTypeConstants";
import EventBannerCard from "@/components/events/EventBannerCard";
import { parseUTC } from "@/components/lib/dateUtils";

const ADMIN_EMAIL = "jotouillez@gmail.com";

// Image avec placeholder pulse et fallback emoji
function ImgWithFallback({ src, fallback = "🐶", className = "w-full h-full object-cover" }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  if (error) return <div className="w-full h-full flex items-center justify-center text-4xl">{fallback}</div>;
  return (
    <div className="relative w-full h-full">
      {!loaded && <div className="absolute inset-0 bg-stone-200 animate-pulse" />}
      <img
        src={src}
        alt=""
        loading="lazy"
        className={className}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}

// Lazy photo loader
function useBestPhoto(ann) {
  const dogPhoto = ann.dog_photo && ann.dog_photo.startsWith('http') ? ann.dog_photo : null;
  const [photo, setPhoto] = useState(dogPhoto);
  const ref = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (dogPhoto) return;
    setShouldLoad(true);
  }, [ann.id, dogPhoto]);

  useEffect(() => {
    if (!shouldLoad || dogPhoto) return;
    const dogId = ann.dog_id || (Array.isArray(ann.dog_ids) && ann.dog_ids[0]) || null;
    if (!dogId) return;
    const key = `dogphoto_${dogId}`;
    cachedFetch(key, async () => {
      const dogs = await base44.entities.DogProfile.filter({ created_by: ann.created_by }, "-created_date", 10);
      const match = dogs.find((d) => d.id === dogId);
      return match?.photo_url || null;
    }, 5 * 60 * 1000).then((url) => { if (url) setPhoto(url); }).catch(() => {});
  }, [shouldLoad, ann.id, dogPhoto]);

  return { photo, ref };
}

function DogCard({ ann, borderColor, linkTo, currentUser, onRefresh, entityType = "MeetupAnnouncement" }) {
  const navigate = useNavigate();
  const { photo, ref } = useBestPhoto(ann);
  const isToday = ann.date && parseUTC(ann.date).toDateString() === new Date().toDateString();
  const dateLabel = ann.date ?
    parseUTC(ann.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) :
    null;
  const isAdmin = currentUser?.email === ADMIN_EMAIL;
  const touchStart = useRef(null);

  const handleAdminDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("🛡️ [ADMIN] Supprimer définitivement ?")) return;
    try {
      if (entityType === "Activity") {
        await base44.entities.Activity.delete(ann.id);
      } else {
        await base44.entities.MeetupAnnouncement.delete(ann.id);
      }
    } catch (err) {
      console.warn("handleAdminDelete: entité déjà supprimée ou introuvable", ann.id, err.message);
    }
    onRefresh?.();
  };

  return (
    <div className="relative flex-shrink-0">
      <Link
        to={linkTo || `${ROUTES.announcementDetail}?id=${ann.id}`}
        className="block w-44 bg-white rounded-3xl shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 active:scale-95"
        style={{ border: `2px solid ${borderColor || "#e7e5e4"}`, touchAction: "manipulation" }}
        onTouchStart={(e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchEnd={(e) => {
          if (!touchStart.current) return;
          const dx = Math.abs(e.changedTouches[0].clientX - touchStart.current.x);
          const dy = Math.abs(e.changedTouches[0].clientY - touchStart.current.y);
          touchStart.current = null;
          if (dx > 10 || dy > 10) e.preventDefault();
        }}>
        <div ref={ref} className="h-28 relative overflow-hidden bg-stone-200" style={{ background: "linear-gradient(135deg, #fef3c7, #fed7aa)" }}>
          {photo ? (
            <ImgWithFallback src={photo} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🐶</div>
          )}
          <div className="absolute top-2 left-2">
            {isToday ?
              <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">Aujourd'hui</span> :
              <span className="bg-white/80 text-stone-600 text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm">Dispo</span>
            }
          </div>
        </div>
        <div className="p-3">
          <p className="font-black text-stone-800 text-sm truncate">{ann.dog_name || ann.title || "Chien"}</p>
          <p
            className={`text-stone-400 text-xs truncate mb-1.5 ${ann.created_by ? "cursor-pointer hover:text-teal-500 transition-colors" : ""}`}
            onClick={ann.created_by ? (e) => { e.preventDefault(); e.stopPropagation(); navigate(`${createPageUrl("PublicProfile")}?email=${ann.created_by}`); } : undefined}
          >{ann.owner_name || ann.organizer_name}</p>
          {ann.city &&
            <p className="text-xs text-orange-500 flex items-center gap-1 truncate mb-1">
              <MapPin className="w-3 h-3 flex-shrink-0" /> {ann.city}
            </p>
          }
          {dateLabel &&
            <p className="text-xs text-stone-400 flex items-center gap-1 truncate mb-1">
              <Calendar className="w-3 h-3 flex-shrink-0" /> {dateLabel}
            </p>
          }
          {ann.time &&
            <p className="text-xs text-stone-500 flex items-center gap-1 truncate mb-1.5 font-semibold">
              <Clock className="w-3 h-3 flex-shrink-0" /> {ann.time}
            </p>
          }
          {!ann.time && <div className="mb-1.5" />}
          <div className="text-center py-1.5 rounded-2xl font-bold text-xs text-white" style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}>
            Rejoindre 🐾
          </div>
        </div>
      </Link>
      {isAdmin &&
        <button
          onClick={handleAdminDelete}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 flex items-center justify-center shadow-md hover:bg-red-600 transition-colors z-10"
          title="Supprimer (admin)">
          <Trash2 className="w-3.5 h-3.5 text-white" />
        </button>
      }
    </div>
  );
}

function Section({ title, emoji, color, items, addPage, addLabel, borderColor, addQuery = "", itemLinkFn, entityType, currentUser, onRefresh }) {
  const addUrl = addPage + addQuery;
  const [visibleCount, setVisibleCount] = useState(4);

  useEffect(() => { setVisibleCount(4); }, [items]);

  useEffect(() => {
    const nextItems = items.slice(visibleCount, visibleCount + 4);
    nextItems.forEach(item => {
      const src = item.dog_photo;
      if (src) { const img = new Image(); img.src = src; }
    });
  }, [visibleCount, items]);

  const visible = items.slice(0, visibleCount);
  const remaining = items.length - visibleCount;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-4">
        <h2 className="font-black text-stone-800 text-base">{emoji} {title}</h2>
      </div>
      {items.length === 0 ? (
        <div className="mx-4">
          <Link
            to={addUrl}
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-dashed border-stone-200 bg-stone-50 text-stone-400 text-sm"
            style={{ touchAction: "manipulation" }}>
            <Plus className="w-4 h-4" />
            <span>{addLabel}</span>
          </Link>
        </div>
      ) : (
        <>
          <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide" style={{ WebkitOverflowScrolling: "touch", scrollSnapType: "x mandatory" }}>
            {visible.map((ann) =>
              <DogCard
                key={ann.id}
                ann={ann}
                borderColor={borderColor}
                linkTo={itemLinkFn ? itemLinkFn(ann) : undefined}
                currentUser={currentUser}
                onRefresh={onRefresh}
                entityType={entityType} />
            )}
            <Link
              to={addUrl}
              className="flex-shrink-0 w-32 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2 p-3"
              style={{ background: "rgba(76,175,135,0.06)", borderColor: "#4CAF87", touchAction: "manipulation" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}>
                <Plus className="w-4 h-4 text-white" />
              </div>
              <p className="text-xs font-bold text-center leading-tight" style={{ color: "#4CAF87" }}>Proposer</p>
            </Link>
          </div>
          {remaining > 0 && (
            <div className="px-4 mt-2">
              <button
                onClick={() => setVisibleCount(prev => prev + 4)}
                className="w-full py-3 text-sm font-semibold text-teal-600 bg-teal-50 rounded-2xl hover:bg-teal-100 transition-colors"
              >
                Voir plus ({remaining} {entityType === "Activity" ? "activités" : "balades"})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SuggestionDuJour({ items }) {
  if (!items.length) return null;
  const suggestion = items[Math.floor(Math.random() * items.length)];
  const isActivity = !!suggestion.type;
  const linkTo = isActivity ?
    `${ROUTES.activityDetail}?id=${suggestion.id}` :
    `${ROUTES.announcementDetail}?id=${suggestion.id}`;
  const label = isActivity ? suggestion.title : suggestion.dog_name || suggestion.title || "Balade";
  const sub = isActivity ? suggestion.type : suggestion.title;

  return (
    <div className="mx-4 mb-4 rounded-3xl p-4 border border-amber-200 bg-amber-50 hidden">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-black text-amber-700 uppercase tracking-wide">Suggestion du jour</span>
      </div>
      <Link to={linkTo} className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-200 flex items-center justify-center text-2xl flex-shrink-0">
          {isActivity ? "🏃" : "🐾"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-stone-800 text-sm truncate">{label}</p>
          <p className="text-xs text-stone-500 truncate">{sub}</p>
          {suggestion.city && <p className="text-xs text-orange-500 truncate">📍 {suggestion.city}</p>}
        </div>
        <div className="px-3 py-1.5 rounded-2xl font-bold text-xs text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}>
          Rejoindre
        </div>
      </Link>
    </div>
  );
}

function useEventButton() {
  const [showEventButton, setShowEventButton] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      base44.entities.EventBanner.list().then(banners => {
        if (cancelled) return;
        const b = banners[0];
        if (b && b.show_event_button === true) {
          setShowEventButton(true);
        }
      }).catch(() => {});
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return { showEventButton };
}

export default function HomeSectionsBlock({ announcements, activities, loading, currentUser, shadowEmails, onRefresh }) {
  const { showEventButton } = useEventButton();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const safeAnnouncements = shadowEmails ? announcements.filter((a) => !shadowEmails.has(a.created_by)) : announcements;
  const safeActivities = shadowEmails ? activities.filter((a) => !shadowEmails.has(a.created_by)) : activities;
  const validAnnouncements = safeAnnouncements.filter((ann) => {
    if (!ann.date) return true;
    const todayStr = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");
    const annDateStr = ann.date.slice(0, 10);
    return annDateStr >= todayStr;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2].map((i) =>
          <section key={i}>
            <div className="flex items-center justify-between mb-3 px-4">
              <div className="h-5 w-40 bg-stone-200 rounded-full animate-pulse" />
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 px-4">
              {[1, 2, 3].map((j) =>
                <div key={j} className="flex-shrink-0 w-44 h-52 bg-white rounded-3xl animate-pulse border border-stone-100" />
              )}
            </div>
          </section>
        )}
      </div>
    );
  }

  const sportTypes = SPORT_TYPES;
  const obedTypes = OBEISSANCE_TYPES;

  const sportives = safeActivities.filter((a) => sportTypes.includes(a.type));
  const obeissance = safeActivities.filter((a) => obedTypes.includes(a.type));
  const autres = safeActivities.filter((a) => !sportTypes.includes(a.type) && !obedTypes.includes(a.type));

  const allItems = [...validAnnouncements, ...safeActivities];

  return (
    <div className="space-y-6">
      {showEventButton && (
        <div className="px-4">
          <button
            onClick={() => {
              const el = document.getElementById("event-banner-section");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff" }}
          >
            🎉 Événements
          </button>
        </div>
      )}
      <div id="balade-du-jour">
        <Section
          title="Balade du jour"
          emoji="🐾"
          color={CAT.balade.textLight}
          items={validAnnouncements}
          addPage={ROUTES.createAnnouncement}
          addLabel="Proposer une balade"
          borderColor={CAT.balade.hex}
          entityType="MeetupAnnouncement"
          currentUser={currentUser}
          onRefresh={onRefresh} />
      </div>
      <MiniMap announcements={validAnnouncements} currentUser={currentUser} />
      <div id="activities-section">
        <Section
          title="Activités sportives"
          emoji="🏃"
          color={CAT.sport.textLight}
          items={sportives}
          addPage={ROUTES.sport}
          addLabel="Proposer une activité"
          borderColor={CAT.sport.hex}
          itemLinkFn={(act) => `${ROUTES.activityDetail}?id=${act.id}`}
          entityType="Activity"
          currentUser={currentUser}
          onRefresh={onRefresh} />
        <Section
          title="Obéissance"
          emoji="🏋️"
          color={CAT.obeissance.textLight}
          items={obeissance}
          addPage={ROUTES.dressage}
          addLabel="Proposer une séance"
          borderColor={CAT.obeissance.hex}
          itemLinkFn={(act) => `${ROUTES.activityDetail}?id=${act.id}`}
          entityType="Activity"
          currentUser={currentUser}
          onRefresh={onRefresh} />
        {autres.length > 0 &&
          <Section
            title="Autres activités"
            emoji="✨"
            items={autres}
            addPage={ROUTES.sport}
            addLabel="Proposer une activité"
            borderColor="#a78bfa"
            itemLinkFn={(act) => `${ROUTES.activityDetail}?id=${act.id}`}
            entityType="Activity"
            currentUser={currentUser}
            onRefresh={onRefresh} />
        }
      </div>
      <SuggestionDuJour items={allItems} />
      <div id="event-banner-section"><EventBannerCard pageName="home" /></div>
    </div>
  );
}