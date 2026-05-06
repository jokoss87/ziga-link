import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";

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

export default function EncounterRatingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useUserProfile();

  const announcementId = searchParams.get("announcement_id") || "";
  const toEmail = searchParams.get("to_email") || "";
  const dogName = searchParams.get("dog_name") || "";
  const dogId = searchParams.get("dog_id") || "";

  const [screen, setScreen] = useState(0); // 0=dog score, 1=dog tags, 2=owner score, 3=owner tags
  const [dogScore, setDogScore] = useState(null);
  const [dogTags, setDogTags] = useState([]);
  const [ownerScore, setOwnerScore] = useState(null);
  const [ownerTags, setOwnerTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // Marquer la notification comme lue si on vient dessus
  useEffect(() => {
    if (!user?.email || !toEmail) return;
    // Marquer les notifs de notation pour cette annonce comme lues
    base44.entities.Notification.filter({
      user_email: user.email,
      type: "encounter_rating",
      reference_id: announcementId,
    }).then(notifs => {
      notifs.forEach(n => {
        if (!n.is_read) base44.entities.Notification.update(n.id, { is_read: true }).catch(() => {});
      });
    }).catch(() => {});
  }, [user?.email, announcementId, toEmail]);

  const finish = () => navigate(createPageUrl("Home"));

  const submitRatings = async () => {
    if (!dogScore || !ownerScore) { finish(); return; }
    setSaving(true);
    try {
      await base44.functions.invoke('processEncounterRating', {
        announcementId,
        toEmail,
        ratingType: 'dog',
        dogId,
        dogName,
        score: dogScore,
        tags: dogTags,
      });
      await base44.functions.invoke('processEncounterRating', {
        announcementId,
        toEmail,
        ratingType: 'owner',
        dogId,
        dogName,
        score: ownerScore,
        tags: ownerTags,
      });
    } catch (_) {}
    setSaving(false);
    setDone(true);
    setTimeout(finish, 1500);
  };

  const skip = () => finish();

  if (!toEmail || !announcementId) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-4xl mb-3">🐾</div>
          <p className="text-stone-600 font-semibold">Lien de notation invalide.</p>
          <button onClick={finish} className="mt-4 px-5 py-2 bg-teal-500 text-white rounded-xl font-bold text-sm">
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-5xl mb-3">🌟</div>
          <p className="text-stone-800 font-black text-lg">Merci pour votre évaluation !</p>
          <p className="text-stone-400 text-sm mt-1">Ça aide la communauté à grandir 🐾</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <div className="bg-gradient-to-br from-teal-400 to-emerald-500 px-6 py-8 text-white text-center">
        <div className="text-3xl mb-2">🌟</div>
        <h1 className="text-lg font-black">Évaluer la rencontre</h1>
        <p className="text-teal-100 text-sm mt-1">30 secondes pour aider la communauté</p>
      </div>

      <div className="flex-1 flex items-end">
        <div className="bg-white rounded-t-3xl w-full max-w-lg mx-auto p-6 shadow-xl" style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 20px))" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i <= screen ? "bg-teal-500 w-8" : "bg-stone-200 w-4"}`} />
              ))}
            </div>
            <button onClick={skip} className="text-xs text-stone-400 underline">Passer →</button>
          </div>

          {/* Ecran 0 — Score chien */}
          {screen === 0 && (
            <div>
              <p className="text-lg font-black text-stone-800 mb-1">🐕 Comment était <span className="text-teal-600">{dogName || "le chien"}</span> ?</p>
              <p className="text-xs text-stone-400 mb-4">de {toEmail}</p>
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
              <p className="text-lg font-black text-stone-800 mb-1">🏷️ Tags pour {dogName || "ce chien"}</p>
              <p className="text-xs text-stone-400 mb-4">Optionnel — max 2</p>
              <TagSelector tags={DOG_TAGS} selected={dogTags} onChange={setDogTags} max={2} />
              <button onClick={() => setScreen(2)} className="mt-5 w-full py-3 rounded-xl bg-stone-800 text-white font-bold text-sm">
                Suivant →
              </button>
            </div>
          )}

          {/* Ecran 2 — Score propriétaire */}
          {screen === 2 && (
            <div>
              <p className="text-lg font-black text-stone-800 mb-1">👤 Comment était le propriétaire ?</p>
              <p className="text-xs text-stone-400 mb-4">{toEmail}</p>
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
    </div>
  );
}