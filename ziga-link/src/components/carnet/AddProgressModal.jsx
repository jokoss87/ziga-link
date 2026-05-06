import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { invalidateUserLevelCache } from "@/components/lib/userLevelCache";
import { Upload } from "lucide-react";
import { compressImage } from "@/utils/imageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BottomFixedModal from "@/components/ui/BottomFixedModal";

const SESSION_TYPES = [
  { value: "obeissance", label: "🎓 Obéissance" },
  { value: "sport", label: "🏃 Sport" },
  { value: "socialisation", label: "🐕 Socialisation" },
  { value: "balade", label: "🦮 Balade" },
  { value: "jeu", label: "🎾 Jeu" },
  { value: "soin", label: "💊 Soin" },
  { value: "autre", label: "📝 Autre" },
];

const MOODS = [
  { value: "excellent", label: "Excellent 🌟" },
  { value: "bien", label: "Bien 😊" },
  { value: "moyen", label: "Moyen 😐" },
  { value: "difficile", label: "Difficile 😓" },
];

const EXERCISES_SUGGESTIONS = ["Assis", "Couché", "Rappel", "Au pied", "Reste", "Contact", "Envoi en place", "Rapport"];

const fieldClass = (error, base = "") => `${base} ${error ? "border-red-400 bg-red-50 ring-1 ring-red-300" : ""}`;

export default function AddProgressModal({ dogs, onClose }) {
  const { user } = useUserProfile();
  const [form, setForm] = useState({
    dog_id: "", dog_name: "", title: "", session_type: "",
    notes: "", duration_minutes: "", mood: "", exercises: [], media_url: "", objective: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});

  const refs = {
    title: useRef(null),
    session_type: useRef(null),
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Le titre est obligatoire";
    if (!form.session_type) e.session_type = "Le type de séance est obligatoire";
    return e;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstKey = Object.keys(validationErrors)[0];
      refs[firstKey]?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSaving(true);
    await base44.entities.ProgressEntry.create({
      ...form,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined,
    });
    invalidateUserLevelCache(user?.email);
    setSaving(false);
    onClose();
  };

  const handleMediaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const compressed = await compressImage(file);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
    setForm(f => ({ ...f, media_url: file_url }));
    setUploading(false);
  };

  const handleDogChange = (dogId) => {
    const dog = dogs.find(d => d.id === dogId);
    setForm(f => ({ ...f, dog_id: dogId, dog_name: dog?.name || "" }));
  };

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(er => ({ ...er, [field]: null }));
  };

  const addExercise = (ex) => {
    if (!form.exercises.includes(ex)) setForm(f => ({ ...f, exercises: [...f.exercises, ex] }));
  };
  const removeExercise = (ex) => {
    setForm(f => ({ ...f, exercises: f.exercises.filter(e => e !== ex) }));
  };

  return (
    <BottomFixedModal
      title="Nouvelle séance"
      onClose={onClose}
      maxWidth="max-w-lg"
      footer={
        <Button type="button" onClick={handleSubmit} disabled={saving}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl">
          {saving ? "Enregistrement..." : "Enregistrer la séance"}
        </Button>
      }
    >
      <div className="px-5 py-4 pb-8 space-y-4">
        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-medium">
            ⚠️ Veuillez remplir tous les champs obligatoires marqués en rouge.
          </div>
        )}

        {dogs.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">Chien</label>
            <Select value={form.dog_id || "_"} onValueChange={v => v !== "_" && handleDogChange(v)}>
              <SelectTrigger className="border-stone-200"><SelectValue placeholder="Choisir un chien..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Choisir un chien...</SelectItem>
                {dogs.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div ref={refs.title}>
          <label className="block text-sm font-semibold text-stone-700 mb-1">Titre de la séance *</label>
          <Input value={form.title} onChange={e => set("title", e.target.value)}
            className={fieldClass(errors.title, "border-stone-200")} placeholder="Ex: Travail du rappel en distraction" />
          {errors.title && <p className="text-xs text-red-500 mt-1">⚠️ {errors.title}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div ref={refs.session_type}>
            <label className="block text-sm font-semibold text-stone-700 mb-1">Type *</label>
            <Select value={form.session_type || "_"} onValueChange={v => set("session_type", v === "_" ? "" : v)}>
              <SelectTrigger className={fieldClass(errors.session_type, "border-stone-200")}>
                <SelectValue placeholder="Type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Choisir...</SelectItem>
                {SESSION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.session_type && <p className="text-xs text-red-500 mt-1">⚠️ {errors.session_type}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">Humeur</label>
            <Select value={form.mood || "_"} onValueChange={v => setForm(f => ({ ...f, mood: v === "_" ? "" : v }))}>
              <SelectTrigger className="border-stone-200"><SelectValue placeholder="Humeur..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Choisir...</SelectItem>
                {MOODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">Durée (minutes)</label>
          <Input type="number" min="1" value={form.duration_minutes}
            onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
            className="border-stone-200" placeholder="Ex: 20" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">Exercices travaillés</label>
          <div className="flex flex-wrap gap-1.5">
            {EXERCISES_SUGGESTIONS.map(ex => (
              <button key={ex} type="button"
                onClick={() => form.exercises.includes(ex) ? removeExercise(ex) : addExercise(ex)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  form.exercises.includes(ex) ? "bg-emerald-500 text-white border-emerald-500" : "bg-stone-50 text-stone-600 border-stone-200"
                }`}>
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">Notes</label>
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={3} className="border-stone-200" placeholder="Comment s'est passée la séance ?" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">Photo / Vidéo</label>
          <label className="cursor-pointer flex items-center gap-2 text-sm text-stone-500 bg-stone-50 border border-stone-200 px-3 py-2.5 rounded-xl hover:bg-stone-100 transition-colors">
            <input type="file" accept="image/*,video/*" onChange={handleMediaUpload} className="hidden" />
            <Upload className="w-4 h-4" />
            {uploading ? "Envoi en cours..." : form.media_url ? "✅ Fichier ajouté" : "Ajouter une photo ou vidéo"}
          </label>
        </div>
      </div>
    </BottomFixedModal>
  );
}