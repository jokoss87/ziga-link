import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useOwnerPhoto } from "@/components/useOwnerPhoto";
import { useUserProfileContext } from "@/components/lib/UserProfileContext";
import { ArrowLeft, MapPin, Calendar, MessageCircle, UserPlus, Clock, CheckCircle } from "lucide-react";
import DogDetailModal from "@/components/profile/DogDetailModal";
import InviteModal from "@/components/profile/InviteModal";

// Lightbox simple
function Lightbox({ url, onClose }) {
  if (!url) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.9)" }}
      onClick={onClose}
    >
      <img
        src={url}
        alt=""
        className="max-w-[90vw] max-h-[90vh] rounded-2xl object-contain"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}

// Barre de caractère 1-5
function TraitBar({ label, value, color = "#0d9488" }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 text-stone-500 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
        <div className="h-2 rounded-full" style={{ width: `${(value / 5) * 100}%`, background: color }} />
      </div>
      <span className="text-stone-400 w-3">{value}</span>
    </div>
  );
}

export default function PublicProfile() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile: myProfile } = useUserProfileContext();

  const targetEmail = new URLSearchParams(location.search).get("email");
  const currentUserEmail = user?.email;
  const isOwnProfile = targetEmail === currentUserEmail;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [dogs, setDogs] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [dogLevelMap, setDogLevelMap] = useState({});
  const [friendStatus, setFriendStatus] = useState("none"); // none | pending | friend
  const [addingFriend, setAddingFriend] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [selectedDog, setSelectedDog] = useState(null);
  const [inviteType, setInviteType] = useState(null); // "balade" | "sport" | null
  const [sendingMsg, setSendingMsg] = useState(false);

  const ownerPhoto = useOwnerPhoto(targetEmail, profile?.photo_url);

  useEffect(() => {
    if (!targetEmail) return;
    loadAll();
  }, [targetEmail]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [profiles, dogsRes, annsRes, obedienceRes, friendRes] = await Promise.all([
        base44.entities.UserProfile.filter({ created_by: targetEmail }, "-created_date", 1).catch(() => []),
        base44.entities.DogProfile.filter({ created_by: targetEmail }, "-created_date", 10).catch(() => []),
        base44.entities.MeetupAnnouncement.filter({ created_by: targetEmail, status: "open" }, "-created_date", 5).catch(() => []),
        base44.entities.ObedienceJournal.filter({ owner_id: targetEmail }, "-last_updated", 10).catch(() => []),
        !isOwnProfile && currentUserEmail
          ? base44.functions.invoke("getFriendList", {}).catch(() => ({ data: {} }))
          : Promise.resolve({ data: {} }),
      ]);

      setProfile(profiles[0] || null);
      setDogs(dogsRes);
      setAnnouncements(annsRes);

      // Build dogLevelMap from obedience journals
      const map = {};
      obedienceRes.forEach(j => {
        if (j.dog_id) {
          map[j.dog_id] = {
            level: j.current_level || 1,
            xp_total: j.total_xp || 0,
            badges: j.badges || [],
          };
        }
      });
      setDogLevelMap(map);

      // Friend status
      if (!isOwnProfile && friendRes?.data) {
        const fr = friendRes.data?.list || {};
        const friends = fr.friends || [];
        const sent = fr.friend_requests_sent || [];
        if (friends.includes(targetEmail)) setFriendStatus("friend");
        else if (sent.includes(targetEmail)) setFriendStatus("pending");
        else setFriendStatus("none");
      }
    } catch (err) {
      console.error("PublicProfile loadAll error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (addingFriend || friendStatus !== "none") return;
    setAddingFriend(true);
    try {
      await base44.functions.invoke("friendActions", { action: "send", targetEmail });
      setFriendStatus("pending");
    } catch (err) {
      console.error("Add friend error:", err);
    } finally {
      setAddingFriend(false);
    }
  };

  const getOrCreateConversation = async () => {
    if (!currentUserEmail || !targetEmail) return null;
    try {
      const mine = await base44.entities.Conversation.filter({ members: currentUserEmail }, "-last_message_at", 50);
      const existing = mine.find(c =>
        c.type === "private" && c.members?.includes(targetEmail)
      );
      if (existing) return existing;

      const myPseudo = myProfile?.pseudo || user?.full_name || "Moi";
      const myPhoto = myProfile?.photo_url || "";
      const created = await base44.entities.Conversation.create({
        type: "private",
        category: "social",
        members: [currentUserEmail, targetEmail],
        member_pseudos: [myPseudo, profile?.pseudo || ""],
        member_photos: [myPhoto, profile?.photo_url || ""],
        unread_counts: {},
      });
      return created;
    } catch (err) {
      console.error("getOrCreateConversation error:", err);
      return null;
    }
  };

  const handleMessage = async () => {
    if (sendingMsg) return;
    setSendingMsg(true);
    try {
      const conv = await getOrCreateConversation();
      if (conv) navigate(`${createPageUrl("GroupChat")}?id=${conv.id}`);
    } finally {
      setSendingMsg(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-400 border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-4 px-6">
        <div className="text-5xl">🐾</div>
        <p className="font-bold text-stone-700">Profil introuvable</p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 bg-teal-500 text-white rounded-2xl font-bold"
        >
          Retour
        </button>
      </div>
    );
  }

  const firstDog = dogs[0];
  const joinDate = profile?.created_date
    ? new Date(profile.created_date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 left-4 z-50 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow flex items-center justify-center"
      >
        <ArrowLeft className="w-5 h-5 text-stone-700" />
      </button>

      {/* Bannière */}
      <div className="relative w-full overflow-hidden" style={{ height: 130 }}>
        {firstDog?.photo_url ? (
          <img
            src={firstDog.photo_url}
            alt=""
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => setLightboxUrl(firstDog.photo_url)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-5xl"
            style={{ background: "linear-gradient(135deg, #0d9488, #5DCAA5)" }}
          >
            🐕
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 60%)" }}
        />
        {firstDog?.name && (
          <span className="absolute bottom-2 right-3 text-white text-xs font-bold bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-sm">
            {firstDog.name}
          </span>
        )}
      </div>

      {/* Identity row */}
      <div className="flex items-start justify-between px-4" style={{ marginTop: -36 }}>
        <div
          className="w-[72px] h-[72px] rounded-full border-4 border-white shadow-lg flex-shrink-0 overflow-hidden bg-teal-100 flex items-center justify-center cursor-pointer z-10 relative"
          onClick={() => ownerPhoto && setLightboxUrl(ownerPhoto)}
          style={{ zIndex: 10 }}
        >
          {ownerPhoto ? (
            <img src={ownerPhoto} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-black text-teal-600">
              {profile.pseudo?.[0]?.toUpperCase() || "?"}
            </span>
          )}
        </div>

        {/* Action : add friend OR "C'est votre profil" */}
        {isOwnProfile ? (
          <div className="mt-10 px-3 py-1.5 bg-stone-100 rounded-xl text-xs text-stone-500 font-medium">
            C'est votre profil
          </div>
        ) : (
          <button
            onClick={handleAddFriend}
            disabled={addingFriend || friendStatus !== "none"}
            className={`mt-10 flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition-all ${
              friendStatus === "friend"
                ? "bg-teal-50 text-teal-600 border border-teal-200"
                : friendStatus === "pending"
                ? "bg-amber-50 text-amber-600 border border-amber-200"
                : "bg-teal-500 text-white hover:bg-teal-600 active:scale-95"
            }`}
          >
            {friendStatus === "friend" ? (
              <><CheckCircle className="w-3.5 h-3.5" /> Amis 🐾</>
            ) : friendStatus === "pending" ? (
              <><Clock className="w-3.5 h-3.5" /> Demande envoyée ⏳</>
            ) : (
              <><UserPlus className="w-3.5 h-3.5" /> {addingFriend ? "..." : "Ajouter en ami"}</>
            )}
          </button>
        )}
      </div>

      {/* Infos profil */}
      <div className="px-4 pt-2 pb-3">
        <h1 className="text-xl font-black text-stone-800">{profile.pseudo}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
          {profile.city && (
            <span className="flex items-center gap-1 text-xs text-stone-400">
              <MapPin className="w-3 h-3" /> {profile.city}
            </span>
          )}
          {joinDate && (
            <span className="flex items-center gap-1 text-xs text-stone-400">
              <Calendar className="w-3 h-3" /> Membre depuis {joinDate}
            </span>
          )}
        </div>
        {profile.bio && <p className="text-sm text-stone-600 mt-2 leading-relaxed">{profile.bio}</p>}
        {profile.preferred_activities?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {profile.preferred_activities.map(a => (
              <span key={a} className="text-xs bg-teal-50 border border-teal-100 text-teal-700 rounded-full px-2 py-0.5 font-medium">{a}</span>
            ))}
          </div>
        )}
      </div>

      {/* Boutons d'action */}
      {!isOwnProfile && (
        <div className="px-4 pb-4 space-y-2">
          <button
            onClick={handleMessage}
            disabled={sendingMsg}
            className="w-full py-3 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 active:scale-95 transition-all"
            style={{ background: "linear-gradient(135deg, #0d9488, #5DCAA5)" }}
          >
            <MessageCircle className="w-4 h-4" />
            {sendingMsg ? "Ouverture..." : "Message"}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setInviteType("balade")}
              className="py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all border"
              style={{ background: "#e1f5ee", borderColor: "#a7f3d0", color: "#065f46" }}
            >
              🐾 Inviter balade
            </button>
            <button
              onClick={() => setInviteType("sport")}
              className="py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all border"
              style={{ background: "#EEEDFE", borderColor: "#c4b5fd", color: "#4c1d95" }}
            >
              🏃 Inviter activité
            </button>
          </div>
        </div>
      )}

      {/* Section Compagnons */}
      {dogs.length > 0 && (
        <div className="mb-5">
          <h2 className="font-black text-stone-800 text-base px-4 mb-3">🐕 Compagnons</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 px-4" style={{ WebkitOverflowScrolling: "touch" }}>
            {dogs.map(dog => {
              const lvl = dogLevelMap[dog.id];
              const ageYears = dog.age_years || (dog.birthDate ? Math.floor((Date.now() - new Date(dog.birthDate)) / (365.25 * 86400000)) : null);
              return (
                <div
                  key={dog.id}
                  className="flex-shrink-0 bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden cursor-pointer active:scale-95 transition-all"
                  style={{ minWidth: 135 }}
                  onClick={() => setSelectedDog(dog)}
                >
                  <div
                    className="h-24 flex items-center justify-center overflow-hidden"
                    style={{ background: "linear-gradient(135deg, #f0fdf4, #d1fae5)" }}
                  >
                    {dog.photo_url ? (
                      <img src={dog.photo_url} alt="" className="w-full h-full object-cover" onClick={e => { e.stopPropagation(); setLightboxUrl(dog.photo_url); }} />
                    ) : (
                      <span className="text-4xl">🐕</span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="font-black text-stone-800 text-sm truncate">{dog.name}</p>
                    <p className="text-xs text-stone-400 truncate">{dog.breed}</p>
                    {ageYears !== null && <p className="text-xs text-stone-400">{ageYears} an{ageYears > 1 ? "s" : ""} · {dog.gender === "male" ? "♂" : "♀"}</p>}
                    {lvl && (
                      <span className="mt-1 inline-block text-xs bg-violet-100 text-violet-700 rounded-full px-2 py-0.5 font-semibold">🎓 Niv. {lvl.level}</span>
                    )}
                    <p className="text-xs text-teal-600 font-semibold mt-1.5">Voir la fiche →</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section Balades */}
      {announcements.length > 0 && (
        <div className="px-4 mb-6">
          <h2 className="font-black text-stone-800 text-base mb-3">🐾 Balades proposées</h2>
          <div className="space-y-3">
            {announcements.map(ann => (
              <div key={ann.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 flex items-center gap-3">
                <div className="text-2xl flex-shrink-0">🐾</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-stone-800 text-sm truncate">{ann.title}</p>
                  <p className="text-xs text-stone-400 truncate">
                    {ann.date} {ann.time ? `· ${ann.time}` : ""} {ann.city ? `· ${ann.city}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`${createPageUrl("AnnouncementDetail")}?id=${ann.id}`)}
                  className="flex-shrink-0 px-3 py-1.5 bg-teal-500 text-white text-xs font-bold rounded-xl active:scale-95 transition-all"
                >
                  Rejoindre
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modales */}
      {selectedDog && (
        <DogDetailModal
          dog={selectedDog}
          levelInfo={dogLevelMap[selectedDog.id]}
          onClose={() => setSelectedDog(null)}
          onLightbox={setLightboxUrl}
        />
      )}

      {inviteType && (
        <InviteModal
          type={inviteType}
          targetEmail={targetEmail}
          targetProfile={profile}
          currentUser={user}
          myProfile={myProfile}
          getOrCreateConversation={getOrCreateConversation}
          onClose={() => setInviteType(null)}
        />
      )}

      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
}