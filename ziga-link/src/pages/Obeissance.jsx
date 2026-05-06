import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { ArrowLeft, Calendar, MapPin, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import LocationPicker from "@/components/location/LocationPicker";
import DogMultiSelector from "@/components/dogs/DogMultiSelector";

const ACTIVITIES = [
  {
    key: "socialisation",
    emoji: "🤝",
    label: "Socialisation",
    subtitle: "ESSENTIEL",
    color: "bg-teal-50 border-teal-200 text-teal-800",
    selectedColor: "bg-teal-500 border-teal-500 text-white",
    info: {
      title: "La socialisation",
      badge: "⭐ ESSENTIEL",
      desc: "Base de tout en France — énorme demande notamment pour les chiots.",
      details: [
        "Socialisation avec d'autres chiens (congénères)",
        "Socialisation avec des humains variés",
        "Découverte de l'environnement (bruits, sols, lieux...)",
      ],
      warning: "Une socialisation mal faite = réactivité à l'âge adulte. Impact Ziga Link : énorme, c'est le cœur du produit.",
    },
  },
  {
    key: "rappel",
    emoji: "📣",
    label: "Le rappel",
    subtitle: "ESSENTIEL",
    color: "bg-orange-50 border-orange-200 text-orange-800",
    selectedColor: "bg-orange-500 border-orange-500 text-white",
    info: {
      title: "Le rappel",
      badge: "🥈 ESSENTIEL",
      desc: "Demande universelle — liberté du chien et sécurité du propriétaire.",
      details: [
        "Rappel en environnement calme",
        "Rappel avec distractions (le problème n°1 !)",
        "Rappel en groupe / avec d'autres chiens",
      ],
      warning: "Le problème fréquent : \"Mon chien rappelle sauf quand il y a distraction.\"",
    },
  },
  {
    key: "marche_laisse",
    emoji: "🦮",
    label: "Marche en laisse",
    subtitle: "ESSENTIEL",
    color: "bg-amber-50 border-amber-200 text-amber-800",
    selectedColor: "bg-amber-500 border-amber-500 text-white",
    info: {
      title: "La marche en laisse",
      badge: "🥉 ESSENTIEL",
      desc: "Problème numéro 1 en ville. Très demandé en éducation classique.",
      details: [
        "Chien qui tire",
        "Chien qui zigzague",
        "Frustration et réactivité en laisse",
      ],
      warning: "Source de frustration majeure pour les propriétaires urbains.",
    },
  },
  {
    key: "gestion_emotions",
    emoji: "🧘",
    label: "Gestion des émotions",
    subtitle: "ESSENTIEL mais sous-estimé",
    color: "bg-purple-50 border-purple-200 text-purple-800",
    selectedColor: "bg-purple-500 border-purple-500 text-white",
    info: {
      title: "La gestion des émotions",
      badge: "🔥 ESSENTIEL (sous-estimé)",
      desc: "En explosion ces dernières années. C'est la racine de 80% des problèmes comportementaux.",
      details: [
        "Gestion de l'excitation",
        "Gestion de la frustration",
        "Travail sur la peur et la réactivité",
      ],
      warning: "En réalité, c'est LA racine de 80% des problèmes comportementaux chez le chien.",
    },
  },
  {
    key: "ordres_base",
    emoji: "🎯",
    label: "Ordres de base",
    subtitle: "Assis / Couché / Pas bouger",
    color: "bg-blue-50 border-blue-200 text-blue-800",
    selectedColor: "bg-blue-500 border-blue-500 text-white",
    info: {
      title: "Les ordres de base",
      badge: "📌 Très demandé par les débutants",
      desc: "Assis, Couché, Pas bouger — les bases pour les propriétaires débutants.",
      details: [
        "Assis dans différents contextes",
        "Couché sur durée",
        "Pas bouger avec distraction",
      ],
      warning: "⚠️ Souvent inutile sans travail sur le contexte émotionnel du chien.",
    },
  },
  {
    key: "auto_controle",
    emoji: "🛑",
    label: "Renoncement / Auto-contrôle",
    subtitle: "Pour chiens impulsifs",
    color: "bg-red-50 border-red-200 text-red-800",
    selectedColor: "bg-red-500 border-red-500 text-white",
    info: {
      title: "Le renoncement / auto-contrôle",
      badge: "💪 Éducation moderne",
      desc: "Très utilisé en éducation positive moderne. Clé pour les chiens impulsifs.",
      details: [
        "Ne pas sauter sur les gens",
        "Ne pas voler de nourriture",
        "Ignorer des stimuli distrayants",
      ],
      warning: "Indispensable pour les chiens hyperactifs ou très impulsifs.",
    },
  },
  {
    key: "interactions_chiens",
    emoji: "🐕‍🦺",
    label: "Gestion interactions chien/chien",
    subtitle: "Codes sociaux & lecture canine",
    color: "bg-green-50 border-green-200 text-green-800",
    selectedColor: "bg-green-500 border-green-500 text-white",
    info: {
      title: "La gestion des interactions chien/chien",
      badge: "🐶 Différent de la socialisation",
      desc: "Apprendre à lire les signaux canins et gérer les rencontres entre chiens.",
      details: [
        "Codes sociaux canins",
        "Lecture du langage corporel",
        "Gestion des conflits et des tensions",
      ],
      warning: "Différent de la socialisation : ici on travaille la qualité des interactions, pas la quantité.",
    },
  },
  {
    key: "focus_attention",
    emoji: "👁️",
    label: "Focus / Attention au maître",
    subtitle: "Connexion & engagement",
    color: "bg-indigo-50 border-indigo-200 text-indigo-800",
    selectedColor: "bg-indigo-500 border-indigo-500 text-white",
    info: {
      title: "Le focus / attention au maître",
      badge: "⚡ Travail avancé",
      desc: "Très utilisé en travail avancé. La connexion est la base de tout travail sérieux.",
      details: [
        "Maintien du regard (eye contact)",
        "Engagement et motivation",
        "Focus en environnement chargé en stimuli",
      ],
      warning: "Sans connexion, aucun autre exercice ne fonctionne vraiment.",
    },
  },
  {
    key: "travail_calme",
    emoji: "😴",
    label: "Travail du calme",
    subtitle: "Immobilité & relaxation",
    color: "bg-slate-50 border-slate-200 text-slate-800",
    selectedColor: "bg-slate-500 border-slate-500 text-white",
    info: {
      title: "Le travail du calme",
      badge: "✨ Ultra-puissant et peu enseigné",
      desc: "Très peu enseigné mais ultra-puissant. Souvent la clé pour les chiens anxieux ou hyperactifs.",
      details: [
        "Apprentissage de l'immobilité volontaire",
        "Exercices de relaxation active",
        "Gestion de l'hyperexcitation",
      ],
      warning: "Un chien qui sait se calmer seul est un chien épanoui.",
    },
  },
  {
    key: "tricks_ludique",
    emoji: "🎪",
    label: "Tricks / Obéissance ludique",
    subtitle: "Fun & renforcement du lien",
    color: "bg-pink-50 border-pink-200 text-pink-800",
    selectedColor: "bg-pink-500 border-pink-500 text-white",
    info: {
      title: "Tricks & Obéissance ludique",
      badge: "🎉 Fun & lien",
      desc: "Tourner, rouler, saluer, ramasser... pour renforcer le lien et s'amuser ensemble.",
      details: [
        "Tours amusants (shake, spin, play dead...)",
        "Nosework / jeux de pistage légers",
        "Enrichissement mental et stimulation cognitive",
      ],
      warning: "Excellent pour les chiens peu motivés ou les propriétaires qui manquent de confiance.",
    },
  },
];

function InfoModal({ activity, onClose }) {
  if (!activity) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wide">{activity.info.badge}</span>
            <h3 className="text-lg font-black text-stone-800 mt-0.5">{activity.emoji} {activity.info.title}</h3>
          </div>
          <button onClick={onClose} className="text-stone-400 text-2xl leading-none">×</button>
        </div>
        <p className="text-sm text-stone-600 mb-4">{activity.info.desc}</p>
        <ul className="space-y-2 mb-4">
          {activity.info.details.map((d, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
              <span className="text-green-500 mt-0.5">✓</span> {d}
            </li>
          ))}
        </ul>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
          💡 {activity.info.warning}
        </div>
      </div>
    </div>
  );
}

