import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { cacheInvalidate } from "@/components/lib/cache";
import { ArrowLeft, PawPrint, MapPin, Calendar, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LocationPicker from "@/components/location/LocationPicker";
import DogMultiSelector from "@/components/dogs/DogMultiSelector";

const fieldClass = (error, base = "") =>
  `${base} ${error ? "border-red-400 bg-red-50 ring-1 ring-red-300" : ""}`;

export default function CreateAnnouncement() {
  const navigate = useNavigate();
  const { user } = useUserProfile();
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [heatWarning, setHeatWarning] = useState(false);
  const [selectedDogIds, setSelectedDogIds] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    city: "Eymoutiers",
    latitude: 45.7333,
    longitude: 1.7333,
    duration_minutes: "",
    distance_km: "",
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  const refs = {
    dog_id: useRef(null),
    title: useRef(null),
    date: useRef(null),
    durationDistance: useRef(null),
  };

  useEffect(() => {
    if (user) loadDogs();
  }, [user?.email]);

  const loadDogs = async () => {
    if (!user) return;
    const [myDogs, profiles] = await Promise.all([
      base44.entities.DogProfile.filter({ created_by: user.email }),
      base44.entities.UserProfile.filter({ created_by: user.email }, "-created_date", 1),
    ]);
    setDogs(myDogs);
    const p = profiles[0];
    if (p?.latitude && p?.longitude) {
      setForm(f => ({ ...f, latitude: p.latitude, longitude: p.longitude, city: p.city || f.city }));
    }
    setLoading(false);
  };

  const toggleDog = (dogId) => {
    setSelectedDogIds(prev => {
      const next = prev.includes(dogId) ? prev.filter(id => id !== dogId) : [...prev, dogId];
      const hasHeat = next.some(id => {
        const d = dogs.find(dd => dd.id === id);
        return d?.gender === "female" && d?.is_in_heat;
      });
      setHeatWarning(hasHeat);
      return next;
    });
    setErrors(er => ({ ...er, dog_id: null }));
  };

  const validate = () => {
    const e = {};
    if (selectedDogIds.length === 0) e.dog_id = "Sélectionnez au moins un chien";
    const primaryDogCheck = dogs.find(d => selectedDogIds[0] === d.id);
    if (primaryDogCheck && !primaryDogCheck.photo_url) e.dog_id = "Ce chien n'a pas de photo. Ajoutez-en une dans Mes Chiens avant de publier.";
    if (!form.title.trim()) e.title = "Le titre est obligatoire";
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
    setSubmitError(null);
    setSaving(true);

    try {
      const selectedDogs = dogs.filter(d => selectedDogIds.includes(d.id));
      const primaryDog = selectedDogs[0];
      const profiles = await base44.entities.UserProfile.filter({ created_by: user.email }).catch(() => []);
      const userProfile = profiles[0];

      await base44.entities.MeetupAnnouncement.create({
        ...form,
        dog_id: primaryDog?.id || "",
        dog_ids: selectedDogIds,
        dog_name: primaryDog?.name || "",
        dog_names: selectedDogs.map(d => d.name),
        dog_photo: primaryDog?.photo_url || "",
        owner_name: userProfile?.pseudo || "",
        status: "open",
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined,
        distance_km: form.distance_km ? Number(form.distance_km) : undefined,
      });

      setSaving(false);
      // CORRECTION : invalider le cache pour que la Home affiche la nouvelle annonce immédiatement
      cacheInvalidate("home_announcements_open");
      cacheInvalidate("home_announcements_matched");
      cacheInvalidate("home_activities");
      navigate(createPageUrl("Home"));
    } catch (err) {
      console.error("[CreateAnnouncement]", err);
      setSubmitError(err?.message || "Veuillez réessayer.");
      setSaving(false);
      base44.entities.AppLog.create({
        level: "error",
        category: "data",
        message: "Échec création annonce MeetupAnnouncement",
        details: JSON.stringify({
          error: err?.message || String(err),
          form: {
            title: form.title,
            date: form.date,
            city: form.city,
            duration_minutes: form.duration_minutes,
            distance_km: form.distance_km,
            dog_ids_count: selectedDogIds.length,
          },
        }),
        user_email: user?.email || "",
        page: "CreateAnnouncement",
        stack: err?.stack || "",
        resolved: false,
      }).catch(() => {});
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-teal-50">
      <div className="px-6 py-8 text-white" style={{ background: "linear-gradient(135deg, #1a5c3a, #4CAF87, #00d4d4)" }}>
        <div className="max-w-xl mx-auto">
          <Link to={createPageUrl("Home")} className="flex items-center gap-2 text-teal-100 hover:text-white mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PawPrint className="w-7 h-7" /> Créer une annonce
          </h1>
          <p className="text-teal-100 mt-1">Proposez une rencontre pour votre chien</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6">
        {dogs.length === 0 ? (
          <div className="text-center py-12 text-teal-600">
            <PawPrint className="w-14 h-14 mx-auto mb-4 opacity-40" />
            <p className="font-semibold text-lg mb-2">Aucun chien enregistré</p>
            <p className="text-teal-500 text-sm mb-6">Ajoutez d'abord un profil pour votre chien.</p>
            <Link to={createPageUrl("MyDogs")}>
              <Button className="text-white" style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}>Ajouter mon chien</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-2xl p-6 shadow-sm border border-teal-100">
            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-medium">
                ⚠️ Veuillez remplir tous les champs obligatoires marqués en rouge.
              </div>
            )}
            <div ref={refs.dog_id}>
              <DogMultiSelector
                dogs={dogs}
                selectedIds={selectedDogIds}
                onChange={(ids) => { setSelectedDogIds(ids); setErrors(er => ({ ...er, dog_id: null })); }}
                required
                error={errors.dog_id}
              />
            </div>

            {heatWarning && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-700">
                  ⚠️ Un ou plusieurs chiens sélectionnés sont en chaleur.
                  Il est recommandé de reporter la rencontre pour éviter tout stress ou risque involontaire.
                  Vous pouvez quand même créer l'annonce si vous le souhaitez.
                </AlertDescription>
              </Alert>
            )}

            <div ref={refs.title}>
              <label className="block text-sm font-semibold text-teal-900 mb-1.5">Titre de l'annonce *</label>
              <Input
                value={form.title}
                onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setErrors(er => ({ ...er, title: null })); }}
                placeholder="Ex: Balade au parc dimanche matin"
                className={fieldClass(errors.title, "border-teal-200")}
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">⚠️ {errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-teal-900 mb-1.5">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Décrivez la rencontre que vous souhaitez..."
                className="border-teal-200"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div ref={refs.date}>
                <label className="block text-sm font-semibold text-teal-900 mb-1.5">
                  <Calendar className="w-4 h-4 inline mr-1" />Date *
                </label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => { setForm((f) => ({ ...f, date: e.target.value })); setErrors(er => ({ ...er, date: null })); }}
                  className={fieldClass(errors.date, "border-teal-200")}
                />
                {errors.date && <p className="text-xs text-red-500 mt-1">⚠️ {errors.date}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-teal-900 mb-1.5">Heure</label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                  className="border-teal-200"
                />
              </div>
            </div>

            <div ref={refs.durationDistance}>
              <label className="block text-sm font-semibold text-teal-900 mb-1.5">
                Durée & Distance <span className="text-red-500">*</span>
                <span className="text-xs font-normal text-teal-600 ml-1">(au moins un des deux)</span>
              </label>
              <div className={`space-y-3 ${errors.durationDistance ? "p-2 rounded-xl border border-red-300 bg-red-50" : ""}`}>
                <div>
                  <label className="block text-xs text-teal-700 mb-1.5">⏱ Durée</label>
                  <div className="flex flex-wrap gap-2">
                    {["15", "30", "45", "60", "90", "120"].map(min => (
                      <button
                        key={min}
                        type="button"
                        onClick={() => { setForm(f => ({ ...f, duration_minutes: min })); setErrors(er => ({ ...er, durationDistance: null })); }}
                        className={`px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                          form.duration_minutes === min
                            ? "border-teal-500 bg-teal-50 text-teal-700"
                            : "border-teal-200 text-teal-600 hover:border-teal-400"
                        }`}
                      >
                        {Number(min) < 60 ? `${min} min` : Number(min) === 60 ? "1h" : `${Number(min)/60}h`}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => { setForm(f => ({ ...f, duration_minutes: "" })); setErrors(er => ({ ...er, durationDistance: null })); }}
                      className={`px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                        form.duration_minutes !== "" && !["15","30","45","60","90","120"].includes(form.duration_minutes)
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-teal-200 text-teal-600 hover:border-teal-400"
                      }`}
                    >
                      Autre
                    </button>
                  </div>
                  {form.duration_minutes !== "" && !["15","30","45","60","90","120"].includes(form.duration_minutes) && (
                    <Input
                      type="number"
                      min="15"
                      value={form.duration_minutes}
                      onChange={(e) => { setForm((f) => ({ ...f, duration_minutes: e.target.value })); setErrors(er => ({ ...er, durationDistance: null })); }}
                      placeholder="Durée en minutes"
                      className="border-teal-200 mt-2"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs text-teal-700 mb-1">📍 Distance approx. (km) — optionnel</label>
                  <Input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={form.distance_km}
                    onChange={(e) => { setForm((f) => ({ ...f, distance_km: e.target.value })); setErrors(er => ({ ...er, durationDistance: null })); }}
                    placeholder="Ex: 5"
                    className="border-teal-200"
                  />
                </div>
              </div>
              {errors.durationDistance && <p className="text-xs text-red-500 mt-1">⚠️ Veuillez sélectionner une durée ou renseigner une distance</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-teal-900 mb-1.5">Ville</label>
              <Input
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="Ex: Paris, Lyon..."
                className="border-teal-200"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-teal-900 mb-1.5">
                <MapPin className="w-4 h-4 inline mr-1" />Localisation
              </label>
              <LocationPicker
                latitude={form.latitude}
                longitude={form.longitude}
                city={form.city}
                accentColor="teal"
                onLocationChange={({ latitude, longitude, city }) =>
                  setForm(f => ({ ...f, latitude, longitude, city: city || f.city }))
                }
              />
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-medium">
                ❌ Erreur lors de la publication : {submitError}
              </div>
            )}
            <Button
              type="submit"
              disabled={saving || selectedDogIds.length === 0}
              className="w-full text-white font-semibold py-2.5" style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
            >
              {saving ? "Publication en cours..." : "Publier l'annonce"}
            </Button>
            <div className="h-16" />
          </form>
        )}
      </div>
    </div>
  );
}