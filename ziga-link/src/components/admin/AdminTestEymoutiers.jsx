import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, MessageCircle, Heart, MapPin, Activity, Ban, RefreshCw } from "lucide-react";

function StatCard({ icon: Icon, label, value, color = "teal", sub }) {
  const colors = {
    teal: "bg-teal-50 text-teal-600",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    green: "bg-green-50 text-green-600",
  };
  return (
    <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="text-2xl font-black text-stone-800">{value}</div>
      <div className="text-xs font-semibold text-stone-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-stone-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function AdminTestEymoutiers() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [posts, setPosts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("stats");

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [allUsers, anns, allPosts, convMessages, allActivities, meetupRequests] = await Promise.all([
      base44.entities.UserProfile.list("-created_date", 100),
      base44.entities.MeetupAnnouncement.list("-created_date", 100),
      base44.entities.Post.list("-created_date", 100),
      base44.entities.ConversationMessage.list("-created_date", 100),
      base44.entities.Activity.list("-created_date", 100),
      base44.entities.MeetupRequest.list("-created_date", 100),
    ]);

    const today = new Date().toDateString();
    const todayUsers = allUsers.filter(u => new Date(u.created_date).toDateString() === today);
    const todayPosts = allPosts.filter(p => new Date(p.created_date).toDateString() === today);
    const todayMessages = convMessages.filter(m => new Date(m.created_date).toDateString() === today);
    const todayMatches = meetupRequests.filter(r => new Date(r.created_date).toDateString() === today);

    setStats({
      totalUsers: allUsers.length,
      newToday: todayUsers.length,
      totalAnnouncements: anns.length,
      totalPosts: allPosts.length,
      postsToday: todayPosts.length,
      totalMessages: convMessages.length,
      messagestoday: todayMessages.length,
      totalActivities: allActivities.length,
      totalMatches: meetupRequests.length,
      matchesToday: todayMatches.length,
      totalLikes: allPosts.reduce((sum, p) => sum + (p.likes?.length || 0), 0),
    });
    setUsers(allUsers);
    setAnnouncements(anns);
    setPosts(allPosts);
    setMessages(convMessages);
    setLoading(false);
  };

  const handleBlock = async (userId) => {
    if (!window.confirm("Bloquer cet utilisateur ?")) return;
    await base44.entities.UserProfile.update(userId, { blocked: true });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, blocked: true } : u));
  };

  const handleUnblock = async (userId) => {
    await base44.entities.UserProfile.update(userId, { blocked: false });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, blocked: false } : u));
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Supprimer ce post ?")) return;
    await base44.entities.Post.delete(postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-400 border-t-transparent" />
    </div>
  );

  const sections = [
    { id: "stats", label: "Statistiques" },
    { id: "users", label: `Utilisateurs (${users.length})` },
    { id: "posts", label: `Posts (${posts.length})` },
    { id: "announcements", label: `Annonces (${announcements.length})` },
  ];

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}>
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <MapPin className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-white font-black text-sm">Version Test Eymoutiers</div>
          <div className="text-teal-100 text-xs">Zone active · 25 km · Simulation communauté locale</div>
        </div>
        <button onClick={loadAll} className="p-2 bg-white/20 rounded-xl">
          <RefreshCw className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Users} label="Utilisateurs total" value={stats.totalUsers} sub={`+${stats.newToday} aujourd'hui`} color="teal" />
          <StatCard icon={Heart} label="Matchs total" value={stats.totalMatches} sub={`+${stats.matchesToday} aujourd'hui`} color="rose" />
          <StatCard icon={MessageCircle} label="Messages" value={stats.totalMessages} sub={`+${stats.messagestoday} aujourd'hui`} color="blue" />
          <StatCard icon={Activity} label="Posts" value={stats.totalPosts} sub={`+${stats.postsToday} aujourd'hui`} color="amber" />
          <StatCard icon={MapPin} label="Annonces" value={stats.totalAnnouncements} color="purple" />
          <StatCard icon={Activity} label="Likes totaux" value={stats.totalLikes} color="green" />
        </div>
      )}

      {/* Section tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activeSection === s.id ? "bg-stone-800 text-white" : "bg-white text-stone-500 border border-stone-200"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Users */}
      {activeSection === "users" && (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className={`bg-white rounded-2xl p-3.5 border flex items-center gap-3 ${u.blocked ? "border-red-200 bg-red-50" : "border-stone-100"}`}>
              {u.photo_url ? (
                <img src={u.photo_url} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {(u.pseudo || "?")[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-stone-800 text-sm truncate">{u.pseudo || "Sans pseudo"}</div>
                <div className="text-xs text-stone-400">{u.city || "Pas de ville"} · {u.created_by}</div>
                {u.blocked && <div className="text-xs text-red-500 font-bold mt-0.5">🚫 Bloqué</div>}
              </div>
              {u.blocked ? (
                <button onClick={() => handleUnblock(u.id)} className="text-xs px-3 py-1.5 rounded-xl bg-stone-100 text-stone-600 font-semibold">
                  Débloquer
                </button>
              ) : (
                <button onClick={() => handleBlock(u.id)} className="text-xs px-3 py-1.5 rounded-xl bg-red-50 text-red-500 font-semibold flex items-center gap-1">
                  <Ban className="w-3 h-3" /> Bloquer
                </button>
              )}
            </div>
          ))}
          {users.length === 0 && <p className="text-center text-stone-400 text-sm py-8">Aucun utilisateur</p>}
        </div>
      )}

      {/* Posts */}
      {activeSection === "posts" && (
        <div className="space-y-2">
          {posts.map(p => (
            <div key={p.id} className="bg-white rounded-2xl p-3.5 border border-stone-100">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-stone-800 text-xs">{p.author_name || "Anonyme"}</div>
                  <div className="text-sm text-stone-600 mt-0.5 line-clamp-2">{p.content}</div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-stone-400">
                    <span>❤️ {p.likes?.length || 0}</span>
                    <span>📅 {new Date(p.created_date).toLocaleDateString("fr-FR")}</span>
                    {p.city && <span>📍 {p.city}</span>}
                  </div>
                </div>
                <button onClick={() => handleDeletePost(p.id)} className="text-xs px-2.5 py-1.5 rounded-xl bg-red-50 text-red-400 font-semibold flex-shrink-0">
                  Suppr.
                </button>
              </div>
            </div>
          ))}
          {posts.length === 0 && <p className="text-center text-stone-400 text-sm py-8">Aucun post</p>}
        </div>
      )}

      {/* Announcements */}
      {activeSection === "announcements" && (
        <div className="space-y-2">
          {announcements.map(a => (
            <div key={a.id} className="bg-white rounded-2xl p-3.5 border border-stone-100">
              <div className="font-semibold text-stone-800 text-sm">{a.title}</div>
              <div className="flex items-center gap-3 mt-1 text-xs text-stone-400">
                <span>🐕 {a.dog_name}</span>
                <span>👤 {a.owner_name}</span>
                {a.city && <span>📍 {a.city}</span>}
                <span className={`px-2 py-0.5 rounded-full font-bold ${a.status === "open" ? "bg-teal-50 text-teal-600" : "bg-stone-100 text-stone-500"}`}>{a.status}</span>
              </div>
            </div>
          ))}
          {announcements.length === 0 && <p className="text-center text-stone-400 text-sm py-8">Aucune annonce</p>}
        </div>
      )}
    </div>
  );
}