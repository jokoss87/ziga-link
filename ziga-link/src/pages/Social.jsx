import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { Plus, Camera, Sparkles } from "lucide-react";
import PullToRefresh from "@/components/ui/PullToRefresh";
import NewPostCard from "@/components/social/NewPostCard.jsx";
import EventBannerCard from "@/components/events/EventBannerCard";
import CreatePostModal from "@/components/social/CreatePostModal";
import PostCard from "@/components/social/PostCard";

const FILTERS = [
  { value: "all", label: "Tous", emoji: "🐾" },
  { value: "moment", label: "Moments", emoji: "📸" },
  { value: "exploit", label: "Exploits", emoji: "🏆" },
  { value: "conseils", label: "Conseils", emoji: "💡" },
  { value: "question", label: "Questions", emoji: "❓" },
  { value: "evenement", label: "Événements", emoji: "📅" },
];

export default function Social() {
  const { user, profile } = useUserProfile();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);
  const [dogs, setDogs] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => { loadPosts(); }, []);

  useEffect(() => {
    if (user) {
      base44.entities.DogProfile.filter({ created_by: user.email }, "-created_date", 10)
        .then(setDogs)
        .catch(() => {});
    }
  }, [user]);

  // Subscribe temps réel pour les nouveaux posts
  useEffect(() => {
    const unsub = base44.entities.Post.subscribe((event) => {
      if (event.type === "create" && event.data) {
        setPosts(prev => {
          if (prev.find(p => p.id === event.data.id)) return prev;
          return [event.data, ...prev];
        });
      } else if (event.type === "update" && event.data) {
        setPosts(prev => prev.map(p => p.id === event.data.id ? { ...p, ...event.data } : p));
      } else if (event.type === "delete") {
        const deletedId = event.data?.id || event.id;
        setPosts(prev => prev.filter(p => p.id !== deletedId));
      }
    });
    return unsub;
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const allPosts = await base44.entities.Post.list("-created_date", 20);
      const shadowBanned = await base44.entities.UserProfile.filter({ is_shadow_banned: true }, "-created_date", 100).catch(() => []);
      const shadowEmails = new Set(shadowBanned.map((p) => p.created_by).filter(Boolean));
      const filtered = allPosts.filter((p) => !shadowEmails.has(p.created_by) || p.created_by === user?.email);
      const missingPhotoEmails = [...new Set(
        filtered.filter((p) => !p.author_photo && p.created_by).map((p) => p.created_by)
      )];
      const photoMap = {};
      if (missingPhotoEmails.length > 0) {
        await Promise.all(missingPhotoEmails.map(async (email) => {
          const profiles = await base44.entities.UserProfile.filter(
            { created_by: email }, "-created_date", 1
          ).catch(() => []);
          if (profiles[0]?.photo_url) {
            photoMap[email] = profiles[0].photo_url;
          } else {
            const dogs = await base44.entities.DogProfile.filter(
              { created_by: email }, "-created_date", 1
            ).catch(() => []);
            if (dogs[0]?.photo_url) photoMap[email] = dogs[0].photo_url;
          }
        }));
      }
      const enriched = filtered.map((p) =>
        !p.author_photo && photoMap[p.created_by]
          ? { ...p, author_photo: photoMap[p.created_by] }
          : p
      );
      setPosts(enriched);
    } catch (e) {
      console.error("Erreur chargement posts:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => setPosts((prev) => prev.filter((p) => p.id !== id));
  const handleCreated = (newPost) => {
    if (newPost) setPosts((prev) => [newPost, ...prev]);
    else loadPosts();
  };

  const filteredPosts = filter === "all" ? posts : posts.filter((p) => p.category === filter);
  const visible = filteredPosts.slice(0, visibleCount);
  const initial = (profile?.pseudo || user?.full_name || "?")[0]?.toUpperCase();

  return (
    <PullToRefresh onRefresh={loadPosts}>
    <div className="min-h-screen pb-24" style={{ background: "#f0f4f3" }}>
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-stone-100 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-black text-stone-800">Le Clan Ziga Link</h1>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-4">
        {/* Créer un post */}
        <div className="bg-white rounded-3xl p-4 mb-4 shadow-sm border border-stone-100/80">
          <div className="flex items-center gap-3">
            {profile?.photo_url ? (
              <img src={profile.photo_url} className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-stone-100" alt="" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-base font-black text-teal-600 flex-shrink-0">{initial}</div>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className="flex-1 text-left bg-stone-50 rounded-2xl px-4 py-2.5 text-sm text-stone-400 hover:bg-stone-100 transition-colors"
            >
              Partagez un moment avec votre chien... 🐾
            </button>
            <button onClick={() => setShowCreate(true)} className="p-2 rounded-xl bg-teal-50 hover:bg-teal-100 transition-colors">
              <Camera className="w-4 h-4 text-teal-500" />
            </button>
          </div>
        </div>

        <EventBannerCard pageName="social" />

        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === f.value
                  ? "bg-stone-800 text-white shadow-md scale-105"
                  : "bg-white text-stone-500 border border-stone-200 hover:border-stone-400"
              }`}
            >
              {f.emoji} {f.label}
            </button>
          ))}
        </div>

        {/* Posts */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-400 border-t-transparent" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-stone-100 shadow-sm">
            <div className="text-5xl mb-4">📸</div>
            <p className="font-bold text-stone-700">Aucun post pour l'instant</p>
            <p className="text-sm text-stone-400 mt-1 mb-5">Soyez le premier à partager un moment !</p>
            <button onClick={() => setShowCreate(true)} className="bg-teal-500 hover:bg-teal-600 text-white rounded-2xl px-6 py-2.5 font-bold text-sm flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" /> Créer un post
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((post) => (
              <PostCard key={post.id} post={post} currentUser={user} onDelete={handleDelete} />
            ))}
            {visibleCount < filteredPosts.length && (
              <button
                onClick={() => setVisibleCount((v) => v + 10)}
                className="w-full py-3 bg-white rounded-2xl border border-stone-200 text-sm font-semibold text-stone-500 hover:bg-stone-50 transition-colors"
              >
                Voir plus ({filteredPosts.length - visibleCount} posts)
              </button>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <CreatePostModal
          user={user}
          profile={profile}
          dogs={dogs}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
    </PullToRefresh>
  );
}