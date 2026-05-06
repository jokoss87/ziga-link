import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { Plus, ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ActivityCard from "@/components/activities/ActivityCard";
import ActivityRequestCard from "@/components/activities/ActivityRequestCard";
import CreateActivityModal from "@/components/activities/CreateActivityModal";
import { invalidateUserLevelCache } from "@/components/lib/userLevelCache";
import { cacheInvalidate, cachedFetch } from "@/components/lib/cache";
import { useActivityConfig } from "@/components/lib/useActivityConfig";
import { CAT } from "@/components/lib/categoryColors";
import { OBEISSANCE_TYPES } from "@/components/lib/activityTypeConstants";

// OBEISSANCE_TYPES importé depuis activityTypeConstants
const DRESSAGE_TYPES = OBEISSANCE_TYPES;

export default function ActivitesDressage() {
  const { user } = useUserProfile();
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedRequests, setExpandedRequests] = useState({});
  const { activeConfigs, getImage, getEmoji } = useActivityConfig();

  const urlParams = new URLSearchParams(window.location.search);
  const [showCreate, setShowCreate] = useState(urlParams.get("create") === "1");
  const highlightId = urlParams.get("id");

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const unsub = base44.entities.Activity.subscribe((event) => {
      if (event.type === "create" && event.data && DRESSAGE_TYPES.includes(event.data.type) && event.data.status === "open") {
        setActivities(prev => [event.data, ...prev.filter(a => a.id !== event.data.id)]);
      } else if (event.type === "update" && event.data) {
        setActivities(prev => prev.map(a => a.id === event.data.id ? event.data : a).filter(a => a.status === "open"));
      } else if (event.type === "delete") {
        setActivities(prev => prev.filter(a => a.id !== event.id));
      }
    });
    return unsub;
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [acts, bannedProfiles] = await Promise.all([
      base44.entities.Activity.filter({ status: "open" }, "-created_date", 50),
      cachedFetch("shadow_banned_emails", () =>
        base44.entities.UserProfile.filter({ is_shadow_banned: true }, "-created_date", 200),
        5 * 60 * 1000
      ).catch(() => []),
    ]);
    const banned = new Set(bannedProfiles.map(p => p.created_by).filter(Boolean));
    const all = acts.filter(a => !banned.has(a.created_by) || a.created_by === user?.email);
    setActivities(all.filter(a => DRESSAGE_TYPES.includes(a.type)));

    if (user?.email) {
      const reqs = await base44.entities.MeetupRequest.filter(
        { created_by: user.email, type: "activity" },
        "-created_date"
      );
      setMyRequests(reqs);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!loading && highlightId) {
      setTimeout(() => {
        const el = document.getElementById(`activity-${highlightId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }
  }, [loading, highlightId]);

  const [visibleCount, setVisibleCount] = useState(4);

  // Reset au changement de filtre ou rechargement
  useEffect(() => { setVisibleCount(4); }, [filter, activities]);

  // Préchargement silencieux
  useEffect(() => {
    const filtered = filter === "all" ? activities : activities.filter(a => a.type === filter);
    const nextItems = filtered.slice(visibleCount, visibleCount + 4);
    nextItems.forEach(item => {
      if (item.organizer_photo) { const img = new Image(); img.src = item.organizer_photo; }
    });
  }, [visibleCount, activities, filter]);

  const dressageConfigs = activeConfigs.filter(cfg => DRESSAGE_TYPES.includes(cfg.type_key));
  const filtered = filter === "all" ? activities : activities.filter((a) => a.type === filter);

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <div className="px-6 py-10 text-white" style={{ background: CAT.obeissance.gradient }}>
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-violet-100 hover:text-white mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <h1 className="text-3xl font-black mb-1">🎓 Dressage & Obéissance</h1>
          <p className="text-violet-100 mb-5">Éducation canine avec la communauté</p>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-white text-violet-700 hover:bg-violet-50 font-bold gap-2 rounded-xl shadow-lg"
          >
            <Plus className="w-4 h-4" /> Créer une activité
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {user && myRequests.length > 0 && (
          <div className="mb-6 bg-violet-50 rounded-2xl p-4 border border-violet-200">
            <h2 className="font-bold text-violet-900 mb-3 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" /> Mes demandes ({myRequests.length})
            </h2>
            <div className="space-y-2">
              {myRequests.map((req) => {
                const act = activities.find(a => a.id === req.announcement_id);
                return (
                  <div key={req.id} className="bg-white rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-medium text-violet-900">{act?.title || "Activité"}</span>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                          req.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                          req.status === "accepted" ? "bg-green-100 text-green-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {req.status === "pending" ? "⏳ En attente" :
                           req.status === "accepted" ? "✅ Acceptée" :
                           "❌ Refusée"}
                        </span>
                      </div>
                      <button
                        onClick={() => setExpandedRequests(prev => ({ ...prev, [req.id]: !prev[req.id] }))}
                        className="text-xs text-violet-600 hover:text-violet-800"
                      >
                        {expandedRequests[req.id] ? "Moins" : "Détails"}
                      </button>
                    </div>
                    {expandedRequests[req.id] && (
                      <div className="mt-2 pt-2 border-t border-violet-100 space-y-1 text-xs text-stone-600">
                        <div>🐕 <strong>{req.requester_dog_name}</strong></div>
                        {req.message && <div className="italic">"{req.message}"</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
          <button
            onClick={() => setFilter("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${filter === "all" ? "bg-violet-500 text-white border-violet-500 shadow-md" : "bg-white text-stone-600 border-stone-200 hover:border-violet-300"}`}
          >
            🌟 Toutes
          </button>
          {dressageConfigs.map(cfg => (
            <button
              key={cfg.type_key}
              onClick={() => setFilter(cfg.type_key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${filter === cfg.type_key ? "bg-violet-500 text-white border-violet-500 shadow-md" : "bg-white text-stone-600 border-stone-200 hover:border-violet-300"}`}
            >
              {getImage(cfg.type_key)
                ? <img src={getImage(cfg.type_key)} alt="" className="w-4 h-4 object-cover rounded-sm flex-shrink-0" />
                : <span>{getEmoji(cfg.type_key)}</span>
              }
              {cfg.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-violet-400 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-stone-500 bg-white rounded-2xl border border-stone-100">
            <div className="text-5xl mb-4">🎓</div>
            <p className="font-semibold text-stone-700">Aucune séance ouverte</p>
            <p className="text-sm text-stone-400 mt-1 mb-5">Créez la première !</p>
            <Button onClick={() => setShowCreate(true)} className="bg-violet-500 hover:bg-violet-600 text-white rounded-xl gap-2">
              <Plus className="w-4 h-4" /> Créer une séance
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.slice(0, visibleCount).map((act) => (
              <div key={act.id} id={`activity-${act.id}`} className={highlightId === act.id ? "ring-2 ring-violet-400 rounded-2xl" : ""}>
                <ActivityCard activity={act} currentUser={user} onRefresh={loadData} />
              </div>
            ))}
            {visibleCount < filtered.length && (
              <button
                onClick={() => setVisibleCount(prev => prev + 4)}
                className="w-full py-3 text-sm font-semibold text-teal-600 bg-teal-50 rounded-2xl hover:bg-teal-100 transition-colors"
              >
                Voir plus ({filtered.length - visibleCount} séances)
              </button>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateActivityModal
          onClose={() => { setShowCreate(false); invalidateUserLevelCache(user?.email); cacheInvalidate("home_activities"); loadData(); }}
          user={user}
          preselectedType=""
          preselectedCategory="obeissance"
        />
      )}
    </div>
  );
}