import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { invalidateShadowBanCache } from "@/components/lib/cache";
import { Flag, ShieldOff, Ban, AlertTriangle, CheckCircle, Trash2, EyeOff, Eye } from "lucide-react";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "";

const SENSITIVE_WORDS = ["insulte", "harcèlement", "menace", "spam", "arnaque", "vendre", "achat", "tuer", "mort"];

const reasonLabels = {
  spam: "Spam",
  harcelement: "Harcèlement",
  faux_profil: "Faux profil",
  contenu_inapproprie: "Contenu inapproprié",
  autre: "Autre",
};

export default function AdminModeration() {
  const { user: currentAdmin } = useUserProfile();
  const [reports, setReports] = useState([]);
  const [suspiciousPosts, setSuspiciousPosts] = useState([]);
  const [moderationLogs, setModerationLogs] = useState([]);
  const [shadowBannedProfiles, setShadowBannedProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [rpts, posts, logs, profiles] = await Promise.all([
      base44.entities.Report.list("-created_date", 50),
      base44.entities.Post.list("-created_date", 100),
      base44.entities.ModerationLog.list("-created_date", 100),
      base44.entities.UserProfile.filter({ is_shadow_banned: true }, "-created_date", 50),
    ]);
    setReports(rpts);
    setModerationLogs(logs);
    setShadowBannedProfiles(profiles);
    const suspicious = posts.filter(p =>
      SENSITIVE_WORDS.some(w => p.content?.toLowerCase().includes(w))
    );
    setSuspiciousPosts(suspicious);
    setLoading(false);
  };

  const handleResolve = async (id) => {
    await base44.entities.Report.update(id, { status: "resolved" });
    setActionMsg("Signalement résolu ✅");
    setTimeout(() => setActionMsg(""), 3000);
    load();
  };

  const handleSuspend = async (report) => {
    await base44.entities.Report.update(report.id, { status: "reviewed" });
    setActionMsg(`Utilisateur ${report.reported_user_email} suspendu (marqué comme revu)`);
    setTimeout(() => setActionMsg(""), 4000);
    load();
  };

  const handleShadowBan = async (targetEmail, targetName, unban = false) => {
    if (currentAdmin?.email !== ADMIN_EMAIL) return;
    const profiles = await base44.entities.UserProfile.filter({ created_by: targetEmail }, "-created_date", 1);
    if (!profiles[0]) return;
    await base44.entities.UserProfile.update(profiles[0].id, { is_shadow_banned: !unban });
    invalidateShadowBanCache();
    await base44.entities.ModerationLog.create({
      moderator_email: currentAdmin.email,
      target_user_email: targetEmail,
      target_user_name: targetName || targetEmail,
      action: unban ? "shadow_unban" : "shadow_ban",
    });
    setActionMsg(unban ? `Shadow ban levé pour ${targetEmail} ✅` : `🔇 ${targetEmail} shadow banni`);
    setTimeout(() => setActionMsg(""), 4000);
    load();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-400 border-t-transparent" /></div>;

  const pending = reports.filter(r => r.status === "pending");

  return (
    <div className="space-y-6">
      {actionMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl px-4 py-3 text-sm font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {actionMsg}
        </div>
      )}

      {/* Signalements en attente */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <h3 className="font-bold text-stone-700 mb-4 flex items-center gap-2">
          <Flag className="w-4 h-4 text-rose-500" /> Signalements en attente
          <span className="ml-auto text-xs font-normal text-stone-400">{pending.length} en attente</span>
        </h3>
        {pending.length === 0 ? (
          <p className="text-stone-400 text-sm">Aucun signalement en attente ✅</p>
        ) : (
          <div className="space-y-3">
            {pending.map(r => (
              <div key={r.id} className="border border-stone-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-stone-800">{r.reported_user_email}</div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      Raison : <span className="font-medium text-rose-600">{reasonLabels[r.reason] || r.reason}</span>
                    </div>
                    {r.details && <div className="text-xs text-stone-500 mt-1 italic">"{r.details}"</div>}
                    <div className="text-xs text-stone-300 mt-1">{r.created_date ? new Date(r.created_date).toLocaleDateString("fr-FR") : "—"}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSuspend(r)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors border border-amber-200"
                  >
                    <ShieldOff className="w-3.5 h-3.5" /> Suspendre
                  </button>
                  <button
                    onClick={() => handleResolve(r.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 transition-colors border border-green-200"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Résoudre
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tous les signalements */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <h3 className="font-bold text-stone-700 mb-4 flex items-center gap-2">
          <Ban className="w-4 h-4 text-stone-400" /> Tous les signalements
          <span className="ml-auto text-xs font-normal text-stone-400">{reports.length} total</span>
        </h3>
        {reports.length === 0 ? (
          <p className="text-stone-400 text-sm">Aucun signalement</p>
        ) : (
          <div className="space-y-2">
            {reports.map(r => (
              <div key={r.id} className="flex items-center gap-3 py-2 border-b border-stone-50 last:border-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${r.status === "pending" ? "bg-rose-400" : r.status === "resolved" ? "bg-green-400" : "bg-amber-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-stone-700 truncate">{r.reported_user_email}</div>
                  <div className="text-xs text-stone-400">{reasonLabels[r.reason] || r.reason}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === "pending" ? "bg-rose-50 text-rose-600" : r.status === "resolved" ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>
                  {r.status === "pending" ? "En attente" : r.status === "resolved" ? "Résolu" : "Revu"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Journal de modération */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <h3 className="font-bold text-stone-700 mb-1 flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-rose-500" /> Journal de modération
          <span className="ml-auto text-xs font-normal text-stone-400">{moderationLogs.length} action(s)</span>
        </h3>
        {/* Stats rapides */}
        {moderationLogs.length > 0 && (() => {
          const byUser = {};
          moderationLogs.forEach(l => {
            byUser[l.target_user_email] = (byUser[l.target_user_email] || 0) + 1;
          });
          const topUsers = Object.entries(byUser).sort((a, b) => b[1] - a[1]).slice(0, 3);
          return (
            <div className="flex flex-wrap gap-2 mb-4">
              {topUsers.map(([email, count]) => (
                <span key={email} className="text-xs bg-rose-50 text-rose-700 rounded-full px-3 py-1 font-semibold border border-rose-100">
                  {email.split("@")[0]} · {count} suppression{count > 1 ? "s" : ""}
                </span>
              ))}
            </div>
          );
        })()}
        {moderationLogs.length === 0 ? (
          <p className="text-stone-400 text-sm">Aucune action de modération enregistrée ✅</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {moderationLogs.map(l => (
              <div key={l.id} className="border border-rose-50 bg-rose-50/40 rounded-2xl p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <span className="text-xs font-bold text-rose-700">@{l.target_user_name || l.target_user_email}</span>
                    <span className="text-xs text-stone-400 ml-2">{l.target_user_email}</span>
                  </div>
                  <span className="text-xs text-stone-300 flex-shrink-0">{l.created_date ? new Date(l.created_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                </div>
                {l.post_content && (
                  <p className="text-xs text-stone-500 italic line-clamp-2 bg-white rounded-xl px-2.5 py-1.5 mt-1">"{l.post_content}"</p>
                )}
                <div className="text-xs text-stone-400 mt-1">Par : {l.moderator_email}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shadow Ban - visible uniquement pour l'admin principal */}
      {currentAdmin?.email === ADMIN_EMAIL && (
        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm">
          <h3 className="font-bold text-stone-700 mb-4 flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-rose-600" /> Shadow Ban
            <span className="ml-1 text-xs bg-rose-100 text-rose-600 rounded-full px-2 py-0.5 font-semibold">Admin only</span>
            <span className="ml-auto text-xs font-normal text-stone-400">{shadowBannedProfiles.length} compte(s)</span>
          </h3>
          <p className="text-xs text-stone-400 mb-4">L'utilisateur continue à voir ses posts normalement, mais ils sont invisibles pour les autres.</p>

          {/* Appliquer un shadow ban depuis un signalement */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-stone-500 mb-2">Bannir depuis un signalement :</p>
            <div className="space-y-2">
              {reports.filter(r => r.status === "pending").slice(0, 5).map(r => (
                <div key={r.id} className="flex items-center justify-between gap-2 bg-stone-50 rounded-xl px-3 py-2">
                  <span className="text-xs text-stone-600 truncate">{r.reported_user_email}</span>
                  <button
                    onClick={() => handleShadowBan(r.reported_user_email, r.reported_user_email)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 font-semibold hover:bg-rose-200 transition-colors flex-shrink-0"
                  >
                    <EyeOff className="w-3 h-3" /> Shadow ban
                  </button>
                </div>
              ))}
              {reports.filter(r => r.status === "pending").length === 0 && (
                <p className="text-xs text-stone-400">Aucun signalement en attente</p>
              )}
            </div>
          </div>

          {/* Liste des shadow bannis */}
          {shadowBannedProfiles.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-stone-500 mb-2">Comptes shadow bannis :</p>
              <div className="space-y-2">
                {shadowBannedProfiles.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-2 bg-rose-50 rounded-xl px-3 py-2 border border-rose-100">
                    <div>
                      <span className="text-xs font-bold text-rose-700">{p.pseudo}</span>
                      <span className="text-xs text-stone-400 ml-2">{p.created_by}</span>
                    </div>
                    <button
                      onClick={() => handleShadowBan(p.created_by, p.pseudo, true)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-green-50 text-green-700 font-semibold hover:bg-green-100 transition-colors flex-shrink-0 border border-green-200"
                    >
                      <Eye className="w-3 h-3" /> Lever
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Détection mots sensibles */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <h3 className="font-bold text-stone-700 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" /> Posts avec mots sensibles détectés
          <span className="ml-auto text-xs font-normal text-stone-400">{suspiciousPosts.length} post(s)</span>
        </h3>
        {suspiciousPosts.length === 0 ? (
          <p className="text-stone-400 text-sm">Aucun contenu suspect ✅</p>
        ) : (
          <div className="space-y-3">
            {suspiciousPosts.slice(0, 5).map(p => (
              <div key={p.id} className="border border-amber-100 bg-amber-50 rounded-2xl p-3">
                <div className="text-xs font-bold text-amber-800">{p.author_name || "Anonyme"}</div>
                <p className="text-xs text-stone-600 mt-1 line-clamp-2">{p.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}