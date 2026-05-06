import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Camera, Loader2, Plus, Trash2 } from "lucide-react";

const ACTIVITY_TYPES = [
  { key: "balade",        label: "🐾 Balade",        color: "bg-teal-100 text-teal-700 border-teal-300" },
  { key: "obeissance",   label: "🎓 Entraînement",  color: "bg-indigo-100 text-indigo-700 border-indigo-300" },
  { key: "randonnee",    label: "🏔️ Randonnée",     color: "bg-green-100 text-green-700 border-green-300" },
  { key: "sport",        label: "🏅 Sport",          color: "bg-orange-100 text-orange-700 border-orange-300" },
  { key: "jeu",          label: "🎾 Jeu",            color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  { key: "soin",         label: "💊 Soin",           color: "bg-pink-100 text-pink-700 border-pink-300" },
  { key: "socialisation",label: "🐕 Socialisation",  color: "bg-purple-100 text-purple-700 border-purple-300" },
  { key: "autre",        label: "✨ Autre",           color: "bg-stone-100 text-stone-700 border-stone-300" },
];

const MOODS = [
  { key: "excellent", emoji: "😄", label: "Excellent" },
  { key: "bien",      emoji: "🙂", label: "Bien" },
  { key: "moyen",     emoji: "😐", label: "Moyen" },
  { key: "difficile", emoji: "😔", label: "Difficile" },
];

const ETATS = ["Calme", "Excité", "Fatigué", "Stressé", "Motivé"];

export default function QuickLogModal({ dogs, onClose, defaultType, defaultDate }) {
  const [type, setType]           = useState(defaultType || "balade");
  const [dogIds, setDogIds]       = useState(dogs[0]?.id ? [dogs[0].id] : []);
  const [duration, setDuration]   = useState("");
  const [notes, setNotes]         = useState("");
  const [mood, setMood]           = useState("bien");
  const [dogsMetCount, setDogsMetCount] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUrl, setPhotoUrl]   = useState("");
  const [saving, setSaving]       = useState(false);

  // Champs entraînement détaillé
  const [lieu, setLieu]           = useState("");
  const [objectif, setObjectif]   = useState("");
  const [etatChien, setEtatChien] = useState([]);
  const [exercises, setExercises] = useState([{ name: "", success: "" }]);
  const [noteGlobale, setNoteGlobale] = useState("");

  const isTraining = type === "obeissance";

  const toggleDog = (id) =>
    setDogIds(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);

  const toggleEtat = (val) =>
    setEtatChien(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  const updateExercise = (idx, field, value) =>
    setExercises(prev => prev.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex));

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPhotoUrl(file_url);
    setPhotoUploading(false);
  };

  const handleSave = async () => {
    if (dogIds.length === 0) return;
    setSaving(true);

    const selectedDogNames = dogs.filter(d => dogIds.includes(d.id)).map(d => d.name);
    const met = parseInt(dogsMetCount) || 0;
    const validExercises = exercises.filter(e => e.name.trim());

    // Calcul humeur depuis note globale pour l'entraînement
    const computedMood = isTraining && noteGlobale
      ? (parseInt(noteGlobale) >= 8 ? "excellent" : parseInt(noteGlobale) >= 6 ? "bien" : parseInt(noteGlobale) >= 4 ? "moyen" : "difficile")
      : mood;

    // Notes enrichies pour l'entraînement
    const trainingNotes = isTraining ? [
      lieu && `Lieu : ${lieu}`,
      objectif && `Objectif : ${objectif}`,
      etatChien.length > 0 && `État du chien : ${etatChien.join(", ")}`,
      validExercises.length > 0 && `Exercices : ${validExercises.map(e => `${e.name}${e.success ? ` (${e.success})` : ""}`).join(", ")}`,
      noteGlobale && `Note : ${noteGlobale}/10`,
      notes && `Notes : ${notes}`,
    ].filter(Boolean).join("\n") : notes;

    const activityLabel = ACTIVITY_TYPES.find(a => a.key === type)?.label || type;
    const baseTitle = isTraining
      ? `Séance${objectif ? ` — ${objectif}` : ""}`
      : `${activityLabel}${met > 0 ? ` · ${met} chien(s) rencontré(s)` : ""}${dogIds.length > 1 ? ` (${selectedDogNames.join(", ")})` : ""}`;

    for (const dId of dogIds) {
      const dog = dogs.find(d => d.id === dId);
      await base44.entities.ProgressEntry.create({
        dog_id: dId,
        dog_name: dog?.name || "",
        session_type: type,
        title: baseTitle,
        notes: trainingNotes,
        duration_minutes: parseInt(duration) || 0,
        mood: computedMood,
        exercises: validExercises.map(e => e.name),
        objective: objectif || undefined,
        media_url: photoUrl || undefined,
        session_date: defaultDate ? defaultDate.toISOString() : undefined,
      });
    }

    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-5 pt-5 pb-3 border-b border-stone-100">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-stone-800">📝 Nouvelle entrée</h2>
            <button onClick={onClose}><X className="w-5 h-5 text-stone-400" /></button>
          </div>
          <p className="text-stone-400 text-xs mt-0.5">Ajoutez une activité à votre journal</p>
          {defaultDate && (
            <p className="text-teal-600 text-xs font-semibold mt-0.5">
              📅 {defaultDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          )}
        </div>

        <div className="px-5 py-4 space-y-5">

          {/* Type */}
          <div>
            <p className="text-xs font-semibold text-stone-500 mb-2">Type d'activité</p>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_TYPES.map(a => (
                <button key={a.key} onClick={() => setType(a.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${type === a.key ? a.color + " shadow-sm scale-105" : "bg-white border-stone-200 text-stone-500"}`}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chiens */}
          <div>
            <p className="text-xs font-semibold text-stone-500 mb-2">Quel(s) chien(s) ?</p>
            <div className="flex gap-2 flex-wrap">
              {dogs.map(d => (
                <button key={d.id} onClick={() => toggleDog(d.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${dogIds.includes(d.id) ? "bg-teal-500 text-white border-teal-500" : "bg-white border-stone-200 text-stone-600"}`}>
                  {d.photo_url ? <img src={d.photo_url} className="w-4 h-4 rounded-full object-cover inline mr-1" alt="" /> : "🐕 "}
                  {d.name}
                </button>
              ))}
            </div>
            {dogIds.length === 0 && <p className="text-xs text-red-400 mt-1">Sélectionnez au moins un chien</p>}
          </div>

