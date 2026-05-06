import { MapPin, X, Navigation } from "lucide-react";

// Modal pré-permission (explication avant demande système)
export function LocationPreRequestModal({ onConfirm, onDismiss }) {
  return (
    <div className="fixed inset-0 z-[3000] flex items-end justify-center bg-black/50">
      <div className="bg-white rounded-t-3xl w-full max-w-lg pb-10 animate-in slide-in-from-bottom">
        <div className="flex justify-end px-5 pt-4">
          <button onClick={onDismiss} className="p-2 rounded-full bg-stone-100">
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>
        <div className="px-6 pb-2 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
          >
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-black text-stone-800 mb-3">
            Découvrez les chiens autour de vous
          </h2>
          <p className="text-stone-500 text-sm leading-relaxed mb-8">
            Ziga Link utilise votre position pour afficher les chiens, balades et activités proches de vous.
          </p>
          <button
            onClick={onConfirm}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-base mb-3 shadow-lg"
            style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
          >
            Activer la localisation
          </button>
          <button
            onClick={onDismiss}
            className="w-full py-3 rounded-2xl text-stone-500 font-semibold text-sm border border-stone-200"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal si refus ou permission système bloquée
export function LocationDeniedModal({ onDismiss }) {
  const openSettings = () => {
    alert("Pour activer la localisation : Réglages → Confidentialité → Services de localisation → Votre navigateur");
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-end justify-center bg-black/50">
      <div className="bg-white rounded-t-3xl w-full max-w-lg pb-10">
        <div className="flex justify-end px-5 pt-4">
          <button onClick={onDismiss} className="p-2 rounded-full bg-stone-100">
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>
        <div className="px-6 pb-2 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-orange-50">
            <MapPin className="w-8 h-8 text-orange-400" />
          </div>
          <h2 className="text-xl font-black text-stone-800 mb-3">Localisation désactivée</h2>
          <p className="text-stone-500 text-sm leading-relaxed mb-8">
            Activez la localisation pour voir les chiens proches de vous.
          </p>
          <button
            onClick={openSettings}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-base mb-3 shadow-lg"
            style={{ background: "linear-gradient(135deg, #FF7A59, #e8634a)" }}
          >
            Ouvrir les réglages
          </button>
          <button
            onClick={onDismiss}
            className="w-full py-3 rounded-2xl text-stone-500 font-semibold text-sm border border-stone-200"
          >
            Continuer sans localisation
          </button>
        </div>
      </div>
    </div>
  );
}

// Bannière inline sur la carte quand localisation non accordée
export function MapLocationBanner({ onRequest }) {
  return (
    <div className="absolute bottom-20 left-4 right-4 z-[1000] bg-white rounded-2xl shadow-xl border border-stone-100 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}>
        <MapPin className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-stone-800">Activez la localisation</p>
        <p className="text-xs text-stone-400">Pour voir les chiens proches de vous.</p>
      </div>
      <button
        onClick={onRequest}
        className="px-3 py-2 rounded-xl text-white font-bold text-xs shadow"
        style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
      >
        Activer
      </button>
    </div>
  );
}

// Bouton "Ma position" flottant
export function MyLocationButton({ onPress }) {
  return (
    <button
      onClick={onPress}
      className="w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center border border-stone-200"
      title="Ma position"
    >
      <Navigation className="w-4 h-4 text-teal-600" />
    </button>
  );
}