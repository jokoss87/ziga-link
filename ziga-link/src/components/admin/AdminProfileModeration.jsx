import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { Users, EyeOff, Eye, Trash2, ChevronDown, ChevronUp, Search, Dog, MapPin, Calendar, CheckCircle, UserPlus, Mail, Check, X, Shield, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AdminProfileModeration() {
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [dogs, setDogs] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState("tous");
  const [sortBy, setSortBy] = useState("recent");
  const [expanded, setExpanded] = useState(null);
  const [actionMsg, setActionMsg] = useState("");
  const { user: currentAdmin } = useUserProfile();
  const [sessions, setSessions] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [cleanupInProgress, setCleanupInProgress] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);

  const [messageModal, setMessageModal] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    load();
  }, []);

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

  const load = async () => {
    setLoading(true);
    const [allUsers, allProfiles] = await Promise.all([
      base44.entities.User.list("-created_date", 100),
      base44.entities.UserProfile.list("-created_date", 100),
    ]);
    const [allDogs, allSessions] = await Promise.all([
      base44.entities.DogProfile.list("-created_date", 200),
      base44.entities.UserSession.list("-created_date", 200).catch(() => []),
    ]);

    const profilesByEmail = {};
    allProfiles.forEach(p => { profilesByEmail[p.created_by] = p; });

    const dogsByEmail = {};
    allDogs.forEach(d => {
      if (!dogsByEmail[d.created_by]) dogsByEmail[d.created_by] = [];
      dogsByEmail[d.created_by].push(d);
    });

    const sessionsByEmail = {};
    allSessions.forEach(s => {
      if (!sessionsByEmail[s.user_email] || new Date(s.created_date) > new Date(sessionsByEmail[s.user_email].created_date)) {
        sessionsByEmail[s.user_email] = s;
      }
    });

    setUsers(allUsers);
    setProfiles(profilesByEmail);
    setDogs(dogsByEmail);
    setSessions(sessionsByEmail);
    setLoading(false);
  };

  const notify = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 4000);
  };

  // CORRECTION : recherche côté client pour éviter les doublons
  const sendAdminMessage = async (userEmail, message) => {
    if (!message.trim()) return;
    setSendingMessage(true);

    try {
      const adminEmail = currentAdmin?.email || "admin@zigalink.local";

      // Charger toutes les conversations et filtrer côté client
      // Le filtre $in de Base44 est peu fiable et crée des doublons
      const allConvs = await base44.entities.Conversation.list("-last_message_at", 200).catch(() => []);
      let conv = allConvs.find(c =>
        c.type === "private" &&
        c.members?.includes(adminEmail) &&
        c.members?.includes(userEmail)
      );

      if (!conv) {
        conv = await base44.entities.Conversation.create({
          type: "private",
          members: [adminEmail, userEmail],
          member_pseudos: [currentAdmin?.full_name || "Admin", profiles[userEmail]?.pseudo || userEmail],
          member_photos: [currentAdmin?.photo_url || "", profiles[userEmail]?.photo_url || ""],
          last_message_at: new Date().toISOString(),
        });
      }

      await base44.entities.ConversationMessage.create({
        conversation_id: conv.id,
        sender_email: adminEmail,
        sender_pseudo: "🛡️ ADMIN",
        content: message,
      });

      await base44.entities.Notification.create({
        user_email: userEmail,
        type: "admin_message",
        title: "📢 Information importante de l'administrateur",
        body: message.slice(0, 80),
        reference_id: conv.id,
        link_page: "Messages",
        link_param: conv.id,
        is_read: false,
      });

      notify(`✅ Message envoyé à ${userEmail}`);
      setMessageModal(null);
      setMessageText("");
    } catch (e) {
      notify(`❌ Erreur d'envoi`);
      console.error(e);
    }
    setSendingMessage(false);
  };

  const handleShadowBan = async (email, pseudo, unban = false) => {
    const profile = profiles[email];
    if (!profile) return;
    await base44.entities.UserProfile.update(profile.id, { ...profile, is_shadow_banned: !unban });
    await base44.entities.ModerationLog.create({
      moderator_email: currentAdmin?.email,
      target_user_email: email,
      target_user_name: pseudo || email,
      action: unban ? "shadow_unban" : "shadow_ban",
    });
    notify(unban ? `✅ Shadow ban levé pour ${email}` : `🔇 ${email} shadow banni`);
    load();
  };

  const getLastActivity = (email) => {
    const user = users.find(u => u.email === email);
    const profile = profiles[email];
    const userDogs = dogs[email] || [];
    const dates = [];
    if (user?.updated_date) dates.push(new Date(user.updated_date));
    if (profile?.updated_date) dates.push(new Date(profile.updated_date));
    userDogs.forEach(d => { if (d.updated_date) dates.push(new Date(d.updated_date)); });
    return dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : (user?.created_date ? new Date(user.created_date) : new Date(0));
  };

  const daysInactive = (email) => {
    const lastActivity = getLastActivity(email);
    if (lastActivity.getTime() === 0) return 99999;
    return Math.max(0, Math.floor((new Date().getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const handleDelete = async (user) => {
    const isAdmin = currentAdmin?.role === "admin" && user.role === "admin";
    if (isAdmin) {
      if (!window.confirm(`⚠️ ATTENTION : Vous tentez de supprimer un compte ADMIN.\n\nSupprimer définitivement ${user.email} ?\n\nTous ses profils, chiens, posts, conversations, amis et notifications seront supprimés.\nCette action est irréversible.`)) return;
    } else {
      setDeleteConfirm(user.email);
      return;
    }
    notify(`⏳ Suppression en cours…`);
    await base44.functions.invoke("deleteUserAccount", { email: user.email });
    setUsers(prev => prev.filter(u => u.email !== user.email));
    setProfiles(prev => { const next = { ...prev }; delete next[user.email]; return next; });
    setDogs(prev => { const next = { ...prev }; delete next[user.email]; return next; });
    notify(`🗑️ Compte ${user.email} supprimé en cascade`);
  };

  const confirmDelete = async (email) => {
    notify(`⏳ Suppression en cours…`);
    setDeleteConfirm(null);
    await base44.functions.invoke("deleteUserAccount", { email });
    setUsers(prev => prev.filter(u => u.email !== email));
    setProfiles(prev => { const next = { ...prev }; delete next[email]; return next; });
    setDogs(prev => { const next = { ...prev }; delete next[email]; return next; });
    notify(`🗑️ Compte ${email} supprimé en cascade`);
  };

  const cleanupDormantAccounts = async () => {
    const dormantEmails = filtered.filter(u => daysInactive(u.email) > 730).map(u => u.email);
    if (dormantEmails.length === 0) { notify("⚠️ Aucun compte dormant > 24 mois"); return; }
    if (!window.confirm(`⚠️ Supprimer ${dormantEmails.length} compte(s) dormant(s) > 24 mois ?\n\nCette opération en cascade est irréversible.`)) return;
    setCleanupInProgress(true);
    notify(`⏳ Nettoyage en cours (${dormantEmails.length} comptes)…`);
    for (const email of dormantEmails) {
      await base44.functions.invoke("deleteUserAccount", { email }).catch(e => console.error(`Erreur suppression ${email}:`, e));
    }
    setCleanupInProgress(false);
    notify(`✅ Nettoyage terminé : ${dormantEmails.length} compte(s) supprimé(s)`);
    load();
  };

  const FILTER_TABS = [
    { id: "tous", label: "Tous", count: users.length },
    { id: "admin", label: "Admins", count: users.filter(u => u.role === "admin").length },
    { id: "sans_profil", label: "Sans profil", count: users.filter(u => !profiles[u.email]).length },
    { id: "shadow", label: "Shadow-bannis", count: users.filter(u => profiles[u.email]?.is_shadow_banned).length },
    { id: "dormant", label: "Dormants > 24m", count: users.filter(u => daysInactive(u.email) > 730).length },
  ];

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      profiles[u.email]?.pseudo?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filterTab === "tous" ? true :
      filterTab === "admin" ? u.role === "admin" :
      filterTab === "sans_profil" ? !profiles[u.email] :
      filterTab === "shadow" ? profiles[u.email]?.is_shadow_banned :
      filterTab === "dormant" ? daysInactive(u.email) > 730 :
      true;
    return matchSearch && matchFilter;
  }).sort((a, b) => {
    if (sortBy === "recent") return new Date(b.created_date) - new Date(a.created_date);
    if (sortBy === "ancient") return new Date(a.created_date) - new Date(b.created_date);
    return 0;
  });

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-400 border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-4">
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-lg">
            <h2 className="text-lg font-black text-stone-800 mb-2">Supprimer ce compte ?</h2>
            <p className="text-sm text-stone-600 mb-6">
              Cette action supprimera définitivement le compte, tous les chiens, posts, messages et données associées. <strong>C'est irréversible.</strong>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-semibold text-sm hover:bg-stone-50 transition-colors">
                Annuler
              </button>
              <button onClick={() => confirmDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {actionMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl px-4 py-3 text-sm font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {actionMsg}
        </div>
      )}

      {messageModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <div className="text-2xl">📢</div>
              <h2 className="text-lg font-black text-stone-800">Message Admin</h2>
            </div>
            <p className="text-xs text-stone-500 mb-4">L'utilisateur recevra une notification "Information importante administrateur"</p>
            <textarea
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              placeholder="Écrivez votre message..."
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none h-24"
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setMessageModal(null); setMessageText(""); }}
                disabled={sendingMessage}
                className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-semibold text-sm hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={() => sendAdminMessage(messageModal, messageText)}
                disabled={sendingMessage || !messageText.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl text-white font-semibold text-sm bg-blue-500 hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sendingMessage ? "Envoi..." : <><MessageCircle className="w-4 h-4" /> Envoyer</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <h3 className="font-bold text-stone-700 mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-teal-500" /> Inviter un utilisateur
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={e => { setInviteEmail(e.target.value); setInviteResult(null); }}
            placeholder="adresse@email.com"
            className="flex-1 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
          <select
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value)}
            className="border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-300"
          >
            <option value="user">Utilisateur</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={handleInvite}
            disabled={!inviteEmail.trim() || inviting}
            className="px-5 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-40 flex items-center gap-2"
            style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
          >
            {inviting ? "Envoi..." : <><UserPlus className="w-4 h-4" /> Inviter</>}
          </button>
        </div>
        {inviteResult === "ok" && (
          <div className="mt-3 flex items-center gap-2 text-sm text-teal-600 bg-teal-50 rounded-xl px-4 py-2">
            <Check className="w-4 h-4" /> Invitation envoyée avec succès !
          </div>
        )}
        {inviteResult === "error" && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">
            <X className="w-4 h-4" /> Erreur lors de l'envoi. L'email est peut-être déjà inscrit.
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-stone-700 flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-500" /> Utilisateurs inscrits
            <span className="text-xs font-normal text-stone-400 ml-1">{users.length} inscrits</span>
          </h3>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par email, nom ou pseudo…"
            className="pl-9 text-sm"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex gap-2 flex-wrap">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${filterTab === tab.id ? "text-white shadow-sm" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}
                style={filterTab === tab.id ? { background: "linear-gradient(135deg, #4CAF87, #3d9e78)" } : {}}
              >
                {tab.label}
                <span className={`min-w-[18px] h-[18px] rounded-full text-[10px] flex items-center justify-center px-1 font-bold ${filterTab === tab.id ? "bg-white/25 text-white" : "bg-stone-200 text-stone-500"}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="border border-stone-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-300 font-medium text-stone-700"
            >
              <option value="recent">Plus récents</option>
              <option value="ancient">Plus anciens</option>
            </select>
            {filterTab === "dormant" && filtered.length > 0 && (
              <button
                onClick={cleanupDormantAccounts}
                disabled={cleanupInProgress}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
              >
                {cleanupInProgress ? "Nettoyage..." : `🗑️ Nettoyer ${filtered.length}`}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((u) => {
          const profile = profiles[u.email];
          const userDogs = dogs[u.email] || [];
          const isExpanded = expanded === u.id;
          const isBanned = profile?.is_shadow_banned;
          const hasProfile = !!profile;

          return (
            <div key={u.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isBanned ? "border-rose-200" : "border-stone-100"}`}>
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-stone-50 transition-colors" onClick={() => setExpanded(isExpanded ? null : u.id)}>
                <div className="flex-shrink-0">
                  {profile?.photo_url ? (
                    <img src={profile.photo_url} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-stone-100" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-lg">
                      {u.full_name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-stone-800 truncate">{u.full_name || u.email}</span>
                    {profile?.pseudo && <span className="text-xs text-stone-500 truncate">@{profile.pseudo}</span>}
                    {u.role === "admin" && <span className="text-[10px] bg-violet-100 text-violet-600 rounded-full px-2 py-0.5 font-semibold flex-shrink-0 flex items-center gap-0.5"><Shield className="w-2.5 h-2.5" /> Admin</span>}
                    {isBanned && <span className="text-[10px] bg-rose-100 text-rose-600 rounded-full px-2 py-0.5 font-semibold flex-shrink-0">🔇 Shadow ban</span>}
                    {!hasProfile && <span className="text-[10px] bg-amber-100 text-amber-600 rounded-full px-2 py-0.5 font-semibold flex-shrink-0">Sans profil</span>}
                  </div>
                  <div className="text-xs text-stone-400 truncate">{u.email}</div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-stone-300">Inscrit le {u.created_date ? new Date(u.created_date).toLocaleDateString("fr-FR") : "—"}</span>
                    {userDogs.length > 0 && <span className="text-[10px] text-teal-500 font-medium flex items-center gap-0.5"><Dog className="w-2.5 h-2.5" /> {userDogs.length} chien{userDogs.length > 1 ? "s" : ""}</span>}
                    {(() => {
                      const days = daysInactive(u.email);
                      const isVeryOld = days > 730;
                      const isOld = days > 180 && days <= 730;
                      return (
                        <span className={`text-[10px] font-medium flex items-center gap-0.5 ${isVeryOld ? "text-white bg-red-600 px-2 py-0.5 rounded-full font-black" : isOld ? "text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full" : "text-stone-400"}`}>
                          ⏱️ {days < 1 ? "Aujourd'hui" : days === 1 ? "Hier" : `${days}j`}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={e => { e.stopPropagation(); setMessageModal(u.email); setMessageText(""); }} className="p-2 rounded-xl bg-stone-50 text-stone-400 hover:bg-blue-50 hover:text-blue-500 transition-colors" title="Envoyer un message">
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>
                  {profile && (
                    <button onClick={e => { e.stopPropagation(); handleShadowBan(u.email, profile.pseudo, isBanned); }} className={`p-2 rounded-xl transition-colors ${isBanned ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-stone-50 text-stone-400 hover:bg-rose-50 hover:text-rose-500"}`} title={isBanned ? "Lever le shadow ban" : "Shadow ban"}>
                      {isBanned ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button onClick={e => { e.stopPropagation(); handleDelete(u); }} className="p-2 rounded-xl bg-stone-50 text-stone-300 hover:bg-red-50 hover:text-red-500 transition-colors" title="Supprimer le compte">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-300" /> : <ChevronDown className="w-4 h-4 text-stone-300" />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-stone-50 bg-stone-50/50 px-4 py-4 space-y-4">
                  {hasProfile ? (
                    <div>
                      <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Profil</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          ["Pseudo", profile.pseudo],
                          ["Prénom", profile.firstName],
                          ["Ville", profile.city],
                          ["Code postal", profile.postalCode],
                          ["Zone", profile.zoneTag],
                          ["Statut", profile.user_status],
                          ["Niveau", profile.experience_level],
                          ["Vérifié", profile.is_verified ? "✅" : "Non"],
                          ["Réputation", profile.reputation_score ?? 0],
                        ].filter(([, v]) => v != null && v !== "").map(([label, value]) => (
                          <div key={label} className="bg-white rounded-xl px-3 py-2">
                            <div className="text-[10px] text-stone-400 font-medium">{label}</div>
                            <div className="text-xs text-stone-700 font-semibold">{String(value)}</div>
                          </div>
                        ))}
                        {profile.latitude && profile.longitude && (
                          <div className="bg-white rounded-xl px-3 py-2 col-span-2">
                            <div className="text-[10px] text-stone-400 font-medium flex items-center gap-1"><MapPin className="w-3 h-3" /> Coordonnées GPS</div>
                            <div className="text-xs text-stone-700 font-mono">{profile.latitude.toFixed(5)}, {profile.longitude.toFixed(5)}</div>
                          </div>
                        )}
                        {profile.bio && (
                          <div className="bg-white rounded-xl px-3 py-2 col-span-2">
                            <div className="text-[10px] text-stone-400 font-medium">Bio</div>
                            <div className="text-xs text-stone-600 italic">"{profile.bio}"</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
                      ⚠️ Cet utilisateur n'a pas encore complété son profil.
                    </div>
                  )}

                  {userDogs.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2 flex items-center gap-1"><Dog className="w-3 h-3" /> Chiens ({userDogs.length})</p>
                      <div className="space-y-2">
                        {userDogs.map(dog => (
                          <div key={dog.id} className="bg-white rounded-xl px-3 py-2 flex items-center gap-3">
                            {dog.photo_url && <img src={dog.photo_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-stone-700">{dog.name}</div>
                              <div className="text-xs text-stone-400">{dog.breed} · {dog.gender === "male" ? "♂" : "♀"} · {dog.size}</div>
                              {dog.birthDate && <div className="text-[10px] text-stone-300 flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />{new Date(dog.birthDate).toLocaleDateString("fr-FR")}</div>}
                            </div>
                            <div className="text-right flex-shrink-0">
                              {dog.energyLevel && <div className="text-xs text-teal-600 font-semibold">⚡ {dog.energyLevel}/5</div>}
                              {dog.sociabilityDogs && <div className="text-xs text-blue-500">🐕 {dog.sociabilityDogs}/5</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button onClick={() => { setMessageModal(u.email); setMessageText(""); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors">
                      <MessageCircle className="w-3.5 h-3.5" /> Envoyer un message
                    </button>
                    {profile && (
                      <button onClick={() => handleShadowBan(u.email, profile.pseudo, isBanned)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors ${isBanned ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200" : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"}`}>
                        {isBanned ? <><Eye className="w-3.5 h-3.5" /> Lever shadow ban</> : <><EyeOff className="w-3.5 h-3.5" /> Shadow ban</>}
                      </button>
                    )}
                    <button onClick={() => handleDelete(u)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Supprimer le compte
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-stone-400 text-sm">Aucun utilisateur trouvé</div>
        )}
      </div>
    </div>
  );
}