{/* Durée */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-stone-500 mb-1.5">Durée (min)</p>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {["15", "30", "45", "60", "90", "120"].map(min => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setDuration(min)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold border-2 transition-all ${
                      duration === min
                        ? "border-teal-500 bg-teal-50 text-teal-700"
                        : "border-stone-200 text-stone-500 hover:border-teal-300"
                    }`}
                  >
                    {Number(min) < 60 ? `${min}m` : Number(min) === 60 ? "1h" : `${Number(min)/60}h`}
                  </button>
                ))}
              </div>
              <input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="Autre..."
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
            </div>
            {!isTraining && (
              <div>
                <p className="text-xs font-semibold text-stone-500 mb-1.5">🐕 Chiens rencontrés</p>
                <input type="number" value={dogsMetCount} onChange={e => setDogsMetCount(e.target.value)} placeholder="0"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400" />
              </div>
            )}
            {isTraining && (
              <div>
                <p className="text-xs font-semibold text-stone-500 mb-1.5">Lieu</p>
                <input value={lieu} onChange={e => setLieu(e.target.value)} placeholder="Parc, jardin..."
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400" />
              </div>
            )}
          </div>

          {/* ── Champs spécifiques Entraînement ── */}
          {isTraining && (
            <>
              <div>
                <p className="text-xs font-semibold text-stone-500 mb-1.5">🎯 Objectif de la séance</p>
                <input value={objectif} onChange={e => setObjectif(e.target.value)}
                  placeholder="Ex: Améliorer le rappel en distraction"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" />
              </div>

              <div>
                <p className="text-xs font-semibold text-stone-500 mb-2">État du chien</p>
                <div className="flex flex-wrap gap-2">
                  {ETATS.map(e => (
                    <button key={e} onClick={() => toggleEtat(e)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${etatChien.includes(e) ? "bg-[#4CAF87] text-white border-[#4CAF87]" : "bg-white border-stone-200 text-stone-500"}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-stone-500 mb-2">🧠 Exercices</p>
                <div className="space-y-2">
                  {exercises.map((ex, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input value={ex.name} onChange={e => updateExercise(idx, "name", e.target.value)}
                        placeholder={`Exercice ${idx + 1}...`}
                        className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
                      <select value={ex.success} onChange={e => updateExercise(idx, "success", e.target.value)}
                        className="border border-stone-200 rounded-xl px-2 py-2 text-xs text-stone-600 focus:outline-none focus:border-violet-400 bg-white">
                        <option value="">Réussite</option>
                        <option value="Faible">Faible</option>
                        <option value="Moyenne">Moyenne</option>
                        <option value="Bonne">Bonne</option>
                        <option value="Excellente">Excellente</option>
                      </select>
                      {exercises.length > 1 && (
                        <button onClick={() => setExercises(p => p.filter((_, i) => i !== idx))}
                          className="text-stone-300 hover:text-red-400 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setExercises(p => [...p, { name: "", success: "" }])}
                    className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-3 py-2 rounded-xl w-full justify-center">
                    <Plus className="w-3.5 h-3.5" /> Ajouter un exercice
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-stone-500 mb-2">Note de séance</p>
                <div className="flex gap-1.5 flex-wrap">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} onClick={() => setNoteGlobale(String(n))}
                      className={`w-9 h-9 rounded-full text-xs font-black border transition-all ${
                        noteGlobale === String(n)
                          ? n >= 8 ? "bg-[#4CAF87] text-white border-[#4CAF87]" : n >= 5 ? "bg-amber-400 text-white border-amber-400" : "bg-red-400 text-white border-red-400"
                          : "bg-white border-stone-200 text-stone-600"
                      }`}>{n}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Humeur (hors entraînement, car remplacée par note) */}
          {!isTraining && (
            <div>
              <p className="text-xs font-semibold text-stone-500 mb-2">Humeur</p>
              <div className="flex gap-2">
                {MOODS.map(m => (
                  <button key={m.key} onClick={() => setMood(m.key)}
                    className={`flex-1 flex flex-col items-center py-2 rounded-xl border text-xs font-medium transition-all ${mood === m.key ? "bg-amber-50 border-amber-300 text-amber-700 shadow-sm scale-105" : "bg-white border-stone-200 text-stone-500"}`}>
                    <span className="text-lg">{m.emoji}</span>
                    <span className="mt-0.5">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes libres */}
          <div>
            <p className="text-xs font-semibold text-stone-500 mb-1.5">{isTraining ? "Notes complémentaires (optionnel)" : "Notes (optionnel)"}</p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder={isTraining ? "Points positifs, difficultés, observations..." : "Comment s'est passée la sortie ?"}
              rows={2} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-teal-400" />
          </div>

          {/* Photo */}
          <div>
            <label className={`flex items-center gap-2 justify-center border-2 border-dashed rounded-xl py-3 cursor-pointer transition-all ${photoUrl ? "border-teal-300 bg-teal-50" : "border-stone-200 hover:border-teal-300"}`}>
              {photoUploading ? <Loader2 className="w-4 h-4 animate-spin text-teal-500" /> : <Camera className="w-4 h-4 text-stone-400" />}
              <span className="text-sm text-stone-500">{photoUrl ? "✅ Photo ajoutée" : "Ajouter une photo"}</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
            </label>
            {photoUrl && <img src={photoUrl} alt="" className="mt-2 h-24 w-full object-cover rounded-xl" />}
          </div>

          <button onClick={handleSave} disabled={saving || dogIds.length === 0}
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "Enregistrement..." : "✅ Enregistrer"}
          </button>

          <div className="h-24" />
        </div>
      </div>
    </div>
  );
}