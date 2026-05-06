import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { User, Edit, Shield, LogOut, ChevronRight, Upload, ExternalLink, Heart, Trash2 } from "lucide-react";
import ProfilSupportSection from "@/components/support/ProfilSupportSection";
import UserStatusBadge from "@/components/profile/UserStatusBadge";
import UserStatusSelector from "@/components/profile/UserStatusSelector";
import { getLevelInfo, computeXP, getEarnedBadges } from "@/components/badges/BadgeSystem";
import { invalidateUserLevelCache } from "@/components/lib/userLevelCache";
import { compressImage } from "@/utils/imageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APP_NAME, APP_EMOJI, APP_URL, APP_SHARE_TEXT } from "@/lib/brand";

const ACTIVITIES = ["Balade", "Agility", "Canicross", "Frisbee", "Obeissance", "Pistage", "Socialisation", "Randonnee"];


export default function Profil() {
  const { user, profile, loading, setProfile } = useUserProfile();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [levelInfo, setLevelInfo] = useState(null);
  const [badgeCount, setBadgeCount] = useState(0);
  const [cguAccepted, setCguAccepted] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    pseudo: "",
    bio: "",
    city: "",
    preferred_activities: [],
    photo_url: "",
  });

  useEffect(() => {
    if (editing) return;
    setForm({
      pseudo: profile?.pseudo || user?.full_name || "",
      bio: profile?.bio || "",
      city: profile?.city || "",
      preferred_activities: Array.isArray(profile?.preferred_activities) ? profile.preferred_activities : [],
      photo_url: profile?.photo_url || "",
    });
  }, [profile, user, editing]);

  useEffect(() => {
    if (user) loadStats();
  }, [user?.email]);

  const loadStats = async () => {
    if (!user) return;
    try {
      const [sessions, dogs, announcements, activities, friendLists, journals, supports] = await Promise.all([
        base44.entities.ProgressEntry.filter({ created_by: user.email }, "-created_date", 200),
        base44.entities.DogProfile.filter({ created_by: user.email }),
        base44.entities.MeetupAnnouncement.filter({ created_by: user.email }),
        base44.entities.Activity.filter({ created_by: user.email }).catch(() => []),
        base44.entities.FriendList.filter({ user_email: user.email }).catch(() => []),
        base44.entities.ObedienceJournal.filter({ created_by: user.email }, "-created_date", 1).catch(() => []),
        base44.entities.UserSupport.filter({ user_email: user.email }).catch(() => []),
      ]);

      const journal = journals[0] || null;
      const mySupport = supports[0] || null;
      const friendList = friendLists[0] || null;
      const dailyChallengeKeys = journal?.progress
        ? Object.keys(journal.progress).filter(k => k.startsWith("daily_")).length
        : 0;

      const statsData = {
        sessions: sessions.length,
        totalMinutes: sessions.reduce((s, e) => s + (e.duration_minutes || 0), 0),
        sessionTypes: new Set(sessions.map(e => e.session_type)).size,
        meetups: announcements.filter(a => a.status === "completed").length,
        dogs: dogs.length,
        activitiesOrganized: activities.length,
        activitiesJoined: 0,
        profileComplete: !!(profile?.pseudo && profile?.city),
        balades: sessions.filter(e => e.session_type === "balade").length,
        sportSessions: sessions.filter(e => e.session_type === "sport").length,
        obedienceSessions: sessions.filter(e => e.session_type === "obeissance").length,
        friends: Array.isArray(friendList?.friends) ? friendList.friends.length : 0,
        dailyChallenges: dailyChallengeKeys,
        paymentCount: mySupport?.payment_count || 0,
        totalPaid: mySupport?.total_paid || 0,
        isMonthlySupport: mySupport?.is_monthly === true && mySupport?.status === "soutien_actif",
      };
      setLevelInfo(getLevelInfo(computeXP(statsData)));
      setBadgeCount(getEarnedBadges(statsData).length);
    } catch (err) {
      console.warn("[Profil] loadStats error:", err);
    }
  };

  const handleSave = async () => {
    if (!form.pseudo?.trim()) { setSaveError("Le pseudo est obligatoire."); return; }
    if (!form.city?.trim()) { setSaveError("La ville est obligatoire."); return; }
    if (!profile && !cguAccepted) { setSaveError("Vous devez accepter les conditions d'utilisation."); return; }

    setSaving(true);
    setSaveError(null);
    try {
      if (profile?.id) {
        const updated = await base44.entities.UserProfile.update(profile.id, form);
        setProfile(updated);
      } else {
        const created = await base44.entities.UserProfile.create({
          ...form,
          pseudo: form.pseudo.trim(),
          city: form.city.trim(),
          cgu_accepted: true,
          latitude: 0,
          longitude: 0,
          postalCode: "",
          zoneTag: "general",
        });
        setProfile(created);
      }
      invalidateUserLevelCache(user?.email);
      setEditing(false);
    } catch (err) {
      console.error("[Profil] Erreur sauvegarde:", err);
      setSaveError("La sauvegarde a échoué. Vérifiez votre connexion et réessayez.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const email = user.email;
      const [dogs, announcements, posts, friends, notifications, profiles] = await Promise.all([
        base44.entities.DogProfile.filter({ created_by: email }),
        base44.entities.MeetupAnnouncement.filter({ created_by: email }),
        base44.entities.Post.filter({ created_by: email }),
        base44.entities.FriendList.filter({ user_email: email }),
        base44.entities.Notification.filter({ user_email: email }),
        base44.entities.UserProfile.filter({ created_by: email }),
      ]);
      await Promise.all([
        ...dogs.map(d => base44.entities.DogProfile.delete(d.id)),
        ...announcements.map(a => base44.entities.MeetupAnnouncement.delete(a.id)),
        ...posts.map(p => base44.entities.Post.delete(p.id)),
        ...friends.map(f => base44.entities.FriendList.delete(f.id)),
        ...notifications.map(n => base44.entities.Notification.delete(n.id)),
        ...profiles.map(p => base44.entities.UserProfile.delete(p.id)),
      ]);
      await base44.auth.logout();
    } catch (err) {
      console.error("[Profil] Erreur suppression compte:", err);
      alert("Une erreur est survenue. Contactez contact@zigalink.fr");
      setDeleting(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
      setForm(f => ({ ...f, photo_url: file_url }));
    } catch (err) {
      console.error("Erreur upload photo:", err);
    } finally {
      setUploading(false);
    }
  };

  const toggleActivity = (act) => {
    setForm(f => ({
      ...f,
      preferred_activities: f.preferred_activities.includes(act)
        ? f.preferred_activities.filter(a => a !== act)
        : [...f.preferred_activities, act],
    }));
  };

  const completionSteps = [
    { key: "photo", label: "Photo de profil", done: !!form.photo_url },
    { key: "pseudo", label: "Pseudo", done: !!form.pseudo?.trim() },
    { key: "city", label: "Ville", done: !!form.city?.trim() },
    { key: "activities", label: "Activités préférées", done: form.preferred_activities?.length > 0 },
    { key: "bio", label: "À propos", done: !!form.bio?.trim() },
  ];
  const profilePct = Math.round((completionSteps.filter(s => s.done).length / completionSteps.length) * 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent" />
      </div>
    );
  }

  const displayPhoto = form.photo_url || profile?.photo_url;
  const displayName = profile?.pseudo || user?.full_name || "Mon profil";

  return (
    <div className="min-h-screen bg-stone-50 pb-36">
      <div className="bg-gradient-to-br from-teal-600 via-emerald-600 to-green-700 px-6 pt-10 pb-16 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <div className="relative inline-block mb-4">
            {displayPhoto ? (
              <img src={displayPhoto} alt="profil" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-white/30 flex items-center justify-center border-4 border-white shadow-lg">
                <User className="w-10 h-10 text-white" />
              </div>
            )}
            {editing && (
              <label className="absolute bottom-0 right-0 bg-white text-teal-600 rounded-full p-1.5 cursor-pointer shadow-md">
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                <Upload className="w-3.5 h-3.5" />
              </label>
            )}
          </div>
          <h1 className="text-2xl font-black">{displayName}</h1>
          <p className="text-teal-200 text-sm mt-1">{user?.email}</p>
          {profile?.city && <p className="text-teal-100 text-sm mt-1">📍 {profile.city}</p>}
          {profile && (
            <div className="mt-2">
              <UserStatusBadge status={profile.user_status || "disponible"} size="lg" />
            </div>
          )}
          {levelInfo && (
            <div className="mt-3 flex items-center justify-center gap-3">
              <span className="text-2xl">{levelInfo.emoji}</span>
              <div className="text-center">
                <div className="font-bold text-sm text-white">Niv. {levelInfo.level} — {levelInfo.label}</div>
                <div className="text-xs text-teal-200">{levelInfo.xp} XP · {badgeCount} badges</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-6 relative z-10">
        <div className="bg-white rounded-2xl shadow-md border border-stone-100 overflow-hidden mb-4">
          <div className="flex items-center justify-between p-4 border-b border-stone-100">
            <h2 className="font-bold text-stone-800">Mon profil</h2>
            {editing ? (
              <Button type="button" onClick={handleSave} disabled={saving} size="sm" className="rounded-xl bg-teal-500 hover:bg-teal-600 text-white">
                {saving ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
            ) : (
              <Button type="button" onClick={() => setEditing(true)} size="sm" className="rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200">
                Modifier
              </Button>
            )}
          </div>

          <div className="p-4 space-y-4">
            {editing && (
              <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-teal-800">Complétude du profil</span>
                  <span className={`text-sm font-black ${profilePct === 100 ? "text-emerald-600" : "text-teal-600"}`}>{profilePct}%</span>
                </div>
                <div className="w-full h-2.5 bg-teal-100 rounded-full overflow-hidden mb-3">
                  <div className={`h-2.5 rounded-full transition-all duration-500 ${profilePct === 100 ? "bg-emerald-500" : "bg-teal-500"}`} style={{ width: `${profilePct}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {completionSteps.map(step => (
                    <div key={step.key} className="flex items-center gap-1.5">
                      <span className={`text-xs ${step.done ? "text-emerald-500" : "text-stone-300"}`}>{step.done ? "✓" : "○"}</span>
                      <span className={`text-xs ${step.done ? "text-stone-600" : "text-stone-400"}`}>{step.label}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 col-span-2">
                    <Link to={createPageUrl("MyDogs")} className="flex items-center gap-1.5 group">
                      <span className="text-xs text-amber-500">🐕</span>
                      <span className="text-xs text-amber-600 font-semibold underline underline-offset-2">+ Ajouter un profil chien pour matcher !</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}
            {saveError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-medium">⚠️ {saveError}</div>
            )}
            {editing ? (
              <>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">Pseudo</label>
                  <Input value={form.pseudo} onChange={e => setForm(f => ({ ...f, pseudo: e.target.value }))} className="border-stone-200" placeholder="Votre pseudo" autoComplete="off" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">Ville</label>
                  <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Ex: Lyon" className="border-stone-200" autoComplete="off" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">Activites preferees</label>
                  <div className="flex flex-wrap gap-2">
                    {ACTIVITIES.map(act => (
                      <button key={act} type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); toggleActivity(act); }}
                        className={"px-3 py-1 rounded-full text-sm font-medium border transition-all " + (form.preferred_activities?.includes(act) ? "bg-teal-500 text-white border-teal-500" : "bg-stone-50 text-stone-600 border-stone-200")}>
                        {act}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">A propos</label>
                  <Textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} className="border-stone-200" placeholder="Parlez de vous et de vos chiens..." />
                </div>
                {!profile && (
                  <div className={"flex items-start gap-3 p-4 rounded-2xl border-2 transition-colors " + (cguAccepted ? "border-teal-400 bg-teal-50" : "border-stone-200 bg-stone-50")}>
                    <input type="checkbox" id="cgu-checkbox" checked={cguAccepted} onChange={e => setCguAccepted(e.target.checked)} className="mt-0.5 w-4 h-4 accent-teal-500 flex-shrink-0 cursor-pointer" />
                    <div className="flex-1 min-w-0">
                      <label htmlFor="cgu-checkbox" className="text-sm text-stone-700 font-medium cursor-pointer leading-snug">
                        J'ai lu et j'accepte les{" "}
                        <Link to={createPageUrl("CGU")} target="_blank" className="text-teal-600 font-bold underline underline-offset-2 inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          conditions d'utilisation <ExternalLink className="w-3 h-3" />
                        </Link>
                      </label>
                      <p className="text-xs text-stone-400 mt-0.5">Obligatoire pour creer votre profil</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {profile?.bio && <p className="text-stone-600 text-sm">{profile.bio}</p>}
                {profile?.preferred_activities?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(profile.preferred_activities || []).map(act => (
                      <span key={act} className="bg-teal-50 text-teal-700 text-xs font-medium px-2 py-1 rounded-full border border-teal-100">{act}</span>
                    ))}
                  </div>
                )}
                {profile && (
                  <div className="pt-2">
                    <label className="block text-sm font-semibold text-stone-700 mb-2">Mon statut</label>
                    <UserStatusSelector profileId={profile.id} currentStatus={profile.user_status || "disponible"} onUpdate={(s) => setProfile(prev => ({ ...prev, user_status: s }))} />
                  </div>
                )}
                {!profile && (
                  <p className="text-stone-400 text-sm text-center py-4">Completez votre profil pour rejoindre la communaute !</p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden mb-4">
          {[
            { to: "Badges", label: "Badges et Recompenses", emoji: "🏆", desc: badgeCount + " badges · " + (levelInfo?.xp || 0) + " XP" },
            { to: "MyDogs", label: "Mes chiens", emoji: "🐕", desc: "Gerez les profils de vos chiens" },
            { to: "JournalVie", label: "Carnet de progression", emoji: "📊", desc: "Suivez vos seances", param: "obeissance" },
          ].map(({ to, label, emoji, desc, param }) => (
            <Link key={to} to={param ? `${createPageUrl(to)}?${param}` : createPageUrl(to)} className="flex items-center gap-4 p-4 border-b border-stone-50 hover:bg-stone-50 transition-colors last:border-0">
              <div className="text-2xl">{emoji}</div>
              <div className="flex-1">
                <div className="font-semibold text-stone-700 text-sm">{label}</div>
                <div className="text-xs text-stone-400">{desc}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-300" />
            </Link>
          ))}
        </div>

        <ProfilSupportSection userEmail={user?.email} />

        <div className="mb-4">
          <button
            onClick={async () => {
              const shareData = { title: `${APP_NAME} ${APP_EMOJI}`, text: APP_SHARE_TEXT, url: APP_URL };
              try {
                if (navigator.share) { await navigator.share(shareData); }
                else { await navigator.clipboard.writeText(APP_URL); alert("Lien copié ! Partage-le à tes amis 🐾"); }
              } catch (e) { console.warn("Partage annulé", e); }
            }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-bold text-[clamp(11px,3vw,14px)] transition-all active:scale-95 shadow-md"
            style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
          >
            {APP_EMOJI} Partager {APP_NAME} avec mes amis
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden mb-4">
          <div className="p-4 border-b border-stone-100">
            <h3 className="font-bold text-stone-700 flex items-center gap-2">
              <Shield className="w-4 h-4 text-teal-500" /> Securite et Confiance
            </h3>
          </div>
          <Link to={createPageUrl("Regles")} className="flex items-center gap-4 p-4 border-b border-stone-50 hover:bg-stone-50">
            <div className="text-xl">📋</div>
            <div className="flex-1 text-sm font-medium text-stone-700">Regles de la communaute</div>
            <ChevronRight className="w-4 h-4 text-stone-300" />
          </Link>
          <Link to={createPageUrl("CGU")} className="flex items-center gap-4 p-4 border-b border-stone-50 hover:bg-stone-50">
            <div className="text-xl">📄</div>
            <div className="flex-1 text-sm font-medium text-stone-700">Conditions d'utilisation</div>
            <ChevronRight className="w-4 h-4 text-stone-300" />
          </Link>
          <Link to={createPageUrl("PolitiqueConfidentialite")} className="flex items-center gap-4 p-4 border-b border-stone-50 hover:bg-stone-50">
            <div className="text-xl">🔒</div>
            <div className="flex-1 text-sm font-medium text-stone-700">Politique de confidentialité</div>
            <ChevronRight className="w-4 h-4 text-stone-300" />
          </Link>
          <Link to={createPageUrl("MentionsLegales")} className="flex items-center gap-4 p-4 border-b border-stone-50 hover:bg-stone-50">
            <div className="text-xl">⚖️</div>
            <div className="flex-1 text-sm font-medium text-stone-700">Mentions légales</div>
            <ChevronRight className="w-4 h-4 text-stone-300" />
          </Link>
          <div className="p-4 bg-emerald-50 flex items-center gap-3">
            <Shield className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <p className="text-xs text-emerald-700">Votre localisation est toujours affichee de maniere approximative.</p>
          </div>
        </div>

        <Button onClick={() => base44.auth.logout()} variant="outline" className="w-full rounded-xl border-red-200 text-red-500 hover:bg-red-50 gap-2 mb-3">
          <LogOut className="w-4 h-4" /> Se deconnecter
        </Button>

        <button onClick={() => setShowDeleteModal(true)} className="w-full text-xs text-stone-400 hover:text-red-400 transition-colors py-2">
          Supprimer mon compte
        </button>
      </div>

      {/* Modale suppression compte */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-bold text-stone-800 text-lg">Supprimer mon compte</h3>
            </div>
            <p className="text-sm text-stone-500 mb-6 leading-relaxed">
              Cette action est <strong>irréversible</strong>. Toutes vos données seront supprimées définitivement : profil, chiens, annonces, posts, messages et historique.
            </p>
            {deleting ? (
              <div className="flex items-center justify-center gap-3 py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-4 border-red-400 border-t-transparent" />
                <span className="text-sm text-stone-500">Suppression en cours...</span>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button onClick={() => setShowDeleteModal(false)} variant="outline" className="flex-1 rounded-xl">Annuler</Button>
                <Button onClick={handleDeleteAccount} className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white">
                  Supprimer définitivement
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed left-0 right-0 z-50 px-4" style={{ bottom: "calc(var(--nav-height, 80px) + 12px)" }}>
          <Button type="button" onClick={handleSave} disabled={saving} className="w-full max-w-2xl mx-auto flex bg-teal-500 hover:bg-teal-600 text-white rounded-2xl h-13 text-base font-bold shadow-xl shadow-teal-500/30">
            {saving ? "Sauvegarde en cours..." : "✅ Sauvegarder mon profil"}
          </Button>
        </div>
      )}
    </div>
  );
}