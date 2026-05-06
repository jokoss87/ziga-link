import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, Users, Zap, BarChart2, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const fmt = (sec) => {
  if (!sec || sec < 60) return `${sec || 0}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}min`;
  return `${Math.floor(m / 60)}h${m % 60 > 0 ? (m % 60) + "m" : ""}`;
};

const SECTION_LABELS = {
  Home: "🏠 Accueil", Social: "❤️ Communauté", Messages: "💬 Messages",
  Balade: "🐾 Balade", Activities: "🏅 Activités", Matching: "❤️ Matching",
  MyDogs: "🐕 Mes chiens", Profil: "👤 Profil", Obeissance: "🎯 Obéissance",
  Carnet: "📓 Carnet", CarteFullscreen: "🗺️ Carte", Badges: "🏆 Badges",
  SportsCanins: "🏅 Sports", CreateAnnouncement: "➕ Annonce",
};

const COLORS = ["#4CAF87", "#FF7A59", "#6366f1", "#f59e0b", "#ec4899", "#0ea5e9", "#84cc16", "#f97316"];

function StatCard({ icon: Icon, label, value, color = "teal" }) {
  const colors = {
    teal: "bg-teal-50 text-teal-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
    blue: "bg-blue-50 text-blue-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${colors[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-2xl font-black text-stone-800">{value ?? "—"}</div>
      <div className="text-xs font-semibold text-stone-500 mt-0.5">{label}</div>
    </div>
  );
}

