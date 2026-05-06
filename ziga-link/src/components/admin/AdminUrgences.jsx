import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { invalidateShadowBanCache } from "@/components/lib/cache";
import { AlertTriangle, Flag, EyeOff, CheckCircle, Mail, Clock, Users, Send, X, RefreshCw } from "lucide-react";

const ALERT_CONFIG = {
  shadow_ban_owner: { label: "Shadow ban", color: "bg-red-100 text-red-800 border-red-300" },
  warning_owner:    { label: "Avertissement", color: "bg-amber-100 text-amber-800 border-amber-300" },
  alert_dog:        { label: "Alerte chien", color: "bg-orange-100 text-orange-800 border-orange-300" },
  alert_tags:       { label: "Tags dangereux", color: "bg-purple-100 text-purple-800 border-purple-300" },
};

const REASON_LABELS = {
  spam: "Spam", harcelement: "Harcèlement", faux_profil: "Faux profil",
  contenu_inapproprie: "Contenu inapproprié", autre: "Autre",
};

const TABS = ["🚨 Alertes", "🚩 Signalements", "⚠️ Utilisateurs à risque", "😴 Inactifs à relancer"];

function EmailModal({ to, contextPrefix, onClose, onSent, adminEmail }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState(contextPrefix || "");
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState(false);

  const send = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    await base44.integrations.Core.SendEmail({ to, subject: subject.trim(), body: body.trim(), from_name: "Ziga Link Admin" });
    await base44.entities.AdminEmailLog.create({ recipient_email: to, subject: subject.trim(), body: body.trim(), sent_by: adminEmail || "admin" });
    setSending(false);
    setOk(true);
    setTimeout(() => { onSent && onSent(); onClose(); }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-stone-800 flex items-center gap-2"><Mail className="w-4 h-4 text-blue-500" /> Contacter {to}</h4>
          <button onClick={onClose}><X className="w-4 h-4 text-stone-400" /></button>
        </div>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Objet" className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="Message..." className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
        {ok
          ? <div className="flex items-center gap-2 text-teal-600 text-sm bg-teal-50 rounded-xl p-2"><CheckCircle className="w-4 h-4" /> Envoyé !</div>
          : <button onClick={send} disabled={!subject.trim() || !body.trim() || sending} className="w-full py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
              <Send className="w-4 h-4" /> {sending ? "Envoi..." : "Envoyer"}
            </button>
        }
      </div>
    </div>
  );
}

