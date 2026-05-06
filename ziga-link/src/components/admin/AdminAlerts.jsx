import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { AlertTriangle, CheckCircle, Clock, ShieldOff, Shield } from "lucide-react";

const ALERT_CONFIG = {
  shadow_ban_owner: { label: "Shadow ban proprio", color: "bg-red-100 text-red-800 border-red-300", priority: 0 },
  warning_owner: { label: "Avertissement proprio", color: "bg-amber-100 text-amber-800 border-amber-300", priority: 1 },
  alert_dog: { label: "Alerte chien", color: "bg-orange-100 text-orange-800 border-orange-300", priority: 2 },
  alert_tags: { label: "Tags dangereux", color: "bg-purple-100 text-purple-800 border-purple-300", priority: 3 },
};

const sortByGravity = (alerts) =>
  [...alerts].sort((a, b) => (ALERT_CONFIG[a.alert_type]?.priority ?? 9) - (ALERT_CONFIG[b.alert_type]?.priority ?? 9));

export default function AdminAlerts() {
  const { user } = useUserProfile();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});

  useEffect(() => { loadAlerts(); }, []);

  const loadAlerts = async () => {
    setLoading(true);
    const data = await base44.entities.ModerationAlert.list("-created_date", 200).catch(() => []);
    setAlerts(data);
    setLoading(false);
  };

  const updateAlert = async (id, data) => {
    await base44.entities.ModerationAlert.update(id, data);
    loadAlerts();
  };

  const handleResolve = (id) => updateAlert(id, {
    status: "resolved",
    resolved_at: new Date().toISOString(),
    resolved_by: user?.email || "",
    admin_note: notes[id] || "",
  });

  const handleInProgress = (id) => updateAlert(id, {
    status: "in_progress",
    admin_note: notes[id] || "",
  });

  const handleLiftBan = async (alert) => {
    const profiles = await base44.entities.UserProfile.filter({ created_by: alert.target_email }).catch(() => []);
    if (profiles.length > 0) {
      await base44.entities.UserProfile.update(profiles[0].id, { trust_level: "normal", is_shadow_banned: false });
    }
    await updateAlert(alert.id, {
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: user?.email || "",
      admin_note: "Ban levé manuellement",
    });
  };

  const handleSaveNote = (id) => updateAlert(id, { admin_note: notes[id] || "" });

  const active = sortByGravity(alerts.filter(a => a.status === "new" || a.status === "in_progress"));
  const resolved = alerts.filter(a => a.status === "resolved");

  // Stats
  const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
  const resolvedThisMonth = resolved.filter(a => a.resolved_at && new Date(a.resolved_at) >= thisMonth).length;
  const shadowBanActive = active.filter(a => a.alert_type === "shadow_ban_owner").length;
  const statsByType = Object.keys(ALERT_CONFIG).map(t => ({
    type: t,
    label: ALERT_CONFIG[t].label,
    count: alerts.filter(a => a.alert_type === t).length,
  }));

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-4 border-red-400 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      {/* Zone C — Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statsByType.map(s => (
          <div key={s.type} className="bg-white rounded-2xl border border-stone-100 p-4 text-center shadow-sm">
            <div className="text-2xl font-black text-stone-800">{s.count}</div>
            <div className="text-xs text-stone-500 mt-0.5">{s.label}</div>
          </div>
        ))}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
          <div className="text-2xl font-black text-green-700">{resolvedThisMonth}</div>
          <div className="text-xs text-green-600 mt-0.5">Résolus ce mois</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
          <div className="text-2xl font-black text-red-700">{shadowBanActive}</div>
          <div className="text-xs text-red-600 mt-0.5">Shadow bans actifs</div>
        </div>
      </div>

      {/* Zone A — Alertes actives */}
      <div>
        <h2 className="font-black text-stone-800 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" /> Alertes actives ({active.length})
        </h2>
        {active.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-stone-100">
            <CheckCircle className="w-10 h-10 text-teal-400 mx-auto mb-2" />
            <p className="font-semibold text-stone-500">Aucune alerte active 🎉</p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map(alert => {
              const cfg = ALERT_CONFIG[alert.alert_type] || ALERT_CONFIG.warning_owner;
              return (
                <div key={alert.id} className={`rounded-2xl border p-4 ${cfg.color}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full border mr-2 ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <span className="text-xs opacity-70">{alert.status}</span>
                    </div>
                    <span className="text-xs opacity-60">{alert.created_date ? new Date(alert.created_date).toLocaleDateString("fr-FR") : ""}</span>
                  </div>
                  <p className="font-semibold text-sm">{alert.target_email}</p>
                  {alert.dog_name && <p className="text-xs opacity-80">🐕 {alert.dog_name}</p>}
                  {alert.trigger_detail && <p className="text-xs mt-1 opacity-70">{alert.trigger_detail}</p>}

                  <textarea
                    className="mt-2 w-full text-xs border border-current/20 rounded-xl p-2 bg-white/60 resize-none"
                    placeholder="Note admin..."
                    rows={2}
                    value={notes[alert.id] ?? alert.admin_note ?? ""}
                    onChange={e => setNotes(n => ({ ...n, [alert.id]: e.target.value }))}
                  />

                  <div className="flex flex-wrap gap-2 mt-2">
                    <button onClick={() => handleResolve(alert.id)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-green-600 text-white rounded-full hover:bg-green-700">
                      <CheckCircle className="w-3.5 h-3.5" /> Résolu
                    </button>
                    <button onClick={() => handleInProgress(alert.id)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-amber-500 text-white rounded-full hover:bg-amber-600">
                      <Clock className="w-3.5 h-3.5" /> En cours
                    </button>
                    {alert.auto_action === "shadow_ban" && (
                      <button onClick={() => handleLiftBan(alert)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700">
                        <ShieldOff className="w-3.5 h-3.5" /> Lever le ban
                      </button>
                    )}
                    <button onClick={() => handleSaveNote(alert.id)} className="text-xs text-current opacity-60 underline px-2">
                      Sauver note
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Zone B — Historique */}
      <div>
        <h2 className="font-black text-stone-800 mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-stone-400" /> Historique résolus ({resolved.length})
        </h2>
        {resolved.length === 0 ? (
          <p className="text-center text-stone-400 text-sm py-6">Aucune alerte résolue</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-stone-100 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-stone-50 border-b border-stone-100">
                <tr>
                  <th className="text-left px-4 py-3 text-stone-500 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-semibold">Cible</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-semibold">Résolu le</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                {resolved.map(a => (
                  <tr key={a.id} className="border-b border-stone-50 hover:bg-stone-50">
                    <td className="px-4 py-2.5">{ALERT_CONFIG[a.alert_type]?.label || a.alert_type}</td>
                    <td className="px-4 py-2.5 font-medium">{a.target_email}</td>
                    <td className="px-4 py-2.5 text-stone-400">{a.resolved_at ? new Date(a.resolved_at).toLocaleDateString("fr-FR") : "—"}</td>
                    <td className="px-4 py-2.5 text-stone-400 max-w-[200px] truncate">{a.admin_note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}