export default function AdminSessionStats() {
  const [sessions, setSessions] = useState([]);
  const [dailyAnalytics, setDailyAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.UserSession.list("-session_start", 200),
      base44.entities.DailyAnalytics.list("-date", 30),
    ]).then(([s, d]) => {
      setSessions(s);
      setDailyAnalytics(d.sort((a, b) => a.date.localeCompare(b.date)));
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-400 border-t-transparent" />
    </div>
  );

  if (sessions.length === 0) return (
    <div className="text-center py-20 text-stone-400">
      <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm">Aucune session enregistrée pour l'instant.</p>
      <p className="text-xs mt-1">Les données apparaîtront dès que les utilisateurs utiliseront l'app.</p>
    </div>
  );

  // Agrégations globales
  const totalSessions = sessions.length;
  const avgDuration = Math.round(sessions.reduce((a, s) => a + (s.duration_seconds || 0), 0) / totalSessions);
  const avgActive = Math.round(sessions.reduce((a, s) => a + (s.active_seconds || 0), 0) / totalSessions);

  const now = new Date();

  // Utiliser DailyAnalytics agrégées si disponibles, sinon calcul sur sessions brutes
  let dailyData;
  if (dailyAnalytics.length > 0) {
    dailyData = dailyAnalytics.slice(-7).map(d => ({
      day: new Date(d.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }),
      sessions: d.total_sessions || 0,
      avgDuration: Math.round((d.avg_duration_seconds || 0) / 60),
    }));
  } else {
    const dailyMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
      dailyMap[key] = { day: key, sessions: 0, totalDuration: 0 };
    }
    sessions.forEach(s => {
      if (!s.session_start) return;
      const d = new Date(s.session_start);
      if ((now - d) / 86400000 > 7) return;
      const key = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
      if (dailyMap[key]) { dailyMap[key].sessions++; dailyMap[key].totalDuration += s.duration_seconds || 0; }
    });
    dailyData = Object.values(dailyMap).map(d => ({
      ...d, avgDuration: d.sessions > 0 ? Math.round(d.totalDuration / d.sessions / 60) : 0,
    }));
  }

  // Temps par section : utiliser les DailyAnalytics agrégées si dispo
  let sectionMapSource = {};
  if (dailyAnalytics.length > 0) {
    dailyAnalytics.forEach(d => {
      if (!d.section_times) return;
      Object.entries(d.section_times).forEach(([k, v]) => {
        sectionMapSource[k] = (sectionMapSource[k] || 0) + v;
      });
    });
  }

  // Temps par section : fallback sur sessions brutes si pas d'agrégé
  const sectionMap = Object.keys(sectionMapSource).length > 0 ? sectionMapSource : {};
  if (Object.keys(sectionMap).length === 0) {
    sessions.forEach(s => {
      if (!s.section_times) return;
      Object.entries(s.section_times).forEach(([section, sec]) => {
        sectionMap[section] = (sectionMap[section] || 0) + sec;
      });
    });
  }
  const sectionData = Object.entries(sectionMap)
    .map(([key, total]) => ({ name: SECTION_LABELS[key] || key, value: Math.round(total / 60) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Stats par utilisateur
  const userMap = {};
  sessions.forEach(s => {
    if (!s.user_email) return;
    if (!userMap[s.user_email]) userMap[s.user_email] = { email: s.user_email, count: 0, totalDuration: 0, lastActivity: null };
    userMap[s.user_email].count++;
    userMap[s.user_email].totalDuration += s.duration_seconds || 0;
    if (!userMap[s.user_email].lastActivity || s.session_end > userMap[s.user_email].lastActivity) {
      userMap[s.user_email].lastActivity = s.session_end;
    }
  });
  const userRows = Object.values(userMap)
    .map(u => ({ ...u, avgDuration: Math.round(u.totalDuration / u.count) }))
    .sort((a, b) => b.totalDuration - a.totalDuration)
    .slice(0, 20);

  // Utilisateurs uniques actifs 7j / 30j
  const d7 = new Date(now - 7 * 86400000);
  const d30 = new Date(now - 30 * 86400000);
  const active7 = new Set(sessions.filter(s => s.session_start && new Date(s.session_start) > d7).map(s => s.user_email)).size;
  const active30 = new Set(sessions.filter(s => s.session_start && new Date(s.session_start) > d30).map(s => s.user_email)).size;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Clock} label="Durée moy. session" value={fmt(avgDuration)} color="teal" />
        <StatCard icon={Zap} label="Temps actif moy." value={fmt(avgActive)} color="amber" />
        <StatCard icon={Users} label="Actifs 7 derniers jours" value={active7} color="purple" />
        <StatCard icon={TrendingUp} label="Actifs 30 jours" value={active30} color="blue" />
      </div>

      {/* Sessions par jour */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <h3 className="font-bold text-stone-700 mb-4 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-teal-500" /> Sessions / jour (7j)
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={dailyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="day" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v, n) => [v, n === "sessions" ? "sessions" : "min moy."]} />
            <Bar dataKey="sessions" fill="#4CAF87" radius={[4, 4, 0, 0]} name="sessions" />
            <Bar dataKey="avgDuration" fill="#FF7A59" radius={[4, 4, 0, 0]} name="durée moy (min)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Sections les plus utilisées */}
      {sectionData.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
          <h3 className="font-bold text-stone-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-500" /> Sections les plus visitées (min totales)
          </h3>
          <div className="flex gap-4 items-center">
            <PieChart width={140} height={140}>
              <Pie data={sectionData} cx={65} cy={65} innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={2}>
                {sectionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
            </PieChart>
            <div className="flex-1 space-y-1.5">
              {sectionData.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-stone-600 flex-1 truncate">{s.name}</span>
                  <span className="text-xs font-bold text-stone-700">{s.value}min</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tableau utilisateurs */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <h3 className="font-bold text-stone-700 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" /> Top utilisateurs
          <span className="ml-auto text-xs text-stone-400 font-normal">{userRows.length} profils</span>
        </h3>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-stone-400 border-b border-stone-100">
                <th className="text-left py-2 pl-1 font-semibold">Utilisateur</th>
                <th className="text-center py-2 font-semibold">Sessions</th>
                <th className="text-center py-2 font-semibold">Moy.</th>
                <th className="text-center py-2 font-semibold">Total</th>
                <th className="text-right py-2 pr-1 font-semibold">Dernière act.</th>
              </tr>
            </thead>
            <tbody>
              {userRows.map(u => (
                <tr key={u.email} className="border-b border-stone-50 hover:bg-stone-50">
                  <td className="py-2 pl-1 text-stone-700 truncate max-w-[120px]">{u.email.split("@")[0]}</td>
                  <td className="py-2 text-center font-bold text-stone-800">{u.count}</td>
                  <td className="py-2 text-center text-teal-600 font-semibold">{fmt(u.avgDuration)}</td>
                  <td className="py-2 text-center text-purple-600 font-semibold">{fmt(u.totalDuration)}</td>
                  <td className="py-2 pr-1 text-right text-stone-400">
                    {u.lastActivity ? new Date(u.lastActivity).toLocaleDateString("fr-FR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}