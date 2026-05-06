import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Loader2, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const CheckBox = ({ label, checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
      checked ? "bg-[#4CAF87] text-white border-[#4CAF87] shadow-sm" : "bg-white border-stone-200 text-stone-500 hover:border-teal-300"
    }`}
  >
    <span className={`w-3 h-3 rounded-sm border flex items-center justify-center flex-shrink-0 ${checked ? "bg-white border-white" : "border-stone-300"}`}>
      {checked && <span className="text-[#4CAF87] text-[8px] font-black">✓</span>}
    </span>
    {label}
  </button>
);

const RadioGroup = ({ options, value, onChange, colorClass = "" }) => (
  <div className="flex flex-wrap gap-2">
    {options.map(opt => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
          value === opt
            ? `${colorClass || "bg-[#4CAF87] border-[#4CAF87]"} text-white shadow-sm scale-105`
            : "bg-white border-stone-200 text-stone-500 hover:border-teal-300"
        }`}
      >
        {opt}
      </button>
    ))}
  </div>
);

const SectionHeader = ({ emoji, title, color = "text-teal-700", bg = "bg-teal-50" }) => (
  <div className={`flex items-center gap-2 ${bg} rounded-xl px-3 py-2 mb-3`}>
    <span className="text-base">{emoji}</span>
    <h3 className={`text-sm font-black ${color} uppercase tracking-wide`}>{title}</h3>
  </div>
);

const defaultExercise = () => ({ name: "", difficulty: "", success: "", details: "" });