export default function AdminUrgences() {
  const { user } = useUserProfile();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modAlerts, setModAlerts] = useState([]);
  const [reports, setReports] = useState([]);
  const [riskUsers, setRiskUsers] = useState([]);
  const [inactiveUsers, setInactiveUsers] = useState([]);
  const [emailModal, setEmailModal] = useState(null); // { to, prefix }
  const [notes, setNotes] = useState({});
  const [actionMsg, setActionMsg] = useState("");
  const [modLogs, setModLogs] = useState([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const now = new Date();
    const day14 = new Date(now); day14.setDate(now.getDate() - 14);

    const [alerts, rpts, profiles, users, announcements, walks] = await Promise.all([
      base44.entities.ModerationAlert.filter({ status: "new" }, "-created_date", 100).catch(() => []),
      base44.entities.Report.filter({ status: "pending" }, "-created_date", 100).catch(() => []),
      base44.entities.UserProfile.list("-created_date", 500).catch(() => []),
      base44.entities.User.list("-created_date", 500).catch(() => []),
      base44.entities.MeetupAnnouncement.list("-created_date", 200).catch(() => []),
      base44.entities.ProgressEntry.list("-created_date", 200).catch(() => []),
    ]);

    const logs = await base44.entities.ModerationLog.list("-created_date", 200).catch(() => []);
    setModLogs(logs);
    setModAlerts(alerts);
    setReports(rpts);

    // Compter signalements par email
    const reportCount = {};
    rpts.forEach(r => { if (r.reported_user_email) reportCount[r.reported_user_email] = (reportCount[r.reported_user_email] || 0) + 1; });

    // Risque : rep < -3, trust warning/banned, ou 3+ signalements
    const risky = profiles.filter(p =>
      (p.reputation_score || 0) < -3 ||
      p.trust_level === "warning" ||
      p.trust_level === "shadow_banned" ||
      (reportCount[p.created_by] || 0) >= 3
    );
    setRiskUsers(risky.map(p => ({ ...p, reportCount: reportCount[p.created_by] || 0 })));

    // Inactifs à relancer : inscrits > 14j, 0 annonce, 0 balade
    const announcementEmails = new Set(announcements.map(a => a.created_by));
    const walkEmails = new Set(walks.map(w => w.created_by));
    const inactive = users.filter(u => {
      if (!u.created_date) return false;
      if (new Date(u.created_date) > day14) return false;
      return !announcementEmails.has(u.email) && !walkEmails.has(u.email);
    });
    setInactiveUsers(inactive.slice(0, 30));
    setLoading(false);
  };

  const showMsg = (msg) => { setActionMsg(msg); setTimeout(() => setActionMsg(""), 3000); };

  const resolveAlert = async (id) => {
    await base44.entities.ModerationAlert.update(id, { status: "resolved", resolved_at: new Date().toISOString(), resolved_by: user?.email || "", admin_note: notes[id] || "" });
    showMsg("Alerte résolue ✅");
    load();
  };

  const resolveReport = async (id) => {
    await base44.entities.Report.update(id, { status: "resolved" });
    showMsg("Signalement résolu ✅");
    load();
  };

  const shadowBan = async (email) => {
    const profiles = await base44.entities.UserProfile.filter({ created_by: email }, "-created_date", 1).catch(() => []);
    if (profiles[0]) await base44.entities.UserProfile.update(profiles[0].id, { trust_level: "shadow_banned", is_shadow_banned: true });
    invalidateShadowBanCache();
    showMsg(`🔇 ${email} shadow banni`);
    load();
  };

  const setTrustLevel = async (profile, level) => {
    if (level === "shadow_banned") {
      if (!confirm(`Shadow ban définitif pour ${profile.created_by} ?`)) return;
    }
    const data = level === "shadow_banned"
      ? { trust_level: "shadow_banned", is_shadow_banned: true }
      : level === "normal"
      ? { trust_level: "normal", is_shadow_banned: false }
      : { trust_level: "warning" };
    await base44.entities.UserProfile.update(profile.id, data);
    if (level === "shadow_banned" || level === "normal") {
      invalidateShadowBanCache();
    }
    await base44.entities.ModerationLog.create({
      action: level === "shadow_banned" ? "shadow_ban" : level === "normal" ? "trust_lift" : "warning_set",
      target_user_email: profile.created_by,
      target_user_name: profile.pseudo || profile.created_by,
      moderator_email: user?.email || "admin",
    }).catch(() => {});
    showMsg(level === "shadow_banned" ? `🔇 ${profile.created_by} shadow banni` : level === "warning" ? `⚠️ Warning appliqué à ${profile.created_by}` : `✅ Trust levé pour ${profile.created_by}`);
    load();
  };

  const openEmail = (to, prefix) => setEmailModal({ to, prefix });

  const counts = [modAlerts.length, reports.length, riskUsers.length, inactiveUsers.length];

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-4 border-red-400 border-t-transparent" /></div>;

  return (
    <div className="space-y-4">
      {emailModal && <EmailModal to={emailModal.to} contextPrefix={emailModal.prefix} onClose={() => setEmailModal(null)} onSent={load} adminEmail={user?.email} />}

      {actionMsg && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-medium">{actionMsg}</div>}

      {/* Tabs internes */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap flex-shrink-0 transition-colors ${tab === i ? "bg-stone-800 text-white" : "bg-white border border-stone-200 text-stone-500 hover:border-stone-300"}`}>
            {t}
            {counts[i] > 0 && <span className="bg-red-500 text-white text-[9px] font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">{counts[i]}</span>}
          </button>
        ))}
        <button onClick={load} className="ml-auto p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-400 flex-shrink-0"><RefreshCw className="w-3.5 h-3.5" /></button>
      </div>

      {/* Onglet 0 — Alertes modération */}
      {tab === 0 && (
        <div className="space-y-3">
          {modAlerts.length === 0 && <div className="text-center py-12 bg-white rounded-2xl border border-stone-100"><CheckCircle className="w-8 h-8 text-teal-400 mx-auto mb-2" /><p className="text-stone-400 text-sm">Aucune alerte active 🎉</p></div>}
          {modAlerts.map(a => {
            const cfg = ALERT_CONFIG[a.alert_type] || ALERT_CONFIG.warning_owner;
            return (
              <div key={a.id} className={`rounded-2xl border p-4 space-y-3 ${cfg.color}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full border mr-2 ${cfg.color}`}>{cfg.label}</span>
                    <span className="font-semibold text-sm">{a.target_email}</span>
                  </div>
                  <span className="text-xs opacity-60 flex-shrink-0">{a.created_date ? new Date(a.created_date).toLocaleDateString("fr-FR") : ""}</span>
                </div>
                {a.trigger_detail && <p className="text-xs opacity-70">{a.trigger_detail}</p>}
                <textarea className="w-full text-xs border border-current/20 rounded-xl p-2 bg-white/60 resize-none" placeholder="Note admin..." rows={2}
                  value={notes[a.id] ?? a.admin_note ?? ""} onChange={e => setNotes(n => ({ ...n, [a.id]: e.target.value }))} />
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => resolveAlert(a.id)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-green-600 text-white rounded-full hover:bg-green-700"><CheckCircle className="w-3 h-3" /> Résoudre</button>
                  <button onClick={() => openEmail(a.target_email, `Suite à une alerte de type "${a.alert_type}" détectée sur votre compte Ziga Link, nous vous contactons pour...`)}
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700"><Mail className="w-3 h-3" /> Contacter</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Onglet 1 — Signalements */}
      {tab === 1 && (
        <div className="space-y-3">
          {reports.length === 0 && <div className="text-center py-12 bg-white rounded-2xl border border-stone-100"><CheckCircle className="w-8 h-8 text-teal-400 mx-auto mb-2" /><p className="text-stone-400 text-sm">Aucun signalement en attente ✅</p></div>}
          {reports.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-sm text-stone-800">{r.reported_user_email}</div>
                  <div className="text-xs text-rose-600 font-medium mt-0.5">{REASON_LABELS[r.reason] || r.reason}</div>
                  {r.details && <p className="text-xs text-stone-400 mt-1 italic">"{r.details}"</p>}
                </div>
                <span className="text-xs text-stone-300 flex-shrink-0">{r.created_date ? new Date(r.created_date).toLocaleDateString("fr-FR") : ""}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => resolveReport(r.id)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-green-100 text-green-700 rounded-full hover:bg-green-200"><CheckCircle className="w-3 h-3" /> Résolu</button>
                <button onClick={() => shadowBan(r.reported_user_email)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-red-100 text-red-700 rounded-full hover:bg-red-200"><EyeOff className="w-3 h-3" /> Shadow ban</button>
                <button onClick={() => openEmail(r.reported_user_email, `Suite au signalement reçu sur votre compte Ziga Link pour motif "${REASON_LABELS[r.reason] || r.reason}", nous vous contactons pour...`)}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"><Mail className="w-3 h-3" /> Contacter</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Onglet 2 — Utilisateurs à risque */}
      {tab === 2 && (
        <div className="space-y-3">
          {riskUsers.length === 0 && <div className="text-center py-12 bg-white rounded-2xl border border-stone-100"><CheckCircle className="w-8 h-8 text-teal-400 mx-auto mb-2" /><p className="text-stone-400 text-sm">Aucun utilisateur à risque</p></div>}
          {riskUsers.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
              <div className="flex items-center gap-3">
                {p.photo_url
                  ? <img src={p.photo_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  : <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-lg flex-shrink-0">👤</div>}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-stone-800">{p.pseudo || p.created_by}</div>
                  <div className="text-xs text-stone-400">{p.created_by}</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(p.reputation_score || 0) < -3 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Rep: {p.reputation_score}</span>}
                    {p.trust_level !== "normal" && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{p.trust_level}</span>}
                    {p.reportCount >= 3 && <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">{p.reportCount} signalements</span>}
                  </div>
                </div>
              </div>
              {/* Actions directes trust level */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setTrustLevel(p, "warning")}
                  className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                    p.trust_level === "warning" ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                  }`}>
                  ⚠️ Warning
                </button>
                <button
                  onClick={() => setTrustLevel(p, "shadow_banned")}
                  className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                    p.trust_level === "shadow_banned" ? "bg-red-600 text-white" : "bg-red-100 text-red-700 hover:bg-red-200"
                  }`}>
                  🔇 Shadow ban
                </button>
                <button
                  onClick={() => setTrustLevel(p, "normal")}
                  className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                    p.trust_level === "normal" ? "bg-green-500 text-white" : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}>
                  ✅ Lever
                </button>
              </div>
              {/* Historique ModerationLog */}
              {(() => {
                const userLogs = modLogs.filter(l => l.target_user_email === p.created_by).slice(0, 3);
                if (userLogs.length === 0) return null;
                return (
                  <div className="bg-stone-50 rounded-xl px-3 py-2 space-y-1">
                    {userLogs.map((log, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-stone-400">
                        <span className="text-stone-300">{log.created_date ? new Date(log.created_date).toLocaleDateString("fr-FR") : "—"}</span>
                        <span className="font-medium text-stone-500">{log.action}</span>
                        <span className="truncate">{log.moderator_email}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {/* Onglet 3 — Inactifs à relancer */}
      {tab === 3 && (
        <div className="space-y-3">
          <p className="text-xs text-stone-400">Inscrits depuis plus de 14 jours, sans annonce ni balade.</p>
          {inactiveUsers.length === 0 && <div className="text-center py-12 bg-white rounded-2xl border border-stone-100"><Users className="w-8 h-8 text-teal-400 mx-auto mb-2" /><p className="text-stone-400 text-sm">Aucun inactif à relancer</p></div>}
          {inactiveUsers.map(u => (
            <div key={u.id} className="bg-white rounded-2xl border border-stone-100 p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-stone-800">{u.full_name || u.email}</div>
                <div className="text-xs text-stone-400">{u.email}</div>
                <div className="text-xs text-stone-300 mt-0.5">Inscrit le {u.created_date ? new Date(u.created_date).toLocaleDateString("fr-FR") : "—"}</div>
              </div>
              <button onClick={() => openEmail(u.email, "Bonjour ! Nous avons remarqué que vous n'avez pas encore publié d'annonce sur Ziga Link. Nous vous invitons à créer votre première balade pour rencontrer d'autres propriétaires dans votre zone 🐾")}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-teal-100 text-teal-700 rounded-full hover:bg-teal-200 flex-shrink-0"><Mail className="w-3 h-3" /> Relancer</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}