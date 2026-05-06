import { useState } from "react";
import { base44 } from "@/api/base44Client";

const DOG_TAGS = [
  { value: "joueur", label: "🐾 Joueur" },
  { value: "calme", label: "🧘 Calme" },
  { value: "excite", label: "⚡ Excité" },
  { value: "reactif_congeneres", label: "⚠️ Réactif congénères" },
  { value: "reactif_humains", label: "⚠️ Réactif humains" },
  { value: "protecteur_ressources", label: "🦴 Protecteur ressources" },
];

const OWNER_TAGS = [
  { value: "controle_chien", label: "🎯 Contrôle du chien" },
  { value: "communicatif", label: "🤝 Communicatif" },
  { value: "distrait", label: "📵 Distrait" },
  { value: "non_respect_regles", label: "❗ Ne respecte pas les règles" },
  { value: "minimisation_problemes", label: "⚠️ Minimisation des problèmes" },
];

const SCORE_BUTTONS_DOG = [
  { value: "green", label: "🟢 OK social", color: "border-green-400 bg-green-50 text-green-700" },
  { value: "yellow", label: "🟡 À surveiller", color: "border-amber-400 bg-amber-50 text-amber-700" },
  { value: "red", label: "🔴 Problématique", color: "border-red-400 bg-red-50 text-red-700" },
];

const SCORE_BUTTONS_OWNER = [
  { value: "green", label: "🟢 Respectueux", color: "border-green-400 bg-green-50 text-green-700" },
  { value: "yellow", label: "🟡 Correct", color: "border-amber-400 bg-amber-50 text-amber-700" },
  { value: "red", label: "🔴 Problématique", color: "border-red-400 bg-red-50 text-red-700" },
];

function TagSelector({ tags, selected, onChange, max = 2 }) {
  const toggle = (v) => {
    if (selected.includes(v)) onChange(selected.filter(t => t !== v));
    else if (selected.length < max) onChange([...selected, v]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(t => (
        <button
          key={t.value}
          onClick={() => toggle(t.value)}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            selected.includes(t.value)
              ? "border-teal-500 bg-teal-50 text-teal-700"
              : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default function EncounterRatingModal({ announcement, participants, currentUserEmail, onClose }) {
  const toRate = (participants || []).filter(p => p.email !== currentUserEmail);
  const [pIndex, setPIndex] = useState(0);
  const [screen, setScreen] = useState(0); // 0=dog score, 1=dog tags, 2=owner score, 3=owner tags
  const [dogScore, setDogScore] = useState(null);
  const [dogTags, setDogTags] = useState([]);
  const [ownerScore, setOwnerScore] = useState(null);
  const [ownerTags, setOwnerTags] = useState([]);
  const [saving, setSaving] = useState(false);

  const current = toRate[pIndex];

  const resetScreens = () => {
    setScreen(0);
    setDogScore(null);
    setDogTags([]);
    setOwnerScore(null);
    setOwnerTags([]);
  };

  const nextParticipant = (isLast = false) => {
    if (isLast || pIndex + 1 >= toRate.length) {
      onClose();
    } else {
      setPIndex(i => i + 1);
      resetScreens();
    }
  };

  const submitRatings = async () => {
    if (!dogScore || !ownerScore || !current) { nextParticipant(); return; }
    setSaving(true);
    try {
      await base44.functions.invoke('processEncounterRating', {
        announcementId: announcement?.id || '',
        toEmail: current.email,
        ratingType: 'dog',
        dogId: current.dog_id || '',
        dogName: current.dog_name || '',
        score: dogScore,
        tags: dogTags,
      });
      await base44.functions.invoke('processEncounterRating', {
        announcementId: announcement?.id || '',
        toEmail: current.email,
        ratingType: 'owner',
        dogId: current.dog_id || '',
        dogName: current.dog_name || '',
        score: ownerScore,
        tags: ownerTags,
      });
    } catch (_) {}
    setSaving(false);
    nextParticipant(pIndex + 1 >= toRate.length);
  };

  const skip = () => nextParticipant(pIndex + 1 >= toRate.length);

  if (toRate.length === 0) return null;
  if (!current) return null;

  const progress = `${pIndex + 1} / ${toRate.length}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 shadow-xl" style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 20px))" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-stone-400 font-medium">Participant {progress}</span>
          <button onClick={skip} className="text-xs text-stone-400 underline">Passer →</button>
        </div>

        {/* Ecran 0 — Score chien */}
        {screen === 0 && (
          <div>
            <p className="text-lg font-black text-stone-800 mb-1">🐕 Comment était <span className="text-teal-600">{current.dog_name || "le chien"}</span> ?</p>
            <p className="text-xs text-stone-400 mb-4">de {current.pseudo || "Propriétaire 🐾"}</p>
            <div className="space-y-2">
              {SCORE_BUTTONS_DOG.map(btn => (
                <button
                  key={btn.value}
                  onClick={() => { setDogScore(btn.value); setScreen(1); }}
                  className={`w-full py-3 rounded-xl border-2 font-semibold text-sm transition-all ${btn.color}`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ecran 1 — Tags chien */}
        {screen === 1 && (
          <div>
            <p className="text-lg font-black text-stone-800 mb-1">🏷️ Tags pour {current.dog_name || "ce chien"}</p>
            <p className="text-xs text-stone-400 mb-4">Optionnel — max 2</p>
            <TagSelector tags={DOG_TAGS} selected={dogTags} onChange={setDogTags} max={2} />
            <button
              onClick={() => setScreen(2)}
              className="mt-5 w-full py-3 rounded-xl bg-stone-800 text-white font-bold text-sm"
            >
              Suivant →
            </button>
          </div>
        )}

        {/* Ecran 2 — Score propriétaire */}
        {screen === 2 && (
          <div>
            <p className="text-lg font-black text-stone-800 mb-1">👤 Comment était le propriétaire ?</p>
            <p className="text-xs text-stone-400 mb-4">{current.pseudo || "Propriétaire 🐾"}</p>
            <div className="space-y-2">
              {SCORE_BUTTONS_OWNER.map(btn => (
                <button
                  key={btn.value}
                  onClick={() => { setOwnerScore(btn.value); setScreen(3); }}
                  className={`w-full py-3 rounded-xl border-2 font-semibold text-sm transition-all ${btn.color}`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ecran 3 — Tags propriétaire */}
        {screen === 3 && (
          <div>
            <p className="text-lg font-black text-stone-800 mb-1">🏷️ Tags pour le propriétaire</p>
            <p className="text-xs text-stone-400 mb-4">Optionnel — max 2</p>
            <TagSelector tags={OWNER_TAGS} selected={ownerTags} onChange={setOwnerTags} max={2} />
            <button
              onClick={submitRatings}
              disabled={saving}
              className="mt-5 w-full py-3 rounded-xl font-bold text-sm text-white"
              style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
            >
              {saving ? "Envoi..." : "Terminer ✓"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}