import { useState, useEffect } from "react";
import { Zap } from "lucide-react";
import BottomFixedModal from "@/components/ui/BottomFixedModal";

export default function TestModePopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("zigalink_test_popup");
    if (!seen) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem("zigalink_test_popup", "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <BottomFixedModal
      onClose={dismiss}
      zIndex="z-[100]"
      maxWidth="max-w-sm"
      customHeader={
        <div
          className="px-6 pt-6 pb-4"
          style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs font-bold text-teal-100 uppercase tracking-wider">
                Phase expérimentale
              </div>
              <h2 className="text-white font-black text-base leading-tight">
                Version test locale
              </h2>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 mt-1">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-white text-xs font-semibold">
              Zone Eymoutiers · 25 km
            </span>
          </div>
        </div>
      }
      footer={
        <button
          onClick={dismiss}
          className="w-full py-3.5 rounded-2xl text-white font-black text-sm shadow-lg active:scale-95 transition-transform"
          style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
        >
          J'ai compris — Allons-y ! 🚀
        </button>
      }
    >
      <div className="px-6 py-4 space-y-3">
        <p className="text-sm text-stone-600 leading-relaxed">
          Cette application est actuellement en <strong>phase de test</strong>{" "}
          sur la zone d'Eymoutiers. Tous les utilisateurs sont temporairement
          positionnés sur la zone <strong>Eymoutiers + 25 km</strong>, optimisée
          par l'IA pour stimuler les matchs et les échanges.
        </p>

        <div className="bg-stone-50 rounded-2xl p-3">
          <p className="text-xs font-bold text-stone-700 mb-2">
            Testez toutes les fonctionnalités :
          </p>
          <div className="grid grid-cols-2 gap-1.5 text-xs text-stone-500">
            {[
              "❤️ Demandes de match",
              "💬 Envoyer des messages",
              "🐾 Proposer des balades",
              "🏆 Créer des activités",
              "📸 Partager des photos de vos chiens",
              "🗺️ Explorer la carte",
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 bg-white rounded-xl px-2 py-1.5 font-medium border border-stone-100"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
          <p className="text-xs font-bold text-amber-700 mb-1">
            ⚠️ Important – Phase de simulation
          </p>
          <p className="text-xs text-amber-600 leading-relaxed">
            Toutes les actions effectuées durant cette phase test sont des{" "}
            <strong>simulations</strong>. Aucune donnée réelle n'est engagée.
            Les matchs, messages et rencontres proposés servent uniquement à
            tester le comportement de l'application avant son lancement officiel.
          </p>
        </div>

        <p className="text-xs text-stone-400 text-center leading-relaxed">
          Votre participation active permettra d'améliorer l'expérience avant le
          lancement officiel.
        </p>
      </div>
    </BottomFixedModal>
  );
}