const fieldClass = (error, base = "") =>
  `${base} ${error ? "border-red-400 bg-red-50 ring-1 ring-red-300" : ""}`;

export default function Obeissance() {
  const navigate = useNavigate();
  const { user } = useUserProfile();
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDogIds, setSelectedDogIds] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [infoActivity, setInfoActivity] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    city: "Eymoutiers",
    latitude: 45.7333,
    longitude: 1.7333,
    duration_minutes: "",
  });

  const refs = {
    dog_id: useRef(null),
    activity: useRef(null),
    title: useRef(null),
    date: useRef(null),
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const myDogs = await base44.entities.DogProfile.filter({ created_by: user.email });
      setDogs(myDogs);
      setLoading(false);
    })();
  }, [user?.email]);

  const handleSelectActivity = (key) => {
    setSelectedActivity(key);
    const act = ACTIVITIES.find(a => a.key === key);
    if (act && !form.title) {
      setForm(f => ({ ...f, title: `Séance ${act.label}` }));
    }
    setErrors(e => ({ ...e, activity: null }));
  };

  const validate = () => {
    const e = {};
    if (selectedDogIds.length === 0) e.dog_id = "Sélectionnez au moins un chien";
    if (!selectedActivity) e.activity = "Choisissez un type d'activité";
    if (!form.title.trim()) e.title = "Le titre est obligatoire";
    if (!form.date) e.date = "La date est obligatoire";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
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

    const act = ACTIVITIES.find(a => a.key === selectedActivity);
    const selectedDogs = dogs.filter(d => selectedDogIds.includes(d.id));
    const primaryDog = selectedDogs[0];
    const profiles = await base44.entities.UserProfile.filter({ created_by: user.email }).catch(() => []);
    const userProfile = profiles[0];

    await base44.entities.MeetupAnnouncement.create({
      ...form,
      title: form.title,
      description: `[Obéissance · ${act?.label || selectedActivity}] ${form.description}`.trim(),
      dog_id: primaryDog?.id || "",
      dog_ids: selectedDogIds,
      dog_name: primaryDog?.name || "",
      dog_names: selectedDogs.map(d => d.name),
      owner_name: userProfile?.pseudo || "",
      owner_photo: userProfile?.photo_url || "",
      status: "open",
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined,
    }).catch(err => {
      setSubmitError(err?.message || "Erreur lors de la publication.");
      setSaving(false);
      throw err;
    });

    setSaving(false);
    navigate(createPageUrl("Home"));
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-violet-400 border-t-transparent" />
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 to-indigo-700 px-5 pt-10 pb-7 text-white">
        <div className="max-w-xl mx-auto">
          <Link to={createPageUrl("Home")} className="flex items-center gap-2 text-violet-200 mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
          <h1 className="text-2xl font-black flex items-center gap-2">🏋️ Proposer une séance</h1>
          <p className="text-violet-200 mt-1 text-sm">Votre annonce sera visible dans "Chiens disponibles"</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 pb-28">
        {dogs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🐕</div>
            <p className="font-semibold text-lg mb-2 text-stone-800">Aucun chien enregistré</p>
            <p className="text-stone-400 text-sm mb-6">Ajoutez votre chien pour créer une annonce.</p>
            <Link to={createPageUrl("MyDogs")}>
              <Button className="bg-violet-600 hover:bg-violet-700 text-white">Ajouter mon chien</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-2xl p-5 shadow-sm border border-stone-100">

            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-medium">
                ⚠️ Veuillez remplir tous les champs obligatoires.
              </div>
            )}

            {/* Sélection du chien */}
            <div ref={refs.dog_id}>
              <DogMultiSelector
                dogs={dogs}
                selectedIds={selectedDogIds}
                onChange={(ids) => { setSelectedDogIds(ids); setErrors(e => ({ ...e, dog_id: null })); }}
                required
                error={errors.dog_id}
              />
            </div>

            {/* Type d'activité */}
            <div ref={refs.activity}>
              <label className="block text-sm font-bold text-stone-700 mb-1">
                Type d'activité <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-stone-400 mb-3">Sélectionnez la discipline que vous souhaitez pratiquer ensemble</p>
              {errors.activity && <p className="text-xs text-red-500 mb-2">⚠️ {errors.activity}</p>}
              <div className="space-y-2">
                {ACTIVITIES.map(act => {
                  const isSelected = selectedActivity === act.key;
                  return (
                    <div key={act.key} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectActivity(act.key)}
                        className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                          isSelected ? act.selectedColor + " shadow-sm" : act.color + " hover:opacity-90"
                        }`}
                      >
                        <span className="text-xl flex-shrink-0">{act.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold text-sm ${isSelected ? "text-white" : ""}`}>{act.label}</div>
                          <div className={`text-xs ${isSelected ? "text-white/70" : "text-stone-400"}`}>{act.subtitle}</div>
                        </div>
                        {isSelected && <span className="text-white text-lg">✓</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => setInfoActivity(act)}
                        className="flex-shrink-0 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors"
                        title={`En savoir plus : ${act.label}`}
                      >
                        <Info className="w-4 h-4 text-stone-400" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Titre */}
            <div ref={refs.title}>
              <label className="block text-sm font-bold text-stone-700 mb-1.5">Titre de l'annonce *</label>
              <Input
                value={form.title}
                onChange={(e) => { setForm(f => ({ ...f, title: e.target.value })); setErrors(er => ({ ...er, title: null })); }}
                placeholder="Ex: Séance rappel en groupe dimanche matin"
                className={fieldClass(errors.title, "border-stone-200")}
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">⚠️ {errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1.5">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Niveau de votre chien, ce que vous souhaitez travailler, ambiance souhaitée..."
                className="border-stone-200"
                rows={3}
              />
            </div>

            {/* Date & Heure */}
            <div className="grid grid-cols-2 gap-3" ref={refs.date}>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">
                  <Calendar className="w-4 h-4 inline mr-1" />Date *
                </label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => { setForm(f => ({ ...f, date: e.target.value })); setErrors(er => ({ ...er, date: null })); }}
                  className={fieldClass(errors.date, "border-stone-200")}
                />
                {errors.date && <p className="text-xs text-red-500 mt-1">⚠️ {errors.date}</p>}
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">Heure</label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))}
                  className="border-stone-200"
                />
              </div>
            </div>

            {/* Durée */}
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1.5">⏱ Durée prévue (minutes)</label>
              <Input
                type="number"
                min="15"
                value={form.duration_minutes}
                onChange={(e) => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                placeholder="Ex: 60"
                className="border-stone-200"
              />
            </div>

            {/* Ville */}
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1.5">Ville</label>
              <Input
                value={form.city}
                onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))}
                placeholder="Ex: Eymoutiers, Limoges..."
                className="border-stone-200"
              />
            </div>

            {/* Localisation */}
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1.5">
                <MapPin className="w-4 h-4 inline mr-1" />Localisation
              </label>
              <LocationPicker
                latitude={form.latitude}
                longitude={form.longitude}
                city={form.city}
                accentColor="violet"
                onLocationChange={({ latitude, longitude, city }) =>
                  setForm(f => ({ ...f, latitude, longitude, city: city || f.city }))
                }
              />
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                ❌ {submitError}
              </div>
            )}

            <Button
              type="submit"
              disabled={saving || selectedDogIds.length === 0}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 text-base"
            >
              {saving ? "Publication en cours..." : "📢 Publier l'annonce"}
            </Button>
            <div className="h-8" />
          </form>
        )}
      </div>

      {/* Modal info activité */}
      <InfoModal activity={infoActivity} onClose={() => setInfoActivity(null)} />
    </div>
  );
}