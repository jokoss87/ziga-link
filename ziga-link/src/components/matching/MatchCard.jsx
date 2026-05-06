import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MapPin, MessageCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserActionSheet from "@/components/home/UserActionSheet";
import { base44 } from "@/api/base44Client";
import UserStatusBadge from "@/components/profile/UserStatusBadge";

const profileCache = {};

function useOwnerProfile(createdBy) {
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    if (!createdBy) return;
    if (profileCache[createdBy] !== undefined) { setProfile(profileCache[createdBy]); return; }
    base44.entities.UserProfile.filter({ created_by: createdBy }, "-created_date", 1)
      .then(profiles => {
        const p = profiles[0] || null;
        profileCache[createdBy] = p;
        setProfile(p);
      })
      .catch(() => {});
  }, [createdBy]);
  return profile;
}

const SIZE_LABELS = { small: "Petit", medium: "Moyen", large: "Grand" };
const ENERGY_LABELS = { low: "Calme", medium: "Actif", high: "Très actif" };

export default function MatchCard({ match, rank }) {
  const { dog, score, distKm, badges, announcement } = match;
  const ownerPhoto = dog.photo_url || null;
  const ownerProfile = useOwnerProfile(dog.created_by);
  const ownerPseudo = ownerProfile?.pseudo || ownerProfile?.firstName || null;
  const [showSheet, setShowSheet] = useState(false);
  const [sheetInitialView, setSheetInitialView] = useState("main");
  const navigate = useNavigate();

  const goToProfile = () => {
    if (dog.created_by) navigate(`${createPageUrl("PublicProfile")}?email=${dog.created_by}`);
  };

  const sheetTarget = {
    ...(announcement || {
      id: dog.id,
      dog_name: dog.name,
      owner_name: ownerPseudo || "Propriétaire 🐾",
      owner_photo: ownerPhoto,
      city: dog.city || "",
      created_by: dog.created_by,
      title: dog.name,
    }),
    distKm: distKm ?? null,
    ownerStatus: ownerProfile?.user_status || null,
  };

  const scoreColor =
    score >= 80 ? "text-green-600 bg-green-50 border-green-200" :
    score >= 60 ? "text-teal-600 bg-teal-50 border-teal-200" :
    score >= 40 ? "text-amber-600 bg-amber-50 border-amber-200" :
    "text-stone-500 bg-stone-50 border-stone-200";

  const scoreBar =
    score >= 80 ? "bg-green-400" :
    score >= 60 ? "bg-teal-400" :
    score >= 40 ? "bg-amber-400" :
    "bg-stone-300";

  return (
    <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
      <div className="flex items-start gap-4 p-4">
        <div className="relative flex-shrink-0 cursor-pointer" onClick={goToProfile}>
          {ownerPhoto ? (
            <img src={ownerPhoto} alt={dog.name} className="w-16 h-16 rounded-xl object-cover border-2 border-rose-100 hover:opacity-90 transition-opacity" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-rose-50 border-2 border-rose-100 flex items-center justify-center text-3xl hover:opacity-80 transition-opacity">
              🐶
            </div>
          )}
          {rank <= 3 && (
            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-xs font-black text-white shadow">
              {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-stone-800">{dog.name}</h3>
              {ownerPseudo && (
                <button onClick={goToProfile} className="text-xs text-rose-500 font-medium hover:underline">
                  👤 {ownerPseudo}
                </button>
              )}
              {dog.breed && <p className="text-xs text-stone-400">{dog.breed}</p>}
              {ownerProfile?.user_status && (
                <div className="mt-1">
                  <UserStatusBadge status={ownerProfile.user_status} />
                </div>
              )}
            </div>
          </div>

          <div className="w-full h-1.5 bg-stone-100 rounded-full mt-2">
            <div className={`h-1.5 rounded-full transition-all ${scoreBar}`} style={{ width: `${score}%` }} />
          </div>

          <div className="flex flex-wrap gap-2 mt-2 text-xs text-stone-500">
            {dog.age_years != null && <span>🎂 {dog.age_years} an{dog.age_years > 1 ? "s" : ""}</span>}
            {dog.size && <span>📏 {SIZE_LABELS[dog.size] || dog.size}</span>}
            {dog.energy_level && <span>⚡ {ENERGY_LABELS[dog.energy_level] || dog.energy_level}</span>}
            {distKm != null && (
              <span className="flex items-center gap-0.5 text-teal-600 font-medium">
                <MapPin className="w-3 h-3" />
                {distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)} km`}
              </span>
            )}
          </div>

          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {badges.map((b, i) => (
                <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium border ${b.color}`}>
                  {b.icon} {b.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={() => { setSheetInitialView("activity"); setShowSheet(true); }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white"
          style={{ background: "linear-gradient(135deg, #FF7A59, #e8634a)" }}
        >
          <Calendar className="w-4 h-4" /> Activité
        </button>
        <button
          onClick={() => { setSheetInitialView("message"); setShowSheet(true); }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white"
          style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
        >
          <MessageCircle className="w-4 h-4" /> Message
        </button>
      </div>

      {showSheet && createPortal(
        <UserActionSheet
          announcement={sheetTarget}
          initialView={sheetInitialView}
          onClose={() => setShowSheet(false)}
        />,
        document.body
      )}
    </div>
  );
}