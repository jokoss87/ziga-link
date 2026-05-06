import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, PawPrint, Heart, TrendingUp, ArrowRight, AlertTriangle, MapPin, Star } from "lucide-react";
import { parseUTC } from "@/components/lib/dateUtils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function KpiCard({ emoji, label, value, sub, colorClass = "text-teal-600", bgClass = "bg-teal-50" }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${bgClass}`}>
        <span className={`text-base font-black ${colorClass}`}>{emoji}</span>
      </div>
      <div className="text-2xl font-black text-stone-800">{value ?? "—"}</div>
      <div className="text-xs font-semibold text-stone-600 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-stone-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard({ onNavigate }) {
  const [kpis, setKpis] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [topZones, setTopZones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);

    const now = new Date();
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const day14ago = new Date(now); day14ago.setDate(now.getDate() - 14);

    const [users, announcements, feedback, emailLogs, alerts, sessions] = await Promise.all([
      base44.entities.User.list("-created_date", 500).catch(() => []),
      base44.entities.MeetupAnnouncement.list("-created_date", 500).catch(() => []),
      base44.entities.UserFeedback.list("-created_date", 200).catch(() => []),
      base44.entities.AdminEmailLog.list("-created_date", 200).catch(() => []),
      base44.entities.ModerationAlert.filter({ status: "new" }, "-created_date", 10).catch(() => []),
      base44.entities.UserSession.list("-created_date", 1000).catch(() => []),
    ]);

    // KPIs
    const newThisWeek = users.filter(u => u.created_date && parseUTC(u.created_date) >= weekAgo).length;
    const announcementsThisMonth = announcements.filter(a => a.created_date && parseUTC(a.created_date) >= monthStart);
    const completedThisMonth = announcementsThisMonth.filter(a => a.status === "completed").length;
    const conversionRate = announcementsThisMonth.length > 0
      ? Math.round((completedThisMonth / announcementsThisMonth.length) * 100)
      : 0;

    // Rétention J+7 : inscrits il y a 7-14j qui ont une session après J+7
    const window7to14 = users.filter(u => {
      if (!u.created_date) return false;
      const d = parseUTC(u.created_date);
      return d >= day14ago && d < weekAgo;
    });
    const retained = window7to14.filter(u => {
      const inscDate = parseUTC(u.created_date);
      const j7 = new Date(inscDate); j7.setDate(j7.getDate() + 7);
      return sessions.some(s => s.created_by === u.email && s.created_date && parseUTC(s.created_date) >= j7);
    }).length;
    const retentionRate = window7to14.length > 0 ? Math.round((retained / window7to14.length) * 100) : 0;

    const avgSatisfaction = feedback.length > 0
      ? Math.round(feedback.reduce((s, f) => s + (f.pleasure_score || 0), 0) / feedback.filter(f => f.pleasure_score).length)
      : null;

    setKpis({
      totalUsers: users.length,
      newThisWeek,
      completedThisMonth,
      conversionRate,
      retentionRate,
      retentionBase: window7to14.length,
      avgSatisfaction,
    });

    // Graphe 30 jours sessions actives
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const label = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
      const unique = new Set(sessions.filter(s => s.created_date && parseUTC(s.created_date) >= d && parseUTC(s.created_date) < next).map(s => s.created_by));
      days.push({ label, actifs: unique.size });
    }
    setChartData(days);

    // Top zones (villes) — annonces ce mois
    const cityCount = {};
    announcementsThisMonth.forEach(a => {
      if (a.city) cityCount[a.city] = (cityCount[a.city] || 0) + 1;
    });
    const sorted = Object.entries(cityCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
    setTopZones(sorted);

    setRecentAlerts(alerts.slice(0, 3));
    setLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-400 border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Zone A — KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard emoji="👥" label="Utilisateurs totaux" value={kpis.totalUsers} sub={`+${kpis.newThisWeek} cette semaine`} colorClass="text-teal-600" bgClass="bg-teal-50" />
        <KpiCard emoji="🐾" label="Balades complétées" value={kpis.completedThisMonth} sub="ce mois" colorClass="text-green-600" bgClass="bg-green-50" />
        <KpiCard emoji="🔄" label="Conversion" value={`${kpis.conversionRate}%`} sub="annonce → balade" colorClass="text-blue-600" bgClass="bg-blue-50" />
        <KpiCard emoji="📈" label="Rétention J+7" value={`${kpis.retentionRate}%`} sub={`sur ${kpis.retentionBase} inscrits`} colorClass="text-purple-600" bgClass="bg-purple-50" />
        <KpiCard emoji="⭐" label="Satisfaction moy." value={kpis.avgSatisfaction !== null ? `${kpis.avgSatisfaction}%` : "—"} sub="UserFeedback" colorClass="text-amber-600" bgClass="bg-amber-50" />
      </div>

      {/* Zone B — Graphique 30 jours */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <h3 className="font-bold text-stone-700 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-teal-500" /> Utilisateurs actifs — 30 derniers jours
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={4} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={25} />
            <Tooltip />
            <Line type="monotone" dataKey="actifs" stroke="#4CAF87" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Zone C — Alertes rapides */}
      {recentAlerts.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-stone-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" /> Alertes récentes
            </h3>
            {onNavigate && (
              <button onClick={() => onNavigate("urgences")} className="text-xs text-teal-600 flex items-center gap-1 hover:underline">
                Voir toutes <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="space-y-2">
            {recentAlerts.map(a => (
              <div key={a.id} className="flex items-center gap-3 bg-red-50 rounded-xl px-3 py-2.5">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-stone-800 truncate block">{a.target_email}</span>
                  <span className="text-xs text-red-600">{a.alert_type}</span>
                </div>
                <span className="text-xs text-stone-400">{a.created_date ? parseUTC(a.created_date).toLocaleDateString("fr-FR") : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zone D — Top zones */}
      {topZones.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
          <h3 className="font-bold text-stone-700 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-teal-500" /> Top zones actives ce mois
          </h3>
          <div className="space-y-2">
            {topZones.map(([city, count], i) => (
              <div key={city} className="flex items-center gap-3">
                <span className="text-sm font-black text-stone-400 w-5">{i + 1}</span>
                <div className="flex-1 bg-stone-100 rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full bg-teal-400" style={{ width: `${Math.round((count / topZones[0][1]) * 100)}%` }} />
                </div>
                <span className="text-sm font-semibold text-stone-700 w-24 text-right">{city}</span>
                <span className="text-xs text-stone-400 w-10 text-right">{count} ann.</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}