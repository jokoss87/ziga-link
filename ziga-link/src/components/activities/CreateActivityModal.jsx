import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import LocationPicker from "@/components/location/LocationPicker";
import DogMultiSelector from "@/components/dogs/DogMultiSelector";
import BottomFixedModal from "@/components/ui/BottomFixedModal";
import { useActivityConfig } from "@/components/lib/useActivityConfig";
import DrawerSelect from "@/components/ui/DrawerSelect";

const LEVELS = [
  { value: "all", label: "Tous niveaux" },
  { value: "beginner", label: "Débutant" },
  { value: "intermediate", label: "Intermédiaire" },
  { value: "advanced", label: "Avancé" },
];

const fieldClass = (error, base = "") => `${base} ${error ? "border-red-400 bg-red-50 ring-1 ring-red-300" : ""}`;

export default function CreateActivityModal({ onClose, user, preselectedType = "", preselectedCategory = "" }) {
  const { activeConfigs, getEmoji, loading: configLoading } = useActivityConfig();
  const [form, setForm] = useState({
    title: "", type: preselectedType || undefined, description: "", date: "", time: "",
    city: "Eymoutiers", latitude: 45.7333, longitude: 1.7333, max_participants: "5", level_required: "all",
    duration_minutes: "", distance_km: "",
  });
  const [dogs, setDogs] = useState([]);
  const [selectedDogIds, setSelectedDogIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [userPseudo, setUserPseudo] = useState(null);

  const refs = {
    title: useRef(null),
    type: useRef(null),
    date: useRef(null),
    durationDistance: useRef(null),
  };

  useEffect(() => {
    if (user?.email) {
      base44.entities.DogProfile.filter({ created_by: user.email }).then(setDogs).catch(() => {});
      base44.entities.UserProfile.filter({ created_by: user.email }, "-created_date", 1)
        .then(r => {
          const p = r[0];
          setUserPseudo(p?.pseudo || null);
          if (p?.latitude && p?.longitude) {
            setForm(f => ({ ...f, latitude: p.latitude, longitude: p.longitude, city: p.city || f.city }));
          }
        }).catch(() => {});
    }
  }, [user]);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Le titre est obligatoire";
    const primaryDogCheck = dogs.find(d => selectedDogIds[0] === d.id);
    if (primaryDogCheck && !primaryDogCheck.photo_url) e.title = "Ce chien n'a pas de photo. Ajoutez-en une dans Mes Chiens avant de publier.";
    if (!form.type) e.type = "Le type est obligatoire";
    if (!form.date) e.date = "La date est obligatoire";
    if (!form.duration_minutes && !form.distance_km) e.durationDistance = "Renseignez au moins la durée ou la distance";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstKey = Object.keys(validationErrors)[0];
      refs[firstKey]?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrors({});
    setSaving(true);
    const selectedDogs = dogs.filter(d => selectedDogIds.includes(d.id));
    await base44.entities.Activity.create({
      ...form,
      max_participants: form.max_participants ? Number(form.max_participants) : undefined,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined,
      distance_km: form.distance_km ? Number(form.distance_km) : undefined,
      organizer_name: userPseudo || "Anonyme",
      dog_photo: selectedDogs[0]?.photo_url || "",
      dog_ids: selectedDogIds,
      dog_names: selectedDogs.map(d => d.name),
      participants: [user?.email].filter(Boolean),
      status: "open",
      category: ["pistage", "obeissance", "socialisation", "shaping", "concours", "libre"].includes(form.type) ? "travail" : "sport",
    });
    setSaving(false);
    onClose();
  };

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(er => ({ ...er, [field]: null }));
  };

  return (
    <BottomFixedModal
      title="Créer une activité"
      onClose={onClose}
      maxWidth="max-w-lg"
      footer={
        <Button type="button" onClick={handleSubmit} disabled={saving}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl">
          {saving ? "Création..." : "Créer l'activité"}
        </Button>
      }
    >
      <div className="px-5 py-4 pb-32 space-y-4">
        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-medium">
            ⚠️ Veuillez remplir tous les champs obligatoires marqués en rouge.
          </div>
        )}

        <div ref={refs.title}>
          <label className="block text-sm font-semibold text-stone-700 mb-1">Titre *</label>
          <Input value={form.title} onChange={e => set("title", e.target.value)}
            className={fieldClass(errors.title, "border-stone-200")} placeholder="Ex: Séance canicross débutants" />
          {errors.title && <p className="text-xs text-red-500 mt-1">⚠️ {errors.title}</p>}
        </div>

        <DogMultiSelector dogs={dogs} selectedIds={selectedDogIds} onChange={setSelectedDogIds} />

        <div ref={refs.type}>
          <label className="block text-sm font-semibold text-stone-700 mb-1">Type *</label>
          <DrawerSelect
            value={form.type || ""}
            onChange={v => set("type", v || undefined)}
            placeholder="Choisir une activité..."
            hasError={!!errors.type}
            options={(preselectedCategory
              ? activeConfigs.filter(t => {
                  const sportTypes = ["canicross","cani_vtt","randonnee","agility","frisbee","traction","parkour","pistage","concours","mantrailing","dog_dancing","autre_sport"];
                  const obedTypes = ["obeissance","shaping","socialisation","marche_laisse","gestion_emotions","renoncement","nosework","concours_dressage","libre","autre_dressage"];
                  if (preselectedCategory === "sport") return sportTypes.includes(t.type_key);
                  if (preselectedCategory === "obeissance") return obedTypes.includes(t.type_key);
                  return true;
                })
              : activeConfigs
            ).map(t => ({ value: t.type_key, label: `${getEmoji(t.type_key)} ${t.label}` }))}
          />
          {errors.type && <p className="text-xs text-red-500 mt-1">⚠️ {errors.type}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div ref={refs.date}>
            <label className="block text-sm font-semibold text-stone-700 mb-1">Date *</label>
            <Input type="date" value={form.date} onChange={e => set("date", e.target.value)}
              className={fieldClass(errors.date, "border-stone-200")} />
            {errors.date && <p className="text-xs text-red-500 mt-1">⚠️ {errors.date}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">Heure</label>
            <Input type="time" value={form.time} onChange={e => set("time", e.target.value)} className="border-stone-200" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">Max participants</label>
          <Input type="number" min="2" value={form.max_participants} onChange={e => set("max_participants", e.target.value)} placeholder="Illimité" className="border-stone-200" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">Localisation</label>
          <LocationPicker latitude={form.latitude} longitude={form.longitude} city={form.city} accentColor="stone"
            onLocationChange={({ latitude, longitude, city }) => setForm(f => ({ ...f, latitude, longitude, city: city || f.city }))} />
        </div>

        <div ref={refs.durationDistance}>
          <label className="block text-sm font-semibold text-stone-700 mb-1">
            Durée & Distance <span className="text-red-500">*</span>
            <span className="text-xs font-normal text-stone-400 ml-1">(au moins un)</span>
          </label>
          <div className={`space-y-3 ${errors.durationDistance ? "p-2 rounded-xl border border-red-300 bg-red-50" : ""}`}>
            <div>
              <label className="block text-xs text-stone-500 mb-1.5">⏱ Durée</label>
              <div className="flex flex-wrap gap-2">
                {["15", "30", "45", "60", "90", "120"].map(min => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => { set("duration_minutes", min); setErrors(er => ({ ...er, durationDistance: null })); }}
                    className={`px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                      form.duration_minutes === min
                        ? preselectedCategory === "sport" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-purple-500 bg-purple-50 text-purple-700"
                        : preselectedCategory === "sport" ? "border-stone-200 text-stone-600 hover:border-orange-300" : "border-stone-200 text-stone-600 hover:border-purple-300"
                    }`}
                  >
                    {Number(min) < 60 ? `${min} min` : Number(min) === 60 ? "1h" : `${Number(min)/60}h`}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { set("duration_minutes", ""); setErrors(er => ({ ...er, durationDistance: null })); }}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                    form.duration_minutes !== "" && !["15","30","45","60","90","120"].includes(form.duration_minutes)
                      ? preselectedCategory === "sport" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-purple-500 bg-purple-50 text-purple-700"
                      : preselectedCategory === "sport" ? "border-stone-200 text-stone-500 hover:border-orange-300" : "border-stone-200 text-stone-500 hover:border-purple-300"
                  }`}
                >
                  Autre
                </button>
              </div>
              {form.duration_minutes !== "" && !["15","30","45","60","90","120"].includes(form.duration_minutes) && (
                <Input type="number" min="15" value={form.duration_minutes}
                  onChange={e => { set("duration_minutes", e.target.value); setErrors(er => ({ ...er, durationDistance: null })); }}
                  placeholder="Durée en minutes"
                  className="border-stone-200 mt-2" />
              )}
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">📍 Distance (km) — optionnel</label>
              <Input type="number" min="0.1" step="0.1" value={form.distance_km}
                onChange={e => { set("distance_km", e.target.value); setErrors(er => ({ ...er, durationDistance: null })); }}
                placeholder="Ex: 5" className="border-stone-200" />
            </div>
          </div>
          {errors.durationDistance && <p className="text-xs text-red-500 mt-1">⚠️ Veuillez sélectionner une durée ou renseigner une distance</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">Niveau requis</label>
          <DrawerSelect
            value={form.level_required}
            onChange={v => set("level_required", v)}
            placeholder="Niveau requis"
            options={LEVELS}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">Description</label>
          <Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} className="border-stone-200" placeholder="Décrivez l'activité..." />
        </div>
      </div>
    </BottomFixedModal>
  );
}