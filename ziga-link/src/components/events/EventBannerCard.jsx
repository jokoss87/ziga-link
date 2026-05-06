import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { createPageUrl } from "@/utils";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

const BRAND_GRADIENT = "linear-gradient(135deg, #4CAF87, #3d9e78)";

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

export default function EventBannerCard({ pageName, bannerDataOverride }) {
  const { user, profile } = useUserProfile();
  const [banner, setBanner] = useState(null);
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(!bannerDataOverride);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (bannerDataOverride) {
      setBanner(bannerDataOverride);
      setLoading(false);
      return;
    }
    loadBanner();
  }, [pageName, bannerDataOverride]);

  const loadBanner = async () => {
    try {
      const banners = await base44.entities.EventBanner.list();
      const b = banners[0];
      if (b && b.is_visible && b.title && b.pages?.includes(pageName)) {
        setBanner(b);
        const cms = await base44.entities.EventBannerComment.filter({ banner_id: b.id }, "created_date", 50);
        setComments(cms);
      }
    } catch (e) {
      console.error("EventBannerCard load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = () => {
    if (!banner?.button_url) return;
    if (banner.button_url.startsWith("http")) {
      window.open(banner.button_url, "_blank");
    } else {
      window.location.href = createPageUrl(banner.button_url);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !banner || !user || !profile) return;
    setSending(true);
    try {
      const created = await base44.entities.EventBannerComment.create({
        banner_id: banner.id,
        user_email: user.email,
        pseudo: profile.pseudo || user.email,
        photo_url: profile.photo_url || "",
        content: newComment.trim(),
      });
      setComments(prev => [...prev, created]);
      setNewComment("");
      toast.success("Commentaire publié !");
    } catch (e) {
      console.error("Comment error:", e);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  if (loading) return null;
  if (!banner) return null;

  if (!bannerDataOverride) {
    if (!banner.is_visible || !banner.title || !banner.pages?.includes(pageName)) return null;
  }

  const bgStyle = banner.image_url
    ? { backgroundImage: `url(${banner.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : banner.background_color
      ? { background: banner.background_color }
      : { background: BRAND_GRADIENT };

  const showButton = banner.button_label && banner.button_url;

  return (
    <div className="mx-4 mb-4 rounded-3xl overflow-hidden shadow-md border border-stone-100">

      {/* Zone image/fond */}
      <div className="relative min-h-[200px] flex flex-col justify-between p-5" style={bgStyle}>

        {/* Dégradé automatique depuis le bas — texte toujours lisible quelle que soit l'image */}
        {banner.image_url && (
          <>
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute inset-0" style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.1) 100%)"
            }} />
          </>
        )}

        {/* HAUT : badge seul */}
        <div className="relative z-10">
          {banner.badge && (
            <span className="inline-flex items-center bg-white text-stone-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
              {banner.badge}
            </span>
          )}
        </div>

        {/* BAS : titre + sous-titre + description + actions */}
        <div className="relative z-10 mt-4">
          <h3 className="text-2xl font-black text-white leading-tight drop-shadow-sm">
            {banner.title}
          </h3>
          {banner.subtitle && (
            <p className="text-sm text-white/90 mt-1 font-medium drop-shadow-sm">
              {banner.subtitle}
            </p>
          )}
          {banner.description && (
            <p className="text-xs text-white/85 mt-2 leading-relaxed drop-shadow-sm">
              {banner.description}
            </p>
          )}

          {/* Bouton + commentaires */}
          <div className="flex items-center justify-between mt-4 gap-3">
            {showButton ? (
              <button
                onClick={handleButtonClick}
                className="bg-white text-stone-800 text-sm font-bold px-5 py-2.5 rounded-2xl shadow-md hover:bg-stone-100 active:scale-95 transition-all flex-shrink-0"
              >
                {banner.button_label}
              </button>
            ) : <div />}

            <button
              onClick={() => setShowComments(v => !v)}
              className="flex items-center gap-1.5 text-white/80 text-xs hover:text-white transition-colors ml-auto flex-shrink-0"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{comments.length} commentaire{comments.length !== 1 ? "s" : ""}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section commentaires dépliable */}
      {showComments && (
        <div className="bg-white p-4 border-t border-stone-100">
          {comments.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-2">
              Aucun commentaire pour l'instant.
            </p>
          ) : (
            <div className="space-y-3 max-h-56 overflow-y-auto mb-3">
              {comments.map(c => (
                <div key={c.id} className="flex gap-2.5 items-start">
                  {c.photo_url ? (
                    <img
                      src={c.photo_url}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-stone-100"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-xs font-black text-teal-600 flex-shrink-0">
                      {c.pseudo?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-stone-800">{c.pseudo}</span>
                      <span className="text-[10px] text-stone-400">{formatDate(c.created_date)}</span>
                    </div>
                    <p className="text-sm text-stone-600 mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {user && profile ? (
            <div className="flex gap-2 pt-3 border-t border-stone-100">
              <input
                ref={inputRef}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !sending) handleSendComment(); }}
                placeholder="Ajouter un commentaire..."
                className="flex-1 bg-stone-50 border border-stone-200 rounded-2xl px-3 py-2 text-sm outline-none focus:border-teal-400 transition-colors"
              />
              <button
                onClick={handleSendComment}
                disabled={sending || !newComment.trim()}
                className="w-9 h-9 rounded-2xl flex items-center justify-center text-white transition-colors disabled:opacity-40 flex-shrink-0"
                style={{ background: BRAND_GRADIENT }}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <p className="text-xs text-stone-400 text-center pt-3 border-t border-stone-100">
              Connectez-vous pour commenter.
            </p>
          )}
        </div>
      )}
    </div>
  );
}