import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { invalidateActivityConfigCache } from "@/components/lib/useActivityConfig";
import { Pencil, Save, Plus, Trash2, Upload, Loader2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";

const DEFAULT_TYPES = [
  { type_key: "canicross", label: "Canicross", emoji: "🐕‍🦺", image_url: "https://media.base44.com/images/public/699797b556ee6b9c51a26f9f/078871679_canicross.png", sort_order: 1 },
  { type_key: "cani_vtt", label: "Cani VTT", emoji: "🚴", image_url: "", sort_order: 2 },
  { type_key: "agility", label: "Agility", emoji: "🏅", image_url: "", sort_order: 3 },
  { type_key: "frisbee", label: "Frisbee", emoji: "🥏", image_url: "", sort_order: 4 },
  { type_key: "randonnee", label: "Randonnée", emoji: "🥾", image_url: "", sort_order: 5 },
  { type_key: "pistage", label: "Pistage", emoji: "👃", image_url: "", sort_order: 6 },
  { type_key: "obeissance", label: "Obéissance", emoji: "🎓", image_url: "", sort_order: 7 },
  { type_key: "socialisation", label: "Socialisation", emoji: "🐕", image_url: "", sort_order: 8 },
  { type_key: "traction", label: "Traction", emoji: "💪", image_url: "", sort_order: 9 },
  { type_key: "parkour", label: "Parkour", emoji: "🏙️", image_url: "", sort_order: 10 },
  { type_key: "shaping", label: "Shaping", emoji: "🧠", image_url: "", sort_order: 11 },
  { type_key: "concours", label: "Concours", emoji: "🏆", image_url: "", sort_order: 12 },
  { type_key: "libre", label: "Libre", emoji: "🌿", image_url: "", sort_order: 13 },
  { type_key: "autre", label: "Autre", emoji: "✨", image_url: "", sort_order: 14 },
  { type_key: "mantrailing", label: "Mantrailing", emoji: "👃", image_url: "", sort_order: 15 },
  { type_key: "dog_dancing", label: "Dog Dancing", emoji: "💃", image_url: "", sort_order: 16 },
  { type_key: "autre_sport", label: "Autre sport", emoji: "✨", image_url: "", sort_order: 17 },
  { type_key: "marche_laisse", label: "Marche en laisse", emoji: "🦮", image_url: "", sort_order: 18 },
  { type_key: "gestion_emotions", label: "Gestion des émotions", emoji: "🧘", image_url: "", sort_order: 19 },
  { type_key: "renoncement", label: "Renoncement / Auto-contrôle", emoji: "🛑", image_url: "", sort_order: 20 },
  { type_key: "nosework", label: "Nose work / Recherche", emoji: "🔍", image_url: "", sort_order: 21 },
  { type_key: "concours_dressage", label: "Entraînement concours", emoji: "🏆", image_url: "", sort_order: 22 },
  { type_key: "autre_dressage", label: "Autre dressage", emoji: "✨", image_url: "", sort_order: 23 },
];

export default function AdminActivityConfig() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const configs = await base44.entities.ActivityConfig.list("sort_order", 50);
    if (configs.length === 0) {
      // Première fois : initialiser avec les valeurs par défaut
      setItems(DEFAULT_TYPES.map(d => ({ ...d, _isNew: true })));
      setInitialized(false);
    } else {
      setItems(configs);
      setInitialized(true);
    }
    setLoading(false);
  };

  const handleChange = (index, field, value) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleUploadImage = async (index, file) => {
    setUploading(index);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    handleChange(index, "image_url", file_url);
    setUploading(null);
  };

  const handleAddRow = () => {
    setItems(prev => [...prev, { type_key: "", label: "", emoji: "✨", image_url: "", sort_order: prev.length + 1, is_active: true, _isNew: true }]);
  };

  const handleRemove = (index) => {
    if (!window.confirm("Supprimer cette activité de la config ?")) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const item of items) {
        const { _isNew, id, created_date, updated_date, created_by, ...data } = item;
        if (_isNew || !id) {
          if (data.type_key && data.label) {
            await base44.entities.ActivityConfig.create({ ...data, is_active: data.is_active !== false });
          }
        } else {
          await base44.entities.ActivityConfig.update(id, { ...data, is_active: data.is_active !== false });
        }
      }
      // Supprimer les configs qui ne sont plus dans la liste (celles avec id mais absentes)
      const savedIds = new Set(items.filter(i => i.id).map(i => i.id));
      const existing = await base44.entities.ActivityConfig.list("sort_order", 50);
      for (const ex of existing) {
        if (!savedIds.has(ex.id)) {
          await base44.entities.ActivityConfig.delete(ex.id);
        }
      }

      invalidateActivityConfigCache();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      load();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-teal-500" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-stone-800 text-base">🏅 Gestion des activités</h3>
          <p className="text-xs text-stone-400 mt-0.5">Modifiez les images, noms et ordre. Les changements sont visibles immédiatement pour tous.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
          style={{ background: saved ? "#22c55e" : "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? "Sauvegarde..." : saved ? "Enregistré !" : "Enregistrer"}
        </button>
      </div>

      {!initialized && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
          ⚠️ Première initialisation — cliquez sur <strong>Enregistrer</strong> pour peupler la configuration par défaut.
        </div>
      )}

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              {/* Aperçu image */}
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center overflow-hidden flex-shrink-0 border border-stone-100">
                {item.image_url
                  ? <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                  : <span className="text-2xl">{item.emoji || "✨"}</span>
                }
              </div>

              <div className="flex-1 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-stone-400 uppercase">Clé technique</label>
                  <Input
                    value={item.type_key}
                    onChange={e => handleChange(index, "type_key", e.target.value)}
                    placeholder="canicross"
                    className="text-sm h-8 mt-0.5"
                    disabled={!item._isNew && item.id}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-stone-400 uppercase">Nom affiché</label>
                  <Input
                    value={item.label}
                    onChange={e => handleChange(index, "label", e.target.value)}
                    placeholder="Canicross"
                    className="text-sm h-8 mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-stone-400 uppercase">Emoji (si pas d'image)</label>
                  <Input
                    value={item.emoji}
                    onChange={e => handleChange(index, "emoji", e.target.value)}
                    placeholder="🐕"
                    className="text-sm h-8 mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-stone-400 uppercase">Ordre</label>
                  <Input
                    type="number"
                    value={item.sort_order}
                    onChange={e => handleChange(index, "sort_order", Number(e.target.value))}
                    className="text-sm h-8 mt-0.5"
                  />
                </div>
              </div>

              <button
                onClick={() => handleRemove(index)}
                className="p-1.5 rounded-lg text-stone-300 hover:text-red-400 hover:bg-red-50 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* URL image + upload */}
            <div className="mt-3 flex gap-2 items-center">
              <Input
                value={item.image_url || ""}
                onChange={e => handleChange(index, "image_url", e.target.value)}
                placeholder="URL de l'image (laisser vide pour utiliser l'emoji)"
                className="text-xs h-8 flex-1"
              />
              <label className="cursor-pointer flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 text-xs font-semibold hover:bg-purple-100 transition-colors whitespace-nowrap">
                {uploading === index ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Uploader
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleUploadImage(index, e.target.files[0])} />
              </label>
            </div>

            {/* Toggle actif */}
            <div className="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id={`active-${index}`}
                checked={item.is_active !== false}
                onChange={e => handleChange(index, "is_active", e.target.checked)}
                className="rounded"
              />
              <label htmlFor={`active-${index}`} className="text-xs text-stone-500">Activité visible dans l'application</label>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleAddRow}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-stone-200 text-stone-400 hover:border-teal-300 hover:text-teal-500 transition-colors text-sm font-semibold"
      >
        <Plus className="w-4 h-4" /> Ajouter une activité
      </button>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
        ⚠️ <strong>Important :</strong> Les noms et images sont dynamiques. La <em>clé technique</em> (ex: canicross) est liée au code et ne doit pas être modifiée sur des activités existantes en base de données.
      </div>
    </div>
  );
}