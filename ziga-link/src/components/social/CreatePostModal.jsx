import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Image, Loader2 } from "lucide-react";
import { compressImage } from "@/utils/imageUtils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import BottomFixedModal from "@/components/ui/BottomFixedModal";

const CATEGORIES = [
  { value: "moment", label: "Bon moment", emoji: "😊" },
  { value: "exploit", label: "Exploit", emoji: "🏆" },
  { value: "conseils", label: "Conseil", emoji: "💡" },
  { value: "question", label: "Question", emoji: "❓" },
  { value: "evenement", label: "Événement", emoji: "📅" },
];

export default function CreatePostModal({ user, profile, dogs, onClose, onCreated }) {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("moment");
  const [mediaUrls, setMediaUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleMedia = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const urls = await Promise.all(files.map(async f => {
      const compressed = await compressImage(f);
      return base44.integrations.Core.UploadFile({ file: compressed }).then(r => r.file_url);
    }));
    setMediaUrls(prev => [...prev, ...urls]);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSaving(true);
    let authorPhoto = profile?.photo_url || "";
    if (!authorPhoto && user?.email) {
      const fetchedDogs = await base44.entities.DogProfile.filter(
        { created_by: user.email }, "-created_date", 1
      ).catch(() => []);
      authorPhoto = fetchedDogs[0]?.photo_url || "";
    }
    const newPost = await base44.entities.Post.create({
      content: content.trim(),
      category,
      media_urls: mediaUrls,
      author_name: profile?.pseudo || user?.full_name || "Anonyme",
      author_photo: authorPhoto,
      dog_names: (dogs || []).map(d => d.name),
      city: profile?.city || "",
    });
    setSaving(false);
    onCreated(newPost);
    onClose();
  };

  return (
    <BottomFixedModal
      title="Nouveau post"
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-100 text-stone-600 text-sm font-medium cursor-pointer hover:bg-stone-200 transition-all flex-shrink-0">
            <input type="file" accept="image/*,video/*" multiple onChange={handleMedia} className="hidden" />
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
            Photo
          </label>
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || saving || uploading}
            className="flex-1 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold"
          >
            {saving ? "Publication..." : "Publier 🚀"}
          </Button>
        </div>
      }
    >
      <div className="p-5 pb-8 space-y-4">
        {/* Author */}
        <div className="flex items-center gap-3">
          {profile?.photo_url
            ? <img src={profile.photo_url} className="w-10 h-10 rounded-full object-cover" alt="" />
            : <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-lg">🐾</div>
          }
          <div>
            <div className="font-bold text-stone-800 text-sm">{profile?.pseudo || user?.full_name}</div>
            {profile?.city && <div className="text-xs text-stone-400">📍 {profile.city}</div>}
          </div>
        </div>

        {/* Catégorie */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setCategory(c.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                category === c.value ? "bg-teal-500 text-white border-teal-500" : "bg-stone-50 text-stone-600 border-stone-200"
              }`}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {/* Texte */}
        <Textarea value={content} onChange={e => setContent(e.target.value)}
          placeholder="Partagez un moment avec votre chien... 🐶" rows={4} className="border-stone-200 resize-none" />

        {/* Médias */}
        {mediaUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {mediaUrls.map((url, i) => (
              <div key={i} className="relative aspect-square">
                <img src={url} className="w-full h-full object-cover rounded-xl" alt="" />
                <button onClick={() => setMediaUrls(p => p.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </BottomFixedModal>
  );
}