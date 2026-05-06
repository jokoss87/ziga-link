import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Dog, MessageCircle, Heart, UserCheck, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function StatCard({ icon: Icon, label, value, sub, color = "teal" }) {
  const colors = {
    teal: "bg-teal-50 text-teal-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
    rose: "bg-rose-50 text-rose-600",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
  };
  return (
    <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-black text-stone-800">{value ?? "—"}</div>
      <div className="text-sm font-semibold text-stone-600 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-stone-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const [users, dogs, messages, announcements, requests, posts, profiles] = await Promise.all([
      base44.entities.User.list("-created_date", 500),
      base44.entities.DogProfile.list("-created_date", 500),
      base44.entities.ConversationMessage.list("-created_date", 500),
      base44.entities.MeetupAnnouncement.list("-created_date", 500),
      base44.entities.MeetupRequest.list("-created_date", 200),
      base44.entities.Post.list("-created_date", 200),
      base44.entities.UserProfile.list("-created_date", 500),
    ]);

    const newToday = (arr) => arr.filter(x => x.created_date && new Date(x.created_date) >= today).length;
    const matchesToday = requests.filter(r => r.created_date && new Date(r.created_date) >= today && r.status === "accepted").length;

    // Chart: last 7 days users
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const label = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
      const count = users.filter(u => {
        const c = u.created_date ? new Date(u.created_date) : null;
        return c && c >= d && c < next;
      }).length;
      days.push({ label, inscrits: count });
    }
    setChartData(days);

    setStats({
      totalUsers: users.length,
      newToday: newToday(users),
      activeToday: newToday(posts) + newToday(messages),
      totalDogs: dogs.length,
      messagesToday: newToday(messages),
      matchesToday,
    });
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-400 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Utilisateurs totaux" value={stats.totalUsers} color="teal" />
        <StatCard icon={UserCheck} label="Nouveaux aujourd'hui" value={stats.newToday} color="green" />
        <StatCard icon={TrendingUp} label="Actifs aujourd'hui" value={stats.activeToday} sub="posts + messages" color="blue" />
        <StatCard icon={Dog} label="Chiens enregistrés" value={stats.totalDogs} color="amber" />
        <StatCard icon={MessageCircle} label="Messages aujourd'hui" value={stats.messagesToday} color="purple" />
        <StatCard icon={Heart} label="Matchs aujourd'hui" value={stats.matchesToday} color="rose" />
      </div>

      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <h3 className="font-bold text-stone-700 mb-4">📈 Nouveaux inscrits — 7 derniers jours</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="inscrits" stroke="#4CAF87" strokeWidth={2.5} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}