import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { X } from "lucide-react";

export default function ExitFeedbackPopup() {
  const { user } = useUserProfile();
  const [visible, setVisible] = useState(false);
  const [score, setScore] = useState(70);
  const [submitted, setSubmitted] = useState(false);

  const handleSend = async () => {
    await base44.entities.UserFeedback.create({
      user_email: user?.email || "anonyme",
      user_name: user?.full_name || "Anonyme",
      pleasure_score: score,
      feedback_type: "exit",
    });
    setSubmitted(true);
    setTimeout(() => setVisible(false), 1500);
  };

  const handleSkip = () => setVisible(false);

  if (!visible) return null;

  const getEmoji = () => {
    if (score >= 80) return "🤩";
    if (score >= 60) return "😊";
    if (score >= 40) return "😐";
    if (score >= 20) return "😕";
    return "😞";
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-t-3xl pb-safe shadow-2xl px-6 pt-6 pb-8">
        {submitted ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-3">💚</div>
            <p className="font-black text-stone-800">Merci beaucoup !</p>
            <p className="text-sm text-stone-400 mt-1">Votre retour a bien été enregistré.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-black text-stone-800">Votre expérience compte</h2>
                <p className="text-xs text-stone-400 mt-0.5">Version test · Eymoutiers</p>
              </div>
              <button onClick={handleSkip} className="p-2 rounded-full bg-stone-100">
                <X className="w-4 h-4 text-stone-400" />
              </button>
            </div>

            <p className="text-sm text-stone-600 mb-5 leading-relaxed">
              Sur une échelle de <strong>0 à 100 %</strong>, quel a été votre niveau de plaisir à utiliser l'application aujourd'hui ?
            </p>

            {/* Score display */}
            <div className="text-center mb-3">
              <span className="text-5xl">{getEmoji()}</span>
              <div className="text-3xl font-black text-teal-600 mt-1">{score}%</div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="0"
              max="100"
              value={score}
              onChange={e => setScore(Number(e.target.value))}
              className="w-full h-2 rounded-full outline-none cursor-pointer mb-2"
              style={{
                background: `linear-gradient(to right, #4CAF87 ${score}%, #e7e5e4 ${score}%)`,
                accentColor: "#4CAF87"
              }}
            />
            <div className="flex justify-between text-xs text-stone-300 mb-5">
              <span>0% 😞</span>
              <span>100% 🤩</span>
            </div>

            <p className="text-xs text-stone-400 text-center mb-5 leading-relaxed">
              Votre avis nous aide à construire la meilleure application canine possible.<br />
              Prenez quelques secondes pour nous dire ce que vous en pensez.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 py-3 rounded-2xl border-2 border-stone-200 text-stone-500 font-semibold text-sm"
              >
                Quitter sans répondre
              </button>
              <button
                onClick={handleSend}
                className="flex-1 py-3 rounded-2xl text-white font-bold text-sm"
                style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
              >
                Envoyer et quitter
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}