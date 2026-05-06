import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Heart, MessageCircle, Send, Bookmark, Share2, Trash2 } from "lucide-react";
import { usePseudoCache } from "@/components/lib/PseudoCacheContext";
import PhotoLightbox from "./PhotoLightbox";
import { STATUS_CONFIG } from "@/components/profile/UserStatusBadge";

const CATEGORY_META = {
  moment: { label: "Bon moment", emoji: "😊", bg: "bg-amber-100 text-amber-700" },
  exploit: { label: "Exploit", emoji: "🏆", bg: "bg-yellow-100 text-yellow-700" },
  conseils: { label: "Conseil", emoji: "💡", bg: "bg-blue-100 text-blue-700" },
  question: { label: "Question", emoji: "❓", bg: "bg-purple-100 text-purple-700" },
  evenement: { label: "Événement", emoji: "📅", bg: "bg-green-100 text-green-700" },
};

const AUTHOR_GRADIENTS = [
  "from-violet-400 to-purple-500",
  "from-orange-400 to-rose-400",
  "from-teal-400 to-emerald-500",
  "from-blue-400 to-cyan-500",
  "from-pink-400 to-rose-500",
  "from-amber-400 to-orange-500",
];

function getGradient(str) {
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++) hash += str.charCodeAt(i);
  return AUTHOR_GRADIENTS[hash % AUTHOR_GRADIENTS.length];
}

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
};

