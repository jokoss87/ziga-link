import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, CheckCircle, Activity, MessageCircle, AlertTriangle } from "lucide-react";

function StatCard({ icon: Icon, label, value, color = "teal" }) {
  const colors = {
    teal: "bg-teal-50 text-teal-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
    rose: "bg-rose-50 text-rose-600",
    blue: "bg-blue-50 text-blue-600",
  };
  return (
    <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-black text-stone-800">{value ?? "—"}</div>
      <div className="text-sm font-semibold text-stone-600 mt-0.5">{label}</div>
    </div>
  );
}

export default function AdminEngagement() {
  const [data, setData] = useState(null);
  const [inactive7, setInactive7] = useState([]);
  const [inactive30, setInactive30] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [users, profiles, requests, conversations] = await Promise.all([
      base44.entities.User.list("-created_date", 500),
      base44.entities.UserProfile.list("-created_date", 500),
      base44.entities.MeetupRequest.list("-created_date", 500),
      base44.entities.Conversation.list("-created_date", 200),
    ]);

    // % profils complétés
    const completedProfiles = profiles.filter(p => p.pseudo && p.city && p.experience_level).length;
    const profilePct = users.length > 0 ? Math.round((completedProfiles / users.length) * 100) : 0;

    // moyenne matchs par user
    const accepted = requests.filter(r => r.status === "accepted").length;
    const avgMatchs = users.length > 0 ? (accepted / users.length).toFixed(1) : 0;

    // % matchs → conversation
    const convFromMatch = conversations.length;
    const matchPct = accepted > 0 ? Math.round((convFromMatch / accepted) * 100) : 0;

    // utilisateurs inactifs
    const now = new Date();
    const d7 = new Date(now - 7 * 86400000);
    const d30 = new Date(now - 30 * 86400000);

    const profileMap = {};
    profiles.forEach(p => { profileMap[p.created_by] = p; });

    const usersWithLastActivity = users.map(u => {
      const p = profileMap[u.email];
      return { ...u, pseudo: p?.pseudo || u.full_name || u.email, city: p?.city };
    });

    setInactive7(usersWithLastActivity.filter(u => u.created_date && new Date(u.created_date) < d7).slice(0, 10));
    setInactive30(usersWithLastActivity.filter(u => u.created_date && new Date(u.created_date) < d30).slice(0, 10));

    setData({ profilePct, avgMatchs, matchPct, totalUsers: users.length, completedProfiles });
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-400 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={CheckCircle} label="Profils complétés" value={`${data.profilePct}%`} color="teal" />
        <StatCard icon={Activity} label="Matchs par utilisateur" value={data.avgMatchs} color="amber" />
        <StatCard icon={MessageCircle} label="Matchs → conversation" value={`${data.matchPct}%`} color="purple" />
        <StatCard icon={Clock} label="Utilisateurs totaux" value={data.totalUsers} color="blue" />
      </div>

      {/* Inactifs 7j */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <h3 className="font-bold text-stone-700 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" /> Inactifs depuis 7 jours
          <span className="ml-auto text-xs text-stone-400 font-normal">{inactive7.length} utilisateurs</span>
        </h3>
        {inactive7.length === 0 ? (
          <p className="text-stone-400 text-sm">Aucun utilisateur inactif ✅</p>
        ) : (
          <div className="space-y-2">
            {inactive7.map(u => (
              <div key={u.id} className="flex items-center gap-3 py-2 border-b border-stone-50 last:border-0">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700">
                  {(u.pseudo || u.email)[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-stone-700">{u.pseudo}</div>
                  <div className="text-xs text-stone-400">{u.email} {u.city ? `· ${u.city}` : ""}</div>
                </div>
                <div className="ml-auto text-xs text-stone-400">
                  {u.created_date ? new Date(u.created_date).toLocaleDateString("fr-FR") : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inactifs 30j */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <h3 className="font-bold text-stone-700 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500" /> Inactifs depuis 30 jours
          <span className="ml-auto text-xs text-stone-400 font-normal">{inactive30.length} utilisateurs</span>
        </h3>
        {inactive30.length === 0 ? (
          <p className="text-stone-400 text-sm">Aucun utilisateur inactif ✅</p>
        ) : (
          <div className="space-y-2">
            {inactive30.map(u => (
              <div key={u.id} className="flex items-center gap-3 py-2 border-b border-stone-50 last:border-0">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-sm font-bold text-rose-700">
                  {(u.pseudo || u.email)[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-stone-700">{u.pseudo}</div>
                  <div className="text-xs text-stone-400">{u.email} {u.city ? `· ${u.city}` : ""}</div>
                </div>
                <div className="ml-auto text-xs text-stone-400">
                  {u.created_date ? new Date(u.created_date).toLocaleDateString("fr-FR") : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}