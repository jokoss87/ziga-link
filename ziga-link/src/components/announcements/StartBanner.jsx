// Bannière "C'est l'heure !" affichée quand start=1 est dans l'URL

export default function StartBanner({ title, onStart, onDismiss, label = "Démarrer la balade maintenant" }) {
  return (
    <div className="mx-4 mt-4 mb-2 rounded-2xl overflow-hidden shadow-md">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-white font-black text-base flex items-center gap-2">
              🚀 C'est l'heure !
            </p>
            <p className="text-emerald-100 text-sm mt-0.5 font-medium">{title}</p>
          </div>
          <button
            onClick={onDismiss}
            className="text-emerald-200 hover:text-white text-xs underline flex-shrink-0 mt-1"
          >
            Plus tard
          </button>
        </div>
        <button
          onClick={onStart}
          className="mt-3 w-full bg-white text-emerald-700 font-black py-3 rounded-xl text-sm shadow-sm active:scale-95 transition-all"
        >
          ▶ {label}
        </button>
      </div>
    </div>
  );
}