import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Heart, MessageCircle, ChevronRight } from "lucide-react";
import { timeAgo } from "@/components/lib/dateUtils";
import { useOwnerPhoto } from "@/components/useOwnerPhoto";

const CATEGORY_BADGE = {
  moment: { label: "Moment", color: "bg-pink-100 text-pink-600" },
  exploit: { label: "Exploit 🏅", color: "bg-amber-100 text-amber-600" },
  conseils: { label: "Conseils", color: "bg-teal-100 text-teal-600" },
  question: { label: "Question", color: "bg-violet-100 text-violet-600" },
  evenement: { label: "Événement", color: "bg-orange-100 text-orange-600" }
};

function PostItem({ post }) {
  const authorPhoto = useOwnerPhoto(post.created_by, post.author_photo);
  const badge = CATEGORY_BADGE[post.category] || CATEGORY_BADGE.moment;
  const ago = timeAgo(post.created_date);

  return (
    <Link
      to={createPageUrl("Social")}
      className="block bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden hover:shadow-md transition-all">

      {post.media_urls?.length > 0 && (
        <img src={post.media_urls[0]} alt="" className="w-full h-36 object-cover" />
      )}

      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          {authorPhoto ? (
            <img src={authorPhoto} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-500 flex-shrink-0">
              {(post.author_name || "?")[0].toUpperCase()}
            </div>
          )}
          <span className="text-xs font-semibold text-stone-700 truncate">{post.author_name || "Anonyme"}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto ${badge.color}`}>{badge.label}</span>
        </div>

        <p className="text-sm text-stone-700 line-clamp-2 leading-snug">{post.content}</p>

        <div className="flex items-center gap-3 mt-2 text-stone-400">
          <span className="flex items-center gap-1 text-xs">
            <Heart className="w-3.5 h-3.5" />
            {post.likes?.length || 0}
          </span>
          <span className="text-xs">{ago}</span>
        </div>
      </div>
    </Link>
  );
}

export default function LocalFeed({ posts, loading }) {
  if (loading || !posts || posts.length === 0) return null;

  return (
    <section className="px-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-stone-800">📣 Fil de la communauté</h2>
        <Link
          to={createPageUrl("Social")}
          className="flex items-center gap-1 text-xs font-semibold text-teal-600">
          Voir tout <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid gap-3">
        {posts.slice(0, 3).map(post => (
          <PostItem key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}