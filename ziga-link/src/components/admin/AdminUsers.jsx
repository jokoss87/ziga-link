import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import {
  Search, UserPlus, Dog, Mail, MapPin, Check, X, Eye, Calendar,
  Shield, Activity, PawPrint, MessageSquare, Trophy, Star,
  Hash, ChevronRight, AlertTriangle, Layers
} from "lucide-react";

export default function AdminUsers() {
  const { user } = useUserProfile();
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [dogs, setDogs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState(null);
  const [userStats, setUserStats] = useState({}); // email -> stats
  const [loadingStats, setLoadingStats] = useState(false);
  const [emailHistory, setEmailHistory] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [filterTrust, setFilterTrust] = useState("");
  const [emailCounts, setEmailCounts] = useState({});
  const [zoomPhoto, setZoomPhoto] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [u, p, d, emailLogs] = await Promise.all([
      base44.entities.User.list("-created_date", 500),
      base44.entities.UserProfile.list("-created_date", 500),
      base44.entities.DogProfile.list("-created_date", 500),
      base44.entities.AdminEmailLog.list("-created_date", 500),
    ]);
    setUsers(u);
    setProfiles(p);
    setDogs(d);
    // Compter les emails par destinataire
    const counts = {};
    emailLogs.forEach(l => {
      if (l.recipient_email) counts[l.recipient_email] = (counts[l.recipient_email] || 0) + 1;
    });
    setEmailCounts(counts);
    setLoading(false);
  };

  const openUserDetail = async (u) => {
    const profile = profiles.find(p => p.created_by === u.email);
    const userDogs = dogs.filter(d => d.created_by === u.email);
    setSelectedUser({ user: u, profile, dogs: userDogs });
    setEmailSubject("");
    setEmailBody("");
    setEmailResult(null);
    setEmailHistory([]);

    // Charger les stats + historique emails en parallèle
    setLoadingStats(true);
    const [walks, activities, posts, announcements, emailLogs] = await Promise.all([
      base44.entities.ProgressEntry.filter({ created_by: u.email }, "-created_date", 200),
      base44.entities.Activity.filter({ created_by: u.email }, "-created_date", 100),
      base44.entities.Post.filter({ created_by: u.email }, "-created_date", 100),
      base44.entities.MeetupAnnouncement.filter({ created_by: u.email }, "-created_date", 100),
      base44.entities.AdminEmailLog.filter({ recipient_email: u.email }, "-created_date", 20),
    ]);
    setUserStats(prev => ({
      ...prev,
      [u.email]: {
        walks: walks.length,
        activities: activities.length,
        posts: posts.length,
        meetups: announcements.filter(a => a.status === "completed").length,
        announcements: announcements.length,
        dogs: userDogs.length,
      }
    }));
    setEmailHistory(emailLogs);
    setLoadingStats(false);
  };

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) return;
    setSendingEmail(true);
    setEmailResult(null);
    try {
      await base44.integrations.Core.SendEmail({
        to: selectedUser.user.email,
        subject: emailSubject.trim(),
        body: emailBody.trim(),
        from_name: "Ziga Link Admin",
      });
      await base44.entities.AdminEmailLog.create({
        recipient_email: selectedUser.user.email,
        subject: emailSubject.trim(),
        body: emailBody.trim(),
        sent_by: user?.email || "admin",
      });
      setEmailResult("ok");
      setEmailSubject("");
      setEmailBody("");
      // Rafraîchir historique
      const logs = await base44.entities.AdminEmailLog.filter({ recipient_email: selectedUser.user.email }, "-created_date", 20);
      setEmailHistory(logs);
    } catch (e) {
      setEmailResult("error");
    }
    setSendingEmail(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteResult(null);
    try {
      await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
      setInviteResult("ok");
      setInviteEmail("");
    } catch (e) {
      setInviteResult("error");
    }
    setInviting(false);
  };

  const q = search.toLowerCase().trim();
  const filtered = users.filter(u => {
    const profile = profiles.find(p => p.created_by === u.email);
    const userDogs = dogs.filter(d => d.created_by === u.email);
    const dogNames = userDogs.map(d => d.name?.toLowerCase()).join(" ");
    if (filterTrust && profile?.trust_level !== filterTrust) return false;
    if (!q) return true;
    return (
      u.email?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q) ||
      profile?.pseudo?.toLowerCase().includes(q) ||
      profile?.city?.toLowerCase().includes(q) ||
      dogNames.includes(q)
    );
  });

  const stats = selectedUser ? userStats[selectedUser.user.email] : null;

  const TRUST_COLORS = {
    normal: "bg-green-100 text-green-700",
    warning: "bg-amber-100 text-amber-700",
    shadow_banned: "bg-red-100 text-red-600",
  };

  return (
    <div className="space-y-5">

      {/* Inviter */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <h3 className="font-bold text-stone-700 mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-teal-500" /> Inviter un utilisateur
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="email" value={inviteEmail}
            onChange={e => { setInviteEmail(e.target.value); setInviteResult(null); }}
            placeholder="adresse@email.com"
            className="flex-1 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
          <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
            className="border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-300">
            <option value="user">Utilisateur</option>
            <option value="admin">Admin</option>
          </select>
          <button onClick={handleInvite} disabled={!inviteEmail.trim() || inviting}
            className="px-5 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-40 flex items-center gap-2"
            style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}>
            {inviting ? "Envoi..." : <><UserPlus className="w-4 h-4" /> Inviter</>}
          </button>
        </div>
        {inviteResult === "ok" && <div className="mt-3 flex items-center gap-2 text-sm text-teal-600 bg-teal-50 rounded-xl px-4 py-2"><Check className="w-4 h-4" /> Invitation envoyée !</div>}
        {inviteResult === "error" && <div className="mt-3 flex items-center gap-2 text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2"><X className="w-4 h-4" /> Erreur — email déjà inscrit ?</div>}
      </div>

      {/* Recherche + filtres */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <h3 className="font-bold text-stone-700 mb-4 flex items-center gap-2">
          <Search className="w-4 h-4 text-teal-500" /> Utilisateurs ({users.length})
        </h3>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Nom, email, pseudo, chien, ville..."
              className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
          </div>
          <select value={filterTrust} onChange={e => setFilterTrust(e.target.value)}
            className="border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-300">
            <option value="">Tous les niveaux</option>
            <option value="normal">✅ Normal</option>
            <option value="warning">⚠️ Warning</option>
            <option value="shadow_banned">🚫 Shadow ban</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-400 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-stone-400 mb-3">{filtered.length} utilisateur(s)</p>
            {filtered.slice(0, 50).map(u => {
              const profile = profiles.find(p => p.created_by === u.email);
              const userDogs = dogs.filter(d => d.created_by === u.email);
              return (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-stone-50 border border-stone-100 hover:border-teal-200 hover:bg-teal-50/30 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {profile?.photo_url
                      ? <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-sm font-black text-teal-600">{(u.full_name || u.email || "?")[0].toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-stone-800">{u.full_name || profile?.pseudo || "—"}</span>
                      {profile?.pseudo && u.full_name && <span className="text-xs text-stone-400">@{profile.pseudo}</span>}
                      {u.role === "admin" && <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-semibold">admin</span>}
                      {profile?.trust_level && profile.trust_level !== "normal" && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TRUST_COLORS[profile.trust_level] || ""}`}>
                          {profile.trust_level === "warning" ? "⚠️ Warning" : "🚫 Banni"}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-400 flex items-center gap-2 mt-0.5">
                      <Mail className="w-3 h-3" />{u.email}
                      {profile?.city && <><MapPin className="w-3 h-3" />{profile.city}</>}
                    </div>
                    {userDogs.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-stone-500 mt-0.5">
                        <Dog className="w-3 h-3 text-amber-500" />{userDogs.map(d => d.name).join(", ")}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {emailCounts[u.email] > 0 && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        emailCounts[u.email] >= 3 ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                      }`}>
                        <Mail className="w-3 h-3" />{emailCounts[u.email]}
                      </span>
                    )}
                    <span className="text-xs text-stone-300 hidden sm:block">{u.created_date ? new Date(u.created_date).toLocaleDateString("fr-FR") : ""}</span>
                    <button onClick={() => openUserDetail(u)}
                      className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-600 transition-colors" title="Voir le profil">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <div className="text-center py-8 text-stone-400 text-sm">Aucun utilisateur trouvé</div>}
          </div>
        )}
      </div>

        {/* Zoom photo overlay — niveau racine pour éviter le clipping du modal */}
      {zoomPhoto && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center cursor-pointer" onClick={() => setZoomPhoto(null)}>
          <img src={zoomPhoto} alt="" className="max-h-[80vh] max-w-[80vw] rounded-2xl object-contain shadow-2xl" />
        </div>
      )}

      {/* Modal profil complet */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer" onClick={() => selectedUser.profile?.photo_url && setZoomPhoto(selectedUser.profile.photo_url)}>
                    {selectedUser.profile?.photo_url
                      ? <img src={selectedUser.profile.photo_url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-base font-black text-teal-600">{(selectedUser.user.full_name || selectedUser.user.email || "?")[0].toUpperCase()}</span>}
                </div>
                <div>
                  <div className="font-bold text-stone-800">{selectedUser.user.full_name || selectedUser.profile?.pseudo || "—"}</div>
                  <div className="text-xs text-stone-400">{selectedUser.user.email}</div>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-1.5 rounded-full bg-stone-100 hover:bg-stone-200">
                <X className="w-4 h-4 text-stone-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">

              {/* Badges rôle + trust */}
              <div className="flex flex-wrap gap-2">
                {selectedUser.user.role === "admin" && (
                  <span className="inline-flex items-center gap-1 text-xs bg-teal-100 text-teal-700 px-3 py-1 rounded-full font-semibold">
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                )}
                {selectedUser.profile?.trust_level && (
                  <span className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-semibold ${TRUST_COLORS[selectedUser.profile.trust_level] || "bg-stone-100 text-stone-600"}`}>
                    {selectedUser.profile.trust_level === "normal" ? "✅ Normal" : selectedUser.profile.trust_level === "warning" ? "⚠️ Warning" : "🚫 Shadow ban"}
                  </span>
                )}
                {selectedUser.profile?.isActive === false && (
                  <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full font-semibold">
                    <AlertTriangle className="w-3 h-3" /> Inactif
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-xs bg-stone-100 text-stone-500 px-3 py-1 rounded-full">
                  <Calendar className="w-3 h-3" /> Inscrit le {selectedUser.user.created_date ? new Date(selectedUser.user.created_date).toLocaleDateString("fr-FR") : "—"}
                </span>
              </div>

              {/* Stats */}
              <div>
                <h4 className="font-semibold text-stone-700 text-sm mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" /> Statistiques
                </h4>
                {loadingStats ? (
                  <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-400 border-t-transparent" /></div>
                ) : stats ? (
                  <div className="grid grid-cols-3 gap-2">
                    <StatCard icon={<PawPrint className="w-4 h-4 text-green-500" />} label="Balades" value={stats.walks} color="bg-green-50" />
                    <StatCard icon={<Activity className="w-4 h-4 text-blue-500" />} label="Activités" value={stats.activities} color="bg-blue-50" />
                    <StatCard icon={<MessageSquare className="w-4 h-4 text-purple-500" />} label="Posts" value={stats.posts} color="bg-purple-50" />
                    <StatCard icon={<Dog className="w-4 h-4 text-amber-500" />} label="Chiens" value={stats.dogs} color="bg-amber-50" />
                    <StatCard icon={<Layers className="w-4 h-4 text-orange-500" />} label="Annonces" value={stats.announcements} color="bg-orange-50" />
                    <StatCard icon={<Star className="w-4 h-4 text-yellow-500" />} label="Réputation" value={selectedUser.profile?.reputation_score ?? 0} color="bg-yellow-50" />
                  </div>
                ) : null}
              </div>

              {/* Infos profil */}
              {selectedUser.profile && (
                <div>
                  <h4 className="font-semibold text-stone-700 text-sm mb-3">Informations profil</h4>
                  <div className="bg-stone-50 rounded-xl p-4 space-y-2">
                    {selectedUser.profile.firstName && <Row label="Prénom" value={selectedUser.profile.firstName} />}
                    {selectedUser.profile.city && <Row label="Ville" value={`${selectedUser.profile.city}${selectedUser.profile.postalCode ? ` (${selectedUser.profile.postalCode})` : ""}`} />}
                    {selectedUser.profile.zoneTag && <Row label="Zone" value={selectedUser.profile.zoneTag} />}
                    {selectedUser.profile.experience_level && <Row label="Niveau" value={selectedUser.profile.experience_level} />}
                    {selectedUser.profile.user_status && <Row label="Statut" value={selectedUser.profile.user_status} />}
                    {selectedUser.profile.phone && <Row label="Téléphone" value={selectedUser.profile.phone} />}
                    {selectedUser.profile.bio && (
                      <div className="pt-1">
                        <div className="text-xs text-stone-400 mb-1">Bio</div>
                        <div className="text-sm text-stone-600 italic">"{selectedUser.profile.bio}"</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Chiens */}
              {selectedUser.dogs.length > 0 && (
                <div>
                  <h4 className="font-semibold text-stone-700 text-sm mb-3 flex items-center gap-2">
                    <Dog className="w-4 h-4 text-amber-500" /> Chiens ({selectedUser.dogs.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedUser.dogs.map(dog => (
                      <div key={dog.id} className="flex items-center gap-3 bg-amber-50 rounded-xl px-3 py-2.5">
                        {dog.photo_url
                          ? <img src={dog.photo_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0 cursor-pointer" onClick={() => setZoomPhoto(dog.photo_url)} />
                            : <div className="w-9 h-9 rounded-full bg-amber-200 flex items-center justify-center text-base">🐕</div>}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-stone-800">{dog.name}</div>
                          <div className="text-xs text-stone-400">{dog.breed} · {dog.gender === "male" ? "Mâle" : "Femelle"} · {dog.size}</div>
                        </div>
                        {dog.age_years && <div className="text-xs text-stone-500 font-medium">{dog.age_years} ans</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Envoyer un email */}
              <div>
                <h4 className="font-semibold text-stone-700 text-sm mb-3 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-500" /> Envoyer un email
                </h4>
                <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                  <input type="text" value={emailSubject}
                    onChange={e => { setEmailSubject(e.target.value); setEmailResult(null); }}
                    placeholder="Objet"
                    className="w-full border border-stone-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  <textarea value={emailBody}
                    onChange={e => { setEmailBody(e.target.value); setEmailResult(null); }}
                    placeholder="Message..."
                    rows={3}
                    className="w-full border border-stone-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
                  <button onClick={handleSendEmail}
                    disabled={!emailSubject.trim() || !emailBody.trim() || sendingEmail}
                    className="w-full py-2 rounded-xl text-white font-bold text-sm disabled:opacity-40 bg-blue-500 hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                    {sendingEmail ? "Envoi en cours..." : <><Mail className="w-4 h-4" /> Envoyer</>}
                  </button>
                  {emailResult === "ok" && <div className="flex items-center gap-2 text-sm text-teal-600 bg-teal-50 rounded-xl px-3 py-2"><Check className="w-4 h-4" /> Email envoyé et enregistré !</div>}
                  {emailResult === "error" && <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2"><X className="w-4 h-4" /> Erreur lors de l'envoi.</div>}
                </div>
              </div>

              {/* Historique emails admin */}
              {emailHistory.length > 0 && (
                <div>
                  <h4 className="font-semibold text-stone-700 text-sm mb-3 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-stone-400" /> Historique des emails admin ({emailHistory.length})
                  </h4>
                  <div className="space-y-2">
                    {emailHistory.map(log => (
                      <div key={log.id} className="bg-stone-50 rounded-xl px-4 py-3 border border-stone-100">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-sm text-stone-700">{log.subject}</span>
                          <span className="text-xs text-stone-400 flex-shrink-0">{log.created_date ? new Date(log.created_date).toLocaleDateString("fr-FR") : ""}</span>
                        </div>
                        <p className="text-xs text-stone-500 mt-1 line-clamp-2">{log.body}</p>
                        <p className="text-xs text-stone-400 mt-1">Par : {log.sent_by}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className={`${color} rounded-xl p-3 flex flex-col items-center gap-1`}>
      {icon}
      <span className="text-lg font-black text-stone-800">{value ?? "—"}</span>
      <span className="text-xs text-stone-500">{label}</span>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-stone-400">{label}</span>
      <span className="text-xs font-medium text-stone-700">{String(value)}</span>
    </div>
  );
}