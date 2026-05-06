import { useState } from "react";
import { APP_NAME, APP_EMOJI, APP_URL } from "@/lib/brand";
import { base44 } from "@/api/base44Client";
import { X, Loader2, Share2 } from "lucide-react";

export default function ShareActivityModal({ entry, user, userProfile, onClose }) {
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);

  const dogName = entry.dog_name || "Mon chien";
  const text = `${dogName} · ${entry.title}${entry.duration_minutes ? ` · ${entry.duration_minutes} min` : ""}`;

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({ title: `${APP_EMOJI} ${APP_NAME} — ${dogName}`, text, url: window.location.origin });
    } else {
      navigator.clipboard.writeText(`🐾 ${text} — ${APP_URL}`);
      alert("Lien copié !");
    }
  };

  const shareClan = async () => {
    setSharing(true);
    await base44.entities.Post.create({
      author_name: userProfile?.pseudo || user?.full_name || "Anonyme",
      author_photo: userProfile?.photo_url || "",
      content: `🐾 ${text}${entry.notes ? "\n\n" + entry.notes : ""}`,
      dog_names: [dogName],
      category: "exploit",
      media_urls: entry.media_url ? [entry.media_url] : [],
      city: userProfile?.city || "",
    });
    setSharing(false);
    setShared(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-stone-800">🚀 Partager cette activité</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-stone-400" /></button>
        </div>

        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-teal-800">{dogName}</p>
          <p className="text-xs text-teal-600 mt-1">{entry.title}</p>
        </div>

        {shared ? (
          <div className="bg-green-50 border border-green-200 rounded-xl py-4 text-center">
            <p className="text-green-700 font-bold text-sm">✅ Partagé sur Mon Clan !</p>
          </div>
        ) : (
          <div className="space-y-2">
            <button onClick={shareClan} disabled={sharing}
              className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold py-3 rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : "🐾"}
              Partager sur Mon Clan
            </button>
            <button onClick={shareNative}
              className="w-full bg-stone-100 text-stone-700 font-semibold py-3 rounded-2xl text-sm flex items-center justify-center gap-2">
              <Share2 className="w-4 h-4" /> Partager sur les réseaux
            </button>
          </div>
        )}
      </div>
    </div>
  );
}