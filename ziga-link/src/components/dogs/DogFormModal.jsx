import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useKeyboardHeight } from "@/components/hooks/useKeyboardHeight.jsx";
import { X, Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { compressImage } from "@/utils/imageUtils";
import DrawerSelect from "@/components/ui/DrawerSelect";

const fieldClass = (error, base = "") => `${base} ${error ? "border-red-400 bg-red-50 ring-1 ring-red-300" : ""}`;

export default function DogFormModal({ dog, onClose }) {
  const keyboardHeight = useKeyboardHeight();
  const [form, setForm] = useState({
    name: dog?.name || "",
    breed: dog?.breed || "",
    age_years: dog?.age_years || "",
    gender: dog?.gender || "",
    size: dog?.size || "",
    bio: dog?.bio || "",
    vaccinated: dog?.vaccinated || false,
    isNeutered: dog?.isNeutered || false,
    is_in_heat: dog?.is_in_heat || false,
    heat_end_date: dog?.heat_end_date || "",
    good_with_dogs: dog?.good_with_dogs || "",
    good_with_children: dog?.good_with_children || "",
    energyLevel: dog?.energyLevel || "",
    photo_url: dog?.photo_url || "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});

  const errorBannerRef = useRef(null);
  const scrollRef = useRef(null);
  const nameRef = useRef(null);
  const breedRef = useRef(null);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Le nom est obligatoire";
    if (!form.breed.trim()) e.breed = "La race est obligatoire";
    if (!form.gender) e.gender = "Le sexe est obligatoire";
    if (!form.size) e.size = "La taille est obligatoire";
    return e;
  };


  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
      setForm((f) => ({ ...f, photo_url: file_url }));
    } catch (err) {
      console.error("Erreur upload photo chien:", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    // Bloquer si un upload est encore en cours
    if (uploading) return;
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setTimeout(() => errorBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      return;
    }
    setSaving(true);
    const data = {
      ...form,
      age_years: form.age_years ? Number(form.age_years) : undefined,
      energyLevel: form.energyLevel ? Number(form.energyLevel) : undefined,
    };
    let result = null;
    let saveError = null;
    try {
      if (dog?.id) {
        result = await base44.entities.DogProfile.update(dog.id, data);
      } else {
        result = await base44.entities.DogProfile.create(data);
      }
    } catch (err) {
      saveError = err;
      console.error("Erreur sauvegarde chien:", err);
    }
    setSaving(false);
    // Si on a un résultat (id créé) OU si l'erreur n'est pas bloquante, on ferme
    const hasId = result?.id || (dog?.id);
    if (hasId || !saveError) {
      onClose();
    } else {
      setErrors({ general: "Erreur lors de la sauvegarde. Réessayez." });
      setTimeout(() => errorBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  };

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((er) => ({ ...er, [field]: null }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        ref={scrollRef}
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg overflow-y-auto"
        style={{ maxHeight: `calc(var(--app-height, 90vh) - ${keyboardHeight || 0}px)`, height: "90%" }}
      >
        <div className="sticky top-0 bg-white border-b border-amber-100 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-amber-900 text-lg">
            {dog ? "Modifier le profil" : "Ajouter un chien"}
          </h2>
          <button onClick={onClose} className="text-amber-400 hover:text-amber-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {(errors.general || Object.keys(errors).filter(k => k !== "general" && errors[k]).length > 0) && (
            <div ref={errorBannerRef} className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-sm text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errors.general || "Veuillez remplir les champs obligatoires indiqués en rouge."}</span>
            </div>
          )}

          {/* Photo */}
          <div className={`rounded-2xl p-4 border-2 ${form.photo_url ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">{form.photo_url ? "✅" : "📸"}</span>
              <div>
                <p className="font-bold text-amber-900 text-sm">
                  {form.photo_url ? "Super, votre chien est déjà une star !" : "Une photo de votre compagnon, s'il vous plaît ! 🐾"}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {form.photo_url ? "Vous pouvez changer la photo à tout moment." : "La communauté adore voir les têtes des nouveaux membres 🐶"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {form.photo_url
                ? <img src={form.photo_url} alt="dog" className="w-20 h-20 rounded-full object-cover border-2 border-amber-200 flex-shrink-0" />
                : <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center text-4xl border-2 border-dashed border-amber-300 flex-shrink-0">🐶</div>
              }
              <label className="cursor-pointer">
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                <span className={`inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl font-semibold ${
                  form.photo_url ? "text-green-700 bg-green-100 border border-green-200 hover:bg-green-200" : "text-white bg-amber-400 hover:bg-amber-500"
                }`}>
                  <Upload className="w-4 h-4" />
                  {uploading ? "Envoi en cours..." : form.photo_url ? "Changer la photo" : "Ajouter une photo"}
                </span>
              </label>
            </div>
          </div>

          {/* Nom */}
          <div ref={nameRef}>
            <label className="block text-sm font-semibold text-amber-900 mb-1">Nom *</label>
            <Input value={form.name} onChange={e => set("name", e.target.value)}
              className={fieldClass(errors.name, "border-amber-200")} placeholder="Nom de votre chien" />
            {errors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div ref={breedRef}>
              <label className="block text-sm font-semibold text-amber-900 mb-1">Race *</label>
              <Input value={form.breed} onChange={e => set("breed", e.target.value)}
                className={fieldClass(errors.breed, "border-amber-200")} placeholder="Ex: Labrador" />
              {errors.breed && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.breed}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-amber-900 mb-1">Âge (ans)</label>
              <Input type="number" min="0" max="30" value={form.age_years} onChange={e => set("age_years", e.target.value)} className="border-amber-200" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-amber-900 mb-1">Sexe *</label>
              <DrawerSelect
                value={form.gender}
                onChange={v => set("gender", v)}
                placeholder="Sexe"
                hasError={!!errors.gender}
                options={[
                  { value: "male", label: "Mâle" },
                  { value: "female", label: "Femelle" },
                ]}
              />
              {errors.gender && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.gender}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-amber-900 mb-1">Taille *</label>
              <DrawerSelect
                value={form.size}
                onChange={v => set("size", v)}
                placeholder="Taille"
                hasError={!!errors.size}
                options={[
                  { value: "small", label: "Petit" },
                  { value: "medium", label: "Moyen" },
                  { value: "large", label: "Grand" },
                ]}
              />
              {errors.size && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.size}</p>}
            </div>
          </div>

          {/* Sociabilité */}
          <div className="bg-amber-50 rounded-xl p-4 space-y-3 border border-amber-100">
            <h3 className="text-sm font-bold text-amber-800">Questionnaire de sociabilité</h3>
            <div>
              <label className="block text-sm text-amber-700 mb-1">Niveau d'énergie</label>
              <DrawerSelect
                value={form.energyLevel ? String(form.energyLevel) : ""}
                onChange={v => set("energyLevel", v)}
                placeholder="Choisir..."
                options={[
                  { value: "1", label: "Très calme 😴" },
                  { value: "2", label: "Calme 🐾" },
                  { value: "3", label: "Modéré 🚶" },
                  { value: "4", label: "Actif 🏃" },
                  { value: "5", label: "Très énergique ⚡" },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm text-amber-700 mb-1">S'entend avec les autres chiens</label>
              <DrawerSelect
                value={form.good_with_dogs}
                onChange={v => set("good_with_dogs", v)}
                placeholder="Choisir..."
                options={[
                  { value: "yes", label: "Oui 🐕" },
                  { value: "sometimes", label: "Parfois 🤷" },
                  { value: "no", label: "Non ⚠️" },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm text-amber-700 mb-1">S'entend avec les enfants</label>
              <DrawerSelect
                value={form.good_with_children}
                onChange={v => set("good_with_children", v)}
                placeholder="Choisir..."
                options={[
                  { value: "yes", label: "Oui 👦" },
                  { value: "sometimes", label: "Parfois 🤷" },
                  { value: "no", label: "Non ⚠️" },
                ]}
              />
            </div>
          </div>

          {/* Switches */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-amber-900">Vacciné(e)</label>
              <Switch type="button" checked={form.vaccinated} onCheckedChange={v => set("vaccinated", v)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-amber-900">Stérilisé(e)</label>
              <Switch type="button" checked={form.isNeutered} onCheckedChange={v => set("isNeutered", v)} />
            </div>
            {form.gender === "female" && (
              <div className="flex items-center justify-between bg-red-50 rounded-xl p-3 border border-red-100">
                <div>
                  <label className="text-sm font-semibold text-red-700">En chaleur</label>
                  <p className="text-xs text-red-500">Signaler si votre chienne est en période de chaleur</p>
                </div>
                <Switch type="button" checked={form.is_in_heat} onCheckedChange={v => set("is_in_heat", v)} />
              </div>
            )}
            {form.is_in_heat && form.gender === "female" && (
              <div>
                <label className="block text-sm text-amber-700 mb-1">Fin des chaleurs estimée</label>
                <Input type="date" value={form.heat_end_date} onChange={e => set("heat_end_date", e.target.value)} className="border-amber-200" />
              </div>
            )}
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold text-amber-900 mb-1">Description</label>
            <Textarea value={form.bio} onChange={e => set("bio", e.target.value)} className="border-amber-200" rows={2} placeholder="Décrivez votre chien..." />
          </div>

          {/* Bouton sticky */}
          <div className="sticky bottom-0 bg-white pt-2 pb-2">
            <Button type="button" onClick={handleSubmit} disabled={saving || uploading}
              className="w-full bg-amber-400 hover:bg-amber-500 text-white font-semibold rounded-2xl shadow-lg">
              {saving ? "Enregistrement..." : dog ? "Sauvegarder" : "Ajouter le chien"}
            </Button>
            {uploading && <p className="text-center text-xs text-red-500 mt-1 font-semibold">⏳ Attendre la fin de l'upload avant de sauvegarder…</p>}
          </div>

          <div className="h-32" />
        </div>
      </div>
    </div>
  );
}