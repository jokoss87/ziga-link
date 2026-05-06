import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useOwnerPhoto } from "@/components/useOwnerPhoto";
import { usePseudoCache } from "@/components/lib/PseudoCacheContext";
import { Heart, MessageCircle, Trash2, Send } from "lucide-react";
import SupportBadge from "@/components/support/SupportBadge";
import { timeAgo } from "@/components/lib/dateUtils";
import PhotoLightbox from "./PhotoLightbox";

const CATEGORY_META = {
  moment: { label: "Bon moment", emoji: "😊", color: "bg-amber-50 text-amber-600 border-amber-200" },
  exploit: { label: "Exploit", emoji: "🏆", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  conseils: { label: "Conseil", emoji: "💡", color: "bg-blue-50 text-blue-600 border-blue-200" },
  question: { label: "Question", emoji: "❓", color: "bg-purple-50 text-purple-600 border-purple-200" },
  evenement: { label: "Événement", emoji: "📅", color: "bg-green-50 text-green-600 border-green-200" },
};

export default function PostCard({ post, currentUser, onDelete }) {
  const navigate = useNavigate();
  const [likes, setLikes] = useState(post.likes || []);
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { resolvePseudos, getCached } = usePseudoCache();
  const [resolvedAuthor, setResolvedAuthor] = useState(null);
  const [, forceUpdate] = useState(0);
  const fallbackPhoto = useOwnerPhoto(!post.author_photo ? post.created_by : null, null);
  const displayPhoto = post.author_photo || fallbackPhoto;

  useEffect(() => {
    if (post.created_by) {
      resolvePseudos([post.created_by]).then(map => {
        setResolvedAuthor(map[post.created_by] || null);
      });
    }
  }, [post.created_by]);

  const isLiked = currentUser && likes.includes(currentUser.email);
  const isOwner = currentUser?.email === post.created_by;
  const isAdmin = currentUser?.role === "admin";
  const canDelete = isOwner || isAdmin;
  const cat = CATEGORY_META[post.category] || CATEGORY_META.moment;

  const handleLike = async () => {
    if (!currentUser) return;
    const newLikes = isLiked ? likes.filter(e => e !== currentUser.email) : [...likes, currentUser.email];
    setLikes(newLikes);
    await base44.entities.Post.update(post.id, { likes: newLikes });
  };

  const loadComments = async () => {
    if (showComments) { setShowComments(false); return; }
    setLoadingComments(true);
    const c = await base44.entities.PostComment.filter({ post_id: post.id }, "created_date", 50);
    setComments(c);
    setLoadingComments(false);
    setShowComments(true);
    const emails = c.map(x => x.created_by).filter(Boolean);
    await resolvePseudos(emails);
    forceUpdate(n => n + 1);
  };

  const submitComment = async () => {
    if (!commentText.trim() || !currentUser) return;
    const c = await base44.entities.PostComment.create({
      post_id: post.id,
      content: commentText.trim(),
      author_name: currentUser.pseudo || currentUser.full_name || "Anonyme",
      author_photo: "",
    });
    setComments(prev => [...prev, c]);
    setCommentText("");
    // Incrémenter le compteur sur le post
    base44.entities.Post.update(post.id, {
      comment_count: (post.comment_count || 0) + 1
    }).catch(() => {});
  };

  const handleDelete = async () => {
    const msg = isAdmin && !isOwner
      ? `⚠️ Modération admin : supprimer ce post de "${post.author_name}" ?`
      : "Supprimer ce post définitivement ?";
    if (!window.confirm(msg)) return;
    await base44.entities.Post.delete(post.id);
    onDelete(post.id);
  };

  const media = post.media_urls || [];

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div
          className={!isOwner && post.created_by ? "cursor-pointer" : ""}
          onClick={!isOwner && post.created_by ? () => navigate(`${createPageUrl("PublicProfile")}?email=${post.created_by}`) : undefined}
        >
          {displayPhoto ? (
            <img src={displayPhoto} className="w-10 h-10 rounded-full object-cover border-2 border-stone-100" alt="" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-lg flex-shrink-0">🐾</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-1">
            <span
              className={`font-bold text-stone-800 text-sm ${!isOwner && post.created_by ? "cursor-pointer hover:text-teal-600 transition-colors" : ""}`}
              onClick={!isOwner && post.created_by ? () => navigate(`${createPageUrl("PublicProfile")}?email=${post.created_by}`) : undefined}
            >{resolvedAuthor || post.author_name || "Anonyme"}</span>
            <SupportBadge userEmail={post.created_by} badgeText="🐾 Soutien" />
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <span>{timeAgo(post.created_date)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cat.color}`}>{cat.emoji} {cat.label}</span>
          {canDelete && (
            <button onClick={handleDelete} className={`p-1.5 rounded-full transition-colors ${isAdmin && !isOwner ? "bg-red-50 text-red-400 hover:bg-red-100" : "hover:bg-red-50 text-stone-300 hover:text-red-400"}`}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Contenu */}
      <div className="px-4 pb-3">
        <p className="text-stone-700 text-sm leading-relaxed">{post.content}</p>
        {post.dog_names?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {post.dog_names.map(name => (
              <span key={name} className="text-xs bg-teal-50 text-teal-700 border border-teal-100 rounded-full px-2 py-0.5 font-medium">🐶 {name}</span>
            ))}
          </div>
        )}
      </div>

      {/* Médias */}
      {media.length > 0 && (
        <div className="relative cursor-pointer" onClick={() => setLightboxOpen(true)}>
          <img
            src={media[mediaIndex]}
            className="w-full object-cover"
            style={{ aspectRatio: "4/3", objectFit: "cover" }}
            alt=""
          />
          {media.length > 1 && (
            <div
              className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full"
              onClick={(e) => { e.stopPropagation(); setMediaIndex((mediaIndex + 1) % media.length); }}
            >
              {mediaIndex + 1}/{media.length} · Suivante
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
            <span className="opacity-0 hover:opacity-100 text-white text-xs bg-black/50 px-2 py-1 rounded-full transition-opacity">🔍 Agrandir</span>
          </div>
        </div>
      )}

      {lightboxOpen && (
        <PhotoLightbox
          urls={media}
          index={mediaIndex}
          onClose={() => setLightboxOpen(false)}
          onNav={(dir) => setMediaIndex((mediaIndex + dir + media.length) % media.length)}
        />
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 py-3 border-t border-stone-50">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${isLiked ? "text-rose-500" : "text-stone-400 hover:text-rose-400"}`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? "fill-rose-500" : ""}`} />
          {likes.length > 0 && <span>{likes.length}</span>}
        </button>
        <button
          onClick={loadComments}
          className="flex items-center gap-1.5 text-sm font-medium text-stone-400 hover:text-teal-500 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          {loadingComments ? "..." : (showComments ? "Masquer" : `Commenter${post.comment_count > 0 ? ` (${post.comment_count})` : ""}`)}
        </button>
      </div>

      {/* Commentaires */}
      {showComments && (
        <div className="px-4 pb-4 border-t border-stone-50 pt-3 space-y-3">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-xs flex-shrink-0">🐾</div>
              <div className="bg-stone-50 rounded-xl px-3 py-2 flex-1">
                <div className="font-semibold text-xs text-stone-700">
                  {(c.created_by && getCached(c.created_by)) || c.author_name || "Anonyme"}
                </div>
                <div className="text-sm text-stone-600 mt-0.5">{c.content}</div>
              </div>
            </div>
          ))}
          {currentUser && (
            <div className="flex gap-2 mt-2">
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitComment()}
                placeholder="Ajouter un commentaire..."
                className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-300"
              />
              <button
                onClick={submitComment}
                disabled={!commentText.trim()}
                className="p-2 bg-teal-500 text-white rounded-xl disabled:opacity-40 hover:bg-teal-600 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}