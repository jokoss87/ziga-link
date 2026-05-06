/**
 * DogMultiSelector — Sélecteur multiple de chiens réutilisable
 * Affiche les chiens de l'utilisateur sous forme de boutons toggle.
 * Gère l'état de sélection, les chaleurs, et optionnellement la photo.
 */
export default function DogMultiSelector({ dogs = [], selectedIds = [], onChange, required = false, error = null }) {
  const toggleDog = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((d) => d !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (!dogs.length) return null;

  return (
    <div>
      <label className="block text-sm font-semibold text-stone-700 mb-1.5">
        {required ? "Chiens concernés *" : "Mes chiens participants"}
        <span className="ml-1 text-xs font-normal text-stone-400">
          {required ? "(sélectionnez un ou plusieurs)" : "(optionnel)"}
        </span>
      </label>

      <div className={`flex flex-wrap gap-2 ${error ? "p-2 rounded-xl border border-red-300 bg-red-50" : ""}`}>
        {dogs.map((dog) => {
          const selected = selectedIds.includes(dog.id);
          const inHeat = dog.gender === "female" && dog.is_in_heat;

          return (
            <button
              key={dog.id}
              type="button"
              onClick={() => toggleDog(dog.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                selected
                  ? inHeat
                    ? "border-red-400 bg-red-50 text-red-800"
                    : "border-amber-400 bg-amber-50 text-amber-800"
                  : "border-stone-200 bg-white text-stone-600 hover:border-amber-300"
              }`}
            >
              {dog.photo_url ? (
                <img src={dog.photo_url} alt={dog.name} className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <span className="text-base">🐕</span>
              )}
              {dog.name}
              {inHeat && <span title="En chaleur">🔥</span>}
              {selected && <span className={inHeat ? "text-red-500 font-bold" : "text-amber-500 font-bold"}>✓</span>}
            </button>
          );
        })}
      </div>

      {error && <p className="text-xs text-red-500 mt-1">⚠️ {error}</p>}
    </div>
  );
}