export default function TrainingSessionModal({ selectedDate, dogs, onClose, onSaved }) {
  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const dateDisplay = selectedDate ? format(selectedDate, "EEEE d MMMM yyyy", { locale: fr }) : "";

  const [time, setTime] = useState(format(new Date(), "HH:mm"));
  const [lieu, setLieu] = useState("");
  const [duree, setDuree] = useState("");
  const [dogId, setDogId] = useState(dogs[0]?.id || "");
  const [etatChien, setEtatChien] = useState([]);
  const [energie, setEnergie] = useState("");

  const [objectifPrincipal, setObjectifPrincipal] = useState("");
  const [objectifSecondaire, setObjectifSecondaire] = useState("");

  const [exercises, setExercises] = useState([defaultExercise(), defaultExercise(), defaultExercise()]);

  const [concentration, setConcentration] = useState("");
  const [motivation, setMotivation] = useState("");
  const [comprehension, setComprehension] = useState("");
  const [signauxParticuliers, setSignauxParticuliers] = useState("");

  const [difficultes, setDifficultes] = useState("");
  const [pointsPositifs, setPointsPositifs] = useState("");
  const [ajustements, setAjustements] = useState("");

  const [evolution, setEvolution] = useState("");
  const [evolutionDetails, setEvolutionDetails] = useState("");

  const [retourCalme, setRetourCalme] = useState("");
  const [reactionChien, setReactionChien] = useState("");

  const [noteGlobale, setNoteGlobale] = useState("");
  const [noteRapide, setNoteRapide] = useState("");

  const [saving, setSaving] = useState(false);

  const toggleEtat = (val) => setEtatChien(prev =>
    prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
  );

  const updateExercise = (idx, field, value) => {
    setExercises(prev => prev.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex));
  };

  const addExercise = () => setExercises(prev => [...prev, defaultExercise()]);
  const removeExercise = (idx) => setExercises(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    const dog = dogs.find(d => d.id === dogId) || dogs[0];
    const validExercises = exercises.filter(e => e.name.trim());

    const notesLines = [
      etatChien.length > 0 && `État : ${etatChien.join(", ")}`,
      energie && `Énergie : ${energie}`,
      objectifPrincipal && `Objectif : ${objectifPrincipal}`,
      objectifSecondaire && `Objectif 2 : ${objectifSecondaire}`,
      validExercises.length > 0 && `Exercices : ${validExercises.map(e => `${e.name} (${e.success || "—"})`).join(", ")}`,
      concentration && `Concentration : ${concentration}`,
      motivation && `Motivation : ${motivation}`,
      comprehension && `Compréhension : ${comprehension}`,
      signauxParticuliers && `Signaux : ${signauxParticuliers}`,
      difficultes && `Difficultés : ${difficultes}`,
      pointsPositifs && `Points + : ${pointsPositifs}`,
      ajustements && `Ajustements : ${ajustements}`,
      evolution && `Évolution : ${evolution}${evolutionDetails ? ` — ${evolutionDetails}` : ""}`,
      retourCalme && `Retour au calme : ${retourCalme}`,
      reactionChien && `Réaction : ${reactionChien}`,
      noteGlobale && `Note : ${noteGlobale}/10`,
    ].filter(Boolean).join("\n");

    await base44.entities.ProgressEntry.create({
      dog_id: dog?.id || "",
      dog_name: dog?.name || "",
      session_type: "obeissance",
      title: `Séance ${dateDisplay}${objectifPrincipal ? ` — ${objectifPrincipal}` : ""}`,
      notes: notesLines,
      duration_minutes: parseInt(duree) || 0,
      mood: noteGlobale >= 8 ? "excellent" : noteGlobale >= 6 ? "bien" : noteGlobale >= 4 ? "moyen" : "difficile",
      exercises: validExercises.map(e => e.name),
      objective: objectifPrincipal,
    });

    setSaving(false);
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
      <div className="bg-stone-50 rounded-t-3xl w-full max-w-lg max-h-[95vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#4CAF87] to-teal-500 px-5 pt-5 pb-4 rounded-t-3xl z-10">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🐕</span>
              <div>
                <h2 className="text-base font-black text-white leading-tight">FICHE D'ENTRAÎNEMENT</h2>
                <p className="text-teal-100 text-xs capitalize">{dateDisplay}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full bg-white/20 hover:bg-white/30">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="px-4 py-4 space-y-5">

          {/* ── Informations générales ── */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
            <SectionHeader emoji="📅" title="Informations générales" />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-500 block mb-1">Heure</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-500 block mb-1">Durée (min)</label>
                  <input type="number" value={duree} onChange={e => setDuree(e.target.value)} placeholder="45"
                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 block mb-1">Lieu</label>
                <input value={lieu} onChange={e => setLieu(e.target.value)} placeholder="Jardin, parc, salle..."
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
              </div>
              {dogs.length > 1 && (
                <div>
                  <label className="text-xs font-semibold text-stone-500 block mb-1">Chien</label>
                  <div className="flex flex-wrap gap-2">
                    {dogs.map(d => (
                      <button key={d.id} onClick={() => setDogId(d.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          dogId === d.id ? "bg-[#4CAF87] text-white border-[#4CAF87]" : "bg-white border-stone-200 text-stone-600"
                        }`}>
                        🐾 {d.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-stone-500 block mb-2">État du chien (avant séance)</label>
                <div className="flex flex-wrap gap-2">
                  {["Calme", "Excité", "Fatigué", "Stressé", "Motivé"].map(e => (
                    <CheckBox key={e} label={e} checked={etatChien.includes(e)} onChange={() => toggleEtat(e)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 block mb-2">Niveau d'énergie</label>
                <RadioGroup options={["Faible", "Moyen", "Élevé"]} value={energie} onChange={setEnergie} />
              </div>
            </div>
          </div>

          {/* ── Objectifs ── */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
            <SectionHeader emoji="🎯" title="Objectifs de la séance" color="text-indigo-700" bg="bg-indigo-50" />
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-500 block mb-1">Objectif principal</label>
                <input value={objectifPrincipal} onChange={e => setObjectifPrincipal(e.target.value)}
                  placeholder="Ex : Améliorer le rappel en distraction"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 block mb-1">Objectif secondaire <span className="text-stone-300">(optionnel)</span></label>
                <input value={objectifSecondaire} onChange={e => setObjectifSecondaire(e.target.value)}
                  placeholder="Ex : Travailler le position assise à distance"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
              </div>
            </div>
          </div>

          {/* ── Exercices ── */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
            <SectionHeader emoji="🧠" title="Exercices réalisés" color="text-violet-700" bg="bg-violet-50" />
            <div className="space-y-4">
              {exercises.map((ex, idx) => (
                <div key={idx} className="bg-stone-50 rounded-xl p-3 border border-stone-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-stone-600">Exercice {idx + 1}</span>
                    {exercises.length > 1 && (
                      <button onClick={() => removeExercise(idx)} className="p-1 text-stone-300 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <input value={ex.name} onChange={e => updateExercise(idx, "name", e.target.value)}
                    placeholder="Nom de l'exercice..."
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:border-violet-400 bg-white" />
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <p className="text-[10px] font-semibold text-stone-400 mb-1">Difficulté</p>
                      <div className="flex gap-1 flex-wrap">
                        {["Facile", "Moyen", "Difficile"].map(d => (
                          <button key={d} onClick={() => updateExercise(idx, "difficulty", d)}
                            className={`px-2 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                              ex.difficulty === d ? "bg-violet-500 text-white border-violet-500" : "bg-white border-stone-200 text-stone-500"
                            }`}>{d}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-stone-400 mb-1">Réussite</p>
                      <div className="flex gap-1 flex-wrap">
                        {["Faible", "Moyenne", "Bonne", "Excellente"].map(r => (
                          <button key={r} onClick={() => updateExercise(idx, "success", r)}
                            className={`px-2 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                              ex.success === r ? "bg-[#4CAF87] text-white border-[#4CAF87]" : "bg-white border-stone-200 text-stone-500"
                            }`}>{r}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <input value={ex.details} onChange={e => updateExercise(idx, "details", e.target.value)}
                    placeholder="Détails rapides..."
                    className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-violet-400 bg-white" />
                </div>
              ))}
              <button onClick={addExercise}
                className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 bg-violet-50 border border-violet-200 px-3 py-2 rounded-xl w-full justify-center">
                <Plus className="w-3.5 h-3.5" /> Ajouter un exercice
              </button>
            </div>
          </div>

          {/* ── Comportement ── */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
            <SectionHeader emoji="⚡" title="Comportement observé" color="text-amber-700" bg="bg-amber-50" />
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-500 block mb-2">Concentration</label>
                <RadioGroup options={["Faible", "Moyenne", "Bonne"]} value={concentration} onChange={setConcentration}
                  colorClass="bg-amber-500 border-amber-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 block mb-2">Motivation</label>
                <RadioGroup options={["Faible", "Moyenne", "Forte"]} value={motivation} onChange={setMotivation}
                  colorClass="bg-orange-500 border-orange-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 block mb-2">Compréhension</label>
                <RadioGroup options={["Lente", "Progressive", "Rapide"]} value={comprehension} onChange={setComprehension}
                  colorClass="bg-teal-500 border-teal-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 block mb-1">Signaux particuliers</label>
                <textarea value={signauxParticuliers} onChange={e => setSignauxParticuliers(e.target.value)}
                  placeholder="Peur, excitation, distraction, blocage, progrès notable..."
                  rows={2} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-amber-400" />
              </div>
            </div>
          </div>

          {/* ── Bilan ── */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
            <SectionHeader emoji="🧩" title="Bilan de séance" color="text-rose-700" bg="bg-rose-50" />
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-500 block mb-1">Difficultés rencontrées</label>
                <textarea value={difficultes} onChange={e => setDifficultes(e.target.value)} rows={2}
                  placeholder="Ce qui n'a pas fonctionné..."
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-rose-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 block mb-1">✅ Points positifs</label>
                <textarea value={pointsPositifs} onChange={e => setPointsPositifs(e.target.value)} rows={2}
                  placeholder="Ce qui a bien marché..."
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-green-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 block mb-1">🔁 Ajustements à prévoir</label>
                <textarea value={ajustements} onChange={e => setAjustements(e.target.value)} rows={2}
                  placeholder="Ce que tu changes à la prochaine séance..."
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-400" />
              </div>
            </div>
          </div>

          {/* ── Évolution ── */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
            <SectionHeader emoji="📈" title="Évolution" color="text-teal-700" bg="bg-teal-50" />
            <div className="space-y-3">
              <RadioGroup options={["Régression", "Stable", "Amélioration"]} value={evolution} onChange={setEvolution}
                colorClass="bg-[#4CAF87] border-[#4CAF87]" />
              <input value={evolutionDetails} onChange={e => setEvolutionDetails(e.target.value)}
                placeholder="Détails sur l'évolution..."
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
            </div>
          </div>

          {/* ── Retour au calme ── */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
            <SectionHeader emoji="🧘" title="Retour au calme" color="text-sky-700" bg="bg-sky-50" />
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-500 block mb-2">Type</label>
                <RadioGroup options={["Marche", "Jeu calme", "Mastication", "Autre"]} value={retourCalme} onChange={setRetourCalme}
                  colorClass="bg-sky-500 border-sky-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 block mb-1">Réaction du chien</label>
                <input value={reactionChien} onChange={e => setReactionChien(e.target.value)}
                  placeholder="Comment le chien a réagi..."
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-400" />
              </div>
            </div>
          </div>

          {/* ── Note globale ── */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
            <SectionHeader emoji="📝" title="Note finale" color="text-stone-700" bg="bg-stone-100" />
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-500 block mb-2">Note globale de la séance</label>
                <div className="flex gap-2 flex-wrap">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} onClick={() => setNoteGlobale(String(n))}
                      className={`w-9 h-9 rounded-full text-xs font-black border transition-all ${
                        noteGlobale === String(n)
                          ? n >= 8 ? "bg-[#4CAF87] text-white border-[#4CAF87]"
                            : n >= 5 ? "bg-amber-400 text-white border-amber-400"
                            : "bg-red-400 text-white border-red-400"
                          : "bg-white border-stone-200 text-stone-600 hover:border-stone-400"
                      }`}>
                      {n}
                    </button>
                  ))}
                </div>
                {noteGlobale && (
                  <p className="text-xs text-stone-400 mt-1 text-center">
                    {noteGlobale >= 8 ? "🌟 Excellente séance !" : noteGlobale >= 6 ? "✅ Bonne séance" : noteGlobale >= 4 ? "😐 Séance correcte" : "😔 Séance difficile"}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 block mb-1">💡 Note rapide (1 phrase)</label>
                <input value={noteRapide} onChange={e => setNoteRapide(e.target.value)}
                  placeholder="👉 En une phrase..."
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
              </div>
            </div>
          </div>

          {/* ── Bouton Sauvegarder ── */}
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-gradient-to-r from-[#4CAF87] to-teal-500 text-white font-black py-4 rounded-2xl text-base shadow-lg shadow-teal-200 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-all">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "💾"}
            {saving ? "Enregistrement..." : "Sauvegarder la fiche"}
          </button>

          <div className="h-28" />
        </div>
      </div>
    </div>
  );
}