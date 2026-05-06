import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { Send, ChevronLeft, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Feedback() {
  const { user } = useUserProfile();
  const [liked, setLiked] = useState("");
  const [disliked, setDisliked] = useState("");
  const [isFluid, setIsFluid] = useState("");
  const [hadBug, setHadBug] = useState(null);
  const [suggestion, setSuggestion] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const canSubmit = liked.trim() || disliked.trim() || suggestion.trim();

  const handleSubmit = async () => {
    setLoading(true);
    await base44.entities.UserFeedback.create({
      user_email: user?.email || "anonyme",
      user_name: user?.full_name || "Anonyme",
      liked,
      disliked,
      is_fluid: isFluid,
      had_bug: hadBug === true,
      suggestion,
      feedback_type: "form",
    });
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-stone-50">
        <div className="text-6xl mb-4">🐾</div>
        <CheckCircle className="w-12 h-12 text-teal-500 mb-3" />
        <h2 className="text-xl font-black text-stone-800 text-center mb-2">Merci pour votre retour !</h2>
        <p className="text-sm text-stone-400 text-center mb-6">Votre avis nous aide à construire la meilleure app canine possible.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-8 py-3 rounded-2xl text-white font-bold text-sm"
          style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-28">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-stone-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-stone-100">
          <ChevronLeft className="w-4 h-4 text-stone-500" />
        </button>
        <div>
          <h1 className="text-base font-black text-stone-800">Donner mon avis</h1>
          <p className="text-xs text-stone-400">Version test · Zone Eymoutiers</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4">
          <p className="text-sm text-teal-700 font-medium">🎯 Votre avis compte ! Prenez 2 minutes pour nous aider à améliorer PAW SPOT avant son lancement officiel.</p>
        </div>

        {/* Aimé */}
        <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
          <label className="block text-sm font-bold text-stone-700 mb-2">😊 Qu'avez-vous aimé dans l'application ?</label>
          <textarea
            value={liked}
            onChange={e => setLiked(e.target.value)}
            placeholder="Les fonctionnalités, le design, les interactions..."
            className="w-full bg-stone-50 rounded-xl p-3 text-sm text-stone-700 border border-stone-100 outline-none focus:border-teal-300 resize-none h-20"
          />
        </div>

        {/* Moins aimé */}
        <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
          <label className="block text-sm font-bold text-stone-700 mb-2">😕 Qu'avez-vous moins aimé ?</label>
          <textarea
            value={disliked}
            onChange={e => setDisliked(e.target.value)}
            placeholder="Ce qui vous a gêné ou manqué..."
            className="w-full bg-stone-50 rounded-xl p-3 text-sm text-stone-700 border border-stone-100 outline-none focus:border-teal-300 resize-none h-20"
          />
        </div>

        {/* Fluidité */}
        <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
          <label className="block text-sm font-bold text-stone-700 mb-3">⚡ L'application vous semble-t-elle fluide ?</label>
          <div className="flex gap-2">
            {[{ val: "oui", label: "✅ Oui", color: "bg-teal-50 text-teal-700 border-teal-200" }, { val: "moyennement", label: "⚠️ Moyennement", color: "bg-amber-50 text-amber-700 border-amber-200" }, { val: "non", label: "❌ Non", color: "bg-red-50 text-red-700 border-red-200" }].map(opt => (
              <button
                key={opt.val}
                onClick={() => setIsFluid(opt.val)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${isFluid === opt.val ? opt.color + " scale-105 shadow-sm" : "bg-stone-50 text-stone-400 border-stone-100"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bug */}
        <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
          <label className="block text-sm font-bold text-stone-700 mb-3">🐛 Avez-vous rencontré un problème technique ?</label>
          <div className="flex gap-3">
            {[{ val: true, label: "Oui" }, { val: false, label: "Non" }].map(opt => (
              <button
                key={String(opt.val)}
                onClick={() => setHadBug(opt.val)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${hadBug === opt.val ? "bg-teal-50 text-teal-700 border-teal-300 scale-105" : "bg-stone-50 text-stone-400 border-stone-100"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Suggestion */}
        <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
          <label className="block text-sm font-bold text-stone-700 mb-2">💡 Une suggestion d'amélioration ?</label>
          <textarea
            value={suggestion}
            onChange={e => setSuggestion(e.target.value)}
            placeholder="Votre idée pour améliorer l'app..."
            className="w-full bg-stone-50 rounded-xl p-3 text-sm text-stone-700 border border-stone-100 outline-none focus:border-teal-300 resize-none h-20"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          className="w-full py-4 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg active:scale-95 transition-transform"
          style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
        >
          <Send className="w-4 h-4" />
          {loading ? "Envoi en cours..." : "Envoyer mon retour"}
        </button>
      </div>
    </div>
  );
}