export default function NewPostCard({ post, currentUser, onDelete }) {
  const [likes, setLikes] = useState(post.likes || []);
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const { resolvePseudos, getCached } = usePseudoCache();
  const navigate = useNavigate();

  const [resolvedPseudo, setResolvedPseudo] = useState(null);
  const [authorStatus, setAuthorStatus] = useState(null);

  useEffect(() => {
    if (post.created_by) {
      resolvePseudos([post.created_by]).then((map) => {
        setResolvedPseudo(map[post.created_by] || null);
      });
      base44.entities.UserProfile.filter({ created_by: post.created_by }, "-created_date", 1)
        .then(r => setAuthorStatus(r[0]?.user_status || null))
        .catch(() => {});
    }
  }, [post.created_by]);

  const authorDisplay = resolvedPseudo || post.author_name || "Anonyme";

  const isLiked = currentUser && likes.includes(currentUser.email);
  const isOwner = currentUser?.email === post.created_by;
  const isAdmin = currentUser?.role === "admin";
  const canDelete = isOwner || isAdmin;
  const cat = CATEGORY_META[post.category] || CATEGORY_META.moment;
  const media = post.media_urls || [];
  const gradient = getGradient(authorDisplay);
  const initial = (authorDisplay || "?")[0]?.toUpperCase();

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
    if (emails.length > 0) await resolvePseudos(emails);
  };

  const submitComment = async () => {
    if (!commentText.trim() || !currentUser) return;
    const c = await base44.entities.PostComment.create({
      post_id: post.id,
      content: commentText.trim(),
      author_name: (currentUser.email && getCached(currentUser.email)) || currentUser.full_name || "Anonyme",
      author_photo: "",
    });
    setComments(prev => [...prev, c]);
    setCommentText("");
  };

  const handleMessageAuthor = async () => {
    if (!currentUser || !post.created_by || post.created_by === currentUser.email) return;
    // Chercher une conv privée existante
    const all = await base44.entities.Conversation.list("-last_message_at", 200);
    const existing = all.find(c =>
      c.type === "private" &&
      c.members?.includes(currentUser.email) &&
      c.members?.includes(post.created_by)
    );
    if (existing) {
      navigate(`${createPageUrl("GroupChat")}?id=${existing.id}`);
      return;
    }
    // Récupérer le pseudo de l'auteur
    const authorPseudo = getCached(post.created_by) || post.author_name || "Anonyme";
    const myProfiles = await base44.entities.UserProfile.filter({ created_by: currentUser.email });
    const myProfile = myProfiles[0];
    const myPseudo = myProfile?.pseudo || currentUser.full_name || "Moi";
    const myPhoto = myProfile?.photo_url || "";
    // Récupérer la photo de l'auteur
    const authorProfiles = await base44.entities.UserProfile.filter({ created_by: post.created_by });
    const authorPhoto = authorProfiles[0]?.photo_url || post.author_photo || "";
    const conv = await base44.entities.Conversation.create({
      type: "private",
      members: [currentUser.email, post.created_by],
      member_pseudos: [myPseudo, authorPseudo],
      member_photos: [myPhoto, authorPhoto],
      created_by_pseudo: myPseudo,
      last_message_at: new Date().toISOString(),
    });
    navigate(`${createPageUrl("GroupChat")}?id=${conv.id}`);
  };

  const handleDelete = async () => {
    const msg = isAdmin && !isOwner
      ? `⚠️ Modération admin : supprimer ce post de "${post.author_name}" ?`
      : "Supprimer ce post définitivement ?";
    if (!window.confirm(msg)) return;
    await base44.entities.Post.delete(post.id);
    if (isAdmin && !isOwner && post.created_by) {
      await Promise.all([
        base44.entities.Notification.create({
          user_email: post.created_by,
          type: "contenu_inapproprie",
          title: "⚠️ Contenu supprimé par la modération",
          body: `Votre publication "${post.content?.slice(0, 60)}..." a été supprimée car elle ne respecte pas les règles communautaires.`,
          link_page: "Regles",
          is_read: false,
        }),
        base44.entities.ModerationLog.create({
          moderator_email: currentUser.email,
          target_user_email: post.created_by,
          target_user_name: post.author_name || "Inconnu",
          action: "delete_post",
          post_content: post.content?.slice(0, 200),
          post_id: post.id,
        }),
      ]);
    }
    onDelete(post.id);
  };

  return (
    <article className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100/80">
      {/* Média plein format */}
      {media.length > 0 && (
        <div className="relative bg-black">
          <img
            src={media[mediaIndex]}
            className="w-full max-h-96 object-contain cursor-pointer"
            alt=""
            onClick={() => { setLightboxIndex(mediaIndex); setLightboxOpen(true); }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent pointer-events-none" />

          {/* Badge catégorie */}
          <div className="absolute top-3 left-3">
            <span className={`text-xs font-bold px-3 py-1 rounded-full shadow-md ${cat.bg}`}>{cat.emoji} {cat.label}</span>
          </div>

          {/* Compteur photos */}
          {media.length > 1 && (
            <div
              className="absolute top-3 right-12 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setMediaIndex((mediaIndex + 1) % media.length); }}
            >{mediaIndex + 1}/{media.length}</div>
          )}

          {/* Bookmark */}
          <button
            onClick={() => setSaved(!saved)}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-all ${saved ? "bg-teal-500 text-white" : "bg-white/80 text-stone-600"}`}
          >
            <Bookmark className="w-3.5 h-3.5" />
          </button>

          {/* Auteur + texte sur l'image */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {canDelete && (
              <button onClick={handleDelete} className={`absolute top-0 right-3 p-1.5 rounded-full text-white transition-colors ${isAdmin && !isOwner ? "bg-red-500/80 hover:bg-red-600" : "bg-black/30 hover:bg-red-500"}`}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="flex items-center gap-2 mb-2">
              {post.author_photo ? (
                <img src={post.author_photo} className="w-8 h-8 rounded-full object-cover border-2 border-white/50" alt="" />
              ) : (
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xs shadow-md`}>{initial}</div>
              )}
              <div>
                <button
                  onClick={handleMessageAuthor}
                  disabled={!currentUser || post.created_by === currentUser?.email}
                  className="text-white font-bold text-sm leading-none hover:underline disabled:cursor-default"
                >{authorDisplay}</button>
                <div className="text-white/70 text-xs mt-0.5">{timeAgo(post.created_date)}{post.city && ` · ${post.city}`}</div>
              </div>
            </div>
            <p className="text-white text-sm font-medium leading-snug line-clamp-2">{post.content}</p>
          </div>
        </div>
      )}

      {/* Contenu texte seul */}
      {media.length === 0 && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              {post.author_photo ? (
                <img src={post.author_photo} className="w-10 h-10 rounded-full object-cover border-2 border-stone-100" alt="" />
              ) : (
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold shadow-md`}>{initial}</div>
              )}
              <div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleMessageAuthor}
                  disabled={!currentUser || post.created_by === currentUser?.email}
                  className="font-bold text-stone-800 text-sm hover:text-teal-600 hover:underline disabled:cursor-default transition-colors"
                >{authorDisplay}</button>
                {authorStatus && STATUS_CONFIG[authorStatus] && (
                  <span title={STATUS_CONFIG[authorStatus].label} className="text-sm leading-none">{STATUS_CONFIG[authorStatus].emoji}</span>
                )}
              </div>
              <div className="text-stone-400 text-xs">{timeAgo(post.created_date)}{post.city && ` · 📍 ${post.city}`}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cat.bg}`}>{cat.emoji} {cat.label}</span>
              {canDelete && (
                <button onClick={handleDelete} className={`p-1.5 rounded-full transition-colors ${isAdmin && !isOwner ? "bg-red-50 text-red-400 hover:bg-red-100" : "hover:bg-red-50 text-stone-300 hover:text-red-400"}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <p className="text-stone-700 text-sm leading-relaxed">{post.content}</p>
        </div>
      )}

      {/* Tags chiens */}
      {post.dog_names?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-2 pb-1">
          {post.dog_names.map(name => (
            <span key={name} className="text-xs bg-teal-50 text-teal-700 rounded-full px-2.5 py-1 font-semibold">🐶 {name}</span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center px-3 py-2.5 gap-1">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-all ${isLiked ? "bg-rose-50 text-rose-500" : "text-stone-400 hover:bg-stone-50"}`}
        >
          <Heart className={`w-4 h-4 transition-transform ${isLiked ? "fill-rose-500 scale-110" : ""}`} />
          {likes.length > 0 && <span>{likes.length}</span>}
        </button>
        <button
          onClick={loadComments}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-all ${showComments ? "bg-teal-50 text-teal-600" : "text-stone-400 hover:bg-stone-50"}`}
        >
          <MessageCircle className="w-4 h-4" />
          {loadingComments ? <span className="text-xs">...</span> : null}
        </button>
        <button
          onClick={() => {
            try {
              if (navigator.share) {
                navigator.share({ text: post.content }).catch(() => navigator.clipboard?.writeText(post.content));
              } else {
                navigator.clipboard?.writeText(post.content);
              }
            } catch (e) {
              navigator.clipboard?.writeText(post.content);
            }
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold text-stone-400 hover:bg-stone-50 transition-all"
        >
          <Share2 className="w-4 h-4" />
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setSaved(!saved)}
          className={`p-2 rounded-full transition-all ${saved ? "text-teal-500" : "text-stone-300 hover:text-stone-500"}`}
        >
          <Bookmark className={`w-4 h-4 ${saved ? "fill-teal-500" : ""}`} />
        </button>
      </div>

      {/* Commentaires */}
      {showComments && (
        <div className="px-4 pb-4 border-t border-stone-50 pt-3 space-y-3">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {(c.author_name || "?")[0]?.toUpperCase()}
              </div>
              <div className="bg-stone-50 rounded-2xl px-3 py-2 flex-1">
                <div className="font-semibold text-xs text-stone-700">{(c.created_by && getCached(c.created_by)) || c.author_name || "Anonyme"}</div>
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
                placeholder="Votre commentaire..."
                className="flex-1 bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-2 text-sm outline-none focus:border-teal-300 focus:bg-white transition-colors"
              />
              <button
                onClick={submitComment}
                disabled={!commentText.trim()}
                className="w-9 h-9 bg-teal-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:bg-teal-600 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
      {lightboxOpen && (
        <PhotoLightbox
          urls={media}
          index={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onNav={(dir) => setLightboxIndex((lightboxIndex + dir + media.length) % media.length)}
        />
      )}
    </article>
  );
}