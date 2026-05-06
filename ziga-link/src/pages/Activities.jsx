import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { Plus, Trophy, ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ActivityCard from "@/components/activities/ActivityCard";
import ActivityRequestCard from "@/components/activities/ActivityRequestCard";
import CreateActivityModal from "@/components/activities/CreateActivityModal";
import { invalidateUserLevelCache } from "@/components/lib/userLevelCache";

import { useActivityConfig } from "@/components/lib/useActivityConfig";

export default function Activities() {
  const { user } = useUserProfile();
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [preselectedType, setPreselectedType] = useState("");
  const [expandedRequests, setExpandedRequests] = useState({});
  const { activeConfigs, getImage, getEmoji } = useActivityConfig();

  const urlParams = new URLSearchParams(window.location.search);
  const [showCreate, setShowCreate] = useState(urlParams.get("create") === "1");
  const highlightId = urlParams.get("id");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [acts, bannedProfiles] = await Promise.all([
      base44.entities.Activity.filter({ status: "open" }, "-created_date", 50),
      base44.entities.UserProfile.filter({ is_shadow_banned: true }, "-created_date", 200).catch(() => []),
    ]);
    const banned = new Set(bannedProfiles.map(p => p.created_by).filter(Boolean));
    setActivities(acts.filter(a => !banned.has(a.created_by) || a.created_by === user?.email));
    
    // Charger les demandes de l'utilisateur actuel
    if (user?.email) {
      const reqs = await base44.entities.MeetupRequest.filter(
        { created_by: user.email, type: "activity" },
        "-created_date"
      );
      setMyRequests(reqs);
    }
    setLoading(false);
  };

  // Scroll vers l'activité ciblée après chargement
  useEffect(() => {
    if (!loading && highlightId) {
      setTimeout(() => {
        const el = document.getElementById(`activity-${highlightId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }
  }, [loading, highlightId]);

  const filtered = filter === "all" ? activities : activities.filter((a) => a.type === filter);

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 px-6 py-10 text-white">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-purple-200 hover:text-white mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <h1 className="text-3xl font-black mb-1 flex items-center gap-3">
            <Trophy className="w-8 h-8" /> Activités
          </h1>
          <p className="text-purple-200 mb-5">Sports & travail canin avec la communauté</p>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-white text-purple-700 hover:bg-purple-50 font-bold gap-2 rounded-xl shadow-lg"
          >
            <Plus className="w-4 h-4" /> Créer une activité
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
         {/* Mes demandes en attente */}
         {user && myRequests.length > 0 && (
           <div className="mb-6 bg-purple-50 rounded-2xl p-4 border border-purple-200">
             <h2 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
               <MessageCircle className="w-5 h-5" /> Mes demandes ({myRequests.length})
             </h2>
             <div className="space-y-2">
               {myRequests.map((req) => {
                 const act = activities.find(a => a.id === req.announcement_id);
                 return (
                   <div key={req.id} className="bg-white rounded-lg p-3 text-sm">
                     <div className="flex items-center justify-between gap-2">
                       <div>
                         <span className="font-medium text-purple-900">{act?.title || "Activité"}</span>
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
                         className="text-xs text-purple-600 hover:text-purple-800"
                       >
                         {expandedRequests[req.id] ? "Moins" : "Détails"}
                       </button>
                     </div>
                     {expandedRequests[req.id] && (
                       <div className="mt-2 pt-2 border-t border-purple-100 space-y-1 text-xs text-stone-600">
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

         {/* Filtres dynamiques depuis ActivityConfig */}
         <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
          <button
            onClick={() => setFilter("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${filter === "all" ? "bg-purple-600 text-white border-purple-600 shadow-md" : "bg-white text-stone-600 border-stone-200 hover:border-purple-300"}`}
          >
            🌟 Toutes
          </button>
          {activeConfigs.map(cfg => (
            <button
              key={cfg.type_key}
              onClick={() => setFilter(cfg.type_key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${filter === cfg.type_key ? "bg-purple-600 text-white border-purple-600 shadow-md" : "bg-white text-stone-600 border-stone-200 hover:border-purple-300"}`}
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
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-400 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-stone-500 bg-white rounded-2xl border border-stone-100">
            <div className="text-5xl mb-4">🏋️</div>
            <p className="font-semibold text-stone-700">Aucune activité ouverte</p>
            <p className="text-sm text-stone-400 mt-1 mb-5">Créez la première !</p>
            <Button onClick={() => setShowCreate(true)} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-2">
              <Plus className="w-4 h-4" /> Créer une activité
            </Button>
          </div>
        ) : (
           <div className="space-y-3">
             {filtered.map((act) => (
               <div key={act.id}>
                 <div id={`activity-${act.id}`} className={highlightId === act.id ? "ring-2 ring-purple-400 rounded-2xl" : ""}>
                   <ActivityCard activity={act} currentUser={user} onRefresh={loadData} />
                 </div>

                 {/* Afficher les demandes reçues pour cet activité si on est le créateur */}
                 {user && act.created_by === user.email && (
                   <div className="mt-3">
                     {(() => {
                       const actRequests = activities
                         .filter(a => a.id === act.id)
                         .flatMap(() => {
                           // On devrait charger les requests dynamiquement, mais pour l'instant on les affiche via ActivityCard
                           // qui gère les pendingRequests. Ici on peut afficher un résumé.
                           return [];
                         });
                       return null;
                     })()}
                   </div>
                 )}
               </div>
             ))}
           </div>
         )}
      </div>

      {showCreate && <CreateActivityModal onClose={() => { setShowCreate(false); setPreselectedType(""); invalidateUserLevelCache(user?.email); loadData(); }} user={user} preselectedType={preselectedType} />}
    </div>
  );
}