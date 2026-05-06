import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Mail, Flag, Shield, RefreshCw, Eye, ChevronDown, ChevronUp } from "lucide-react";

const TRUST_CONFIG = {
  normal:       { label: "Normal",      color: "bg-green-100 text-green-700" },
  warning:      { label: "⚠️ Warning",  color: "bg-amber-100 text-amber-700" },
  shadow_banned:{ label: "🚫 Banni",    color: "bg-red-100 text-red-600" },
};

function riskScore({ reports, emails, alerts, trust }) {
  let score = 0;
  score += reports * 3;
  score += emails * 2;
  score += alerts * 2;
  if (trust === "shadow_banned") score += 10;
  if (trust === "warning") score += 5;
  return score;
}

function RiskBadge({ score }) {
  if (score >= 15) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">🔴 Critique</span>;
  if (score >= 8)  return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">🟠 Élevé</span>;
  if (score >= 3)  return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">🟡 Modéré</span>;
  return null;
}

export default function AdminRiskUsers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedEmail, setExpandedEmail] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [profiles, reports, emailLogs, alerts] = await Promise.all([
      base44.entities.UserProfile.list("-created_date", 500),
      base44.entities.Report.list("-created_date", 500),
      base44.entities.AdminEmailLog.list("-created_date", 500),
      base44.entities.ModerationAlert.filter({ status: "new" }, "-created_date", 500),
    ]);

    // Agréger par email
    const map = {};

    profiles.forEach(p => {
      const key = p.created_by;
      if (!key) return;
      if (!map[key]) map[key] = { email: key, pseudo: p.pseudo, city: p.city, trust: p.trust_level || "normal", reports: 0, emails: 0, alerts: 0, alertDetails: [], reportDetails: [], emailDetails: [] };
      map[key].trust = p.trust_level || "normal";
      map[key].pseudo = p.pseudo;
    });

    reports.forEach(r => {
      const key = r.reported_user_email;
      if (!key) return;
      if (!map[key]) map[key] = { email: key, pseudo: null, city: null, trust: "normal", reports: 0, emails: 0, alerts: 0, alertDetails: [], reportDetails: [], emailDetails: [] };
      map[key].reports += 1;
      map[key].reportDetails.push(r);
    });

    emailLogs.forEach(l => {
      const key = l.recipient_email;
      if (!key) return;
      if (!map[key]) map[key] = { email: key, pseudo: null, city: null, trust: "normal", reports: 0, emails: 0, alerts: 0, alertDetails: [], reportDetails: [], emailDetails: [] };
      map[key].emails += 1;
      map[key].emailDetails.push(l);
    });

    alerts.forEach(a => {
      const key = a.target_email;
      if (!key) return;
      if (!map[key]) map[key] = { email: key, pseudo: null, city: null, trust: "normal", reports: 0, emails: 0, alerts: 0, alertDetails: [], reportDetails: [], emailDetails: [] };
      map[key].alerts += 1;
      map[key].alertDetails.push(a);
    });

    // Filtrer uniquement les utilisateurs avec au moins 1 signal
    const risky = Object.values(map)
      .filter(u => u.reports > 0 || u.emails > 0 || u.alerts > 0 || u.trust !== "normal")
      .map(u => ({ ...u, score: riskScore(u) }))
      .sort((a, b) => b.score - a.score);

    setRows(risky);
    setLoading(false);
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-red-400 border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-stone-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" /> Cas sensibles ({rows.length})
          </h3>
          <p className="text-xs text-stone-400 mt-1">Triés par score de risque — signalements + emails admin + alertes + trust</p>
        </div>
        <button onClick={load} className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-400 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {rows.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-stone-100">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-stone-500 text-sm">Aucun cas sensible détecté</p>
        </div>
      )}

      <div className="space-y-2">
        {rows.map(u => {
          const isExpanded = expandedEmail === u.email;
          const trust = TRUST_CONFIG[u.trust] || TRUST_CONFIG.normal;
          return (
            <div key={u.email} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              {/* Ligne principale */}
              <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-stone-50 transition-colors"
                onClick={() => setExpandedEmail(isExpanded ? null : u.email)}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-stone-800">{u.pseudo || u.email}</span>
                    <RiskBadge score={u.score} />
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${trust.color}`}>{trust.label}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400">
                    <span className="text-stone-500 truncate max-w-[160px]">{u.email}</span>
                    {u.reports > 0 && (
                      <span className="flex items-center gap-1 text-red-600 font-semibold">
                        <Flag className="w-3 h-3" />{u.reports} signalement{u.reports > 1 ? "s" : ""}
                      </span>
                    )}
                    {u.emails > 0 && (
                      <span className="flex items-center gap-1 text-blue-600 font-semibold">
                        <Mail className="w-3 h-3" />{u.emails} email{u.emails > 1 ? "s" : ""}
                      </span>
                    )}
                    {u.alerts > 0 && (
                      <span className="flex items-center gap-1 text-amber-600 font-semibold">
                        <AlertTriangle className="w-3 h-3" />{u.alerts} alerte{u.alerts > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-black text-stone-400">#{u.score}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                </div>
              </button>

              {/* Détail expansible */}
              {isExpanded && (
                <div className="border-t border-stone-100 px-4 py-4 space-y-4 bg-stone-50/50">

                  {u.reportDetails.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1.5"><Flag className="w-3 h-3" /> Signalements</h5>
                      <div className="space-y-1.5">
                        {u.reportDetails.map(r => (
                          <div key={r.id} className="bg-red-50 rounded-lg px-3 py-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-red-700">{r.reason}</span>
                              <span className="text-stone-400">{r.created_date ? new Date(r.created_date).toLocaleDateString("fr-FR") : ""}</span>
                            </div>
                            {r.details && <p className="text-xs text-stone-500 mt-0.5">{r.details}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {u.alertDetails.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold text-amber-600 mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> Alertes modération</h5>
                      <div className="space-y-1.5">
                        {u.alertDetails.map(a => (
                          <div key={a.id} className="bg-amber-50 rounded-lg px-3 py-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-amber-700">{a.alert_type}</span>
                              <span className="text-stone-400">{a.created_date ? new Date(a.created_date).toLocaleDateString("fr-FR") : ""}</span>
                            </div>
                            {a.trigger_detail && <p className="text-xs text-stone-500 mt-0.5">{a.trigger_detail}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {u.emailDetails.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold text-blue-600 mb-2 flex items-center gap-1.5"><Mail className="w-3 h-3" /> Emails admin envoyés</h5>
                      <div className="space-y-1.5">
                        {u.emailDetails.map(l => (
                          <div key={l.id} className="bg-blue-50 rounded-lg px-3 py-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-blue-700">{l.subject}</span>
                              <span className="text-stone-400">{l.created_date ? new Date(l.created_date).toLocaleDateString("fr-FR") : ""}</span>
                            </div>
                            <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{l.body}</p>
                            <p className="text-xs text-stone-400 mt-0.5">Par : {l.sent_by}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}