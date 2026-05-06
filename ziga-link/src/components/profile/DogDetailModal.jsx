import { ArrowLeft } from "lucide-react";

function TraitBar({ label, value, color = "#0d9488" }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-xs mb-1.5">
      <span className="w-32 text-stone-500 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
        <div className="h-2 rounded-full transition-all" style={{ width: `${(value / 5) * 100}%`, background: color }} />
      </div>
      <span className="text-stone-400 w-3 text-right">{value}</span>
    </div>
  );
}

const GOOD_LABEL = { yes: "Oui ✅", sometimes: "Parfois ⚠️", no: "Non ❌" };
const LEASH_LABEL = { good: "Bonne laisse ✅", pulls: "Tire ⚠️", reactive: "Réactif ❌" };
const PLAY_LABEL = { chase: "Chasse 🏃", wrestling: "Bagarre 🤼", calm: "Calme 🧘", mixed: "Mixte 🎭" };

export default function DogDetailModal({ dog, levelInfo, onClose, onLightbox }) {
  const ageYears = dog.age_years || (dog.birthDate ? Math.floor((Date.now() - new Date(dog.birthDate)) / (365.25 * 86400000)) : null);

  return (
    <div className="fixed inset-0 z-[100] bg-stone-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-stone-600" />
        </button>
        <div>
          <p className="font-black text-stone-800">{dog.name}</p>
          <p className="text-xs text-stone-400">{dog.breed}</p>
        </div>
      </div>

      {/* Photo */}
      <div
        className="w-full flex items-center justify-center overflow-hidden bg-stone-200 cursor-pointer"
        style={{ height: 190, background: "linear-gradient(135deg, #f0fdf4, #d1fae5)" }}
        onClick={() => dog.photo_url && onLightbox?.(dog.photo_url)}
      >
        {dog.photo_url ? (
          <img src={dog.photo_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-7xl">🐕</span>
        )}
      </div>

      <div className="px-4 pb-10 pt-4 space-y-4">
        {/* Infos de base */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-stone-400 text-xs">Race</span><p className="font-semibold text-stone-700">{dog.breed || "—"}</p></div>
            <div><span className="text-stone-400 text-xs">Sexe</span><p className="font-semibold text-stone-700">{dog.gender === "male" ? "Mâle ♂" : "Femelle ♀"}</p></div>
            {ageYears !== null && <div><span className="text-stone-400 text-xs">Âge</span><p className="font-semibold text-stone-700">{ageYears} an{ageYears > 1 ? "s" : ""}</p></div>}
            {dog.weight && <div><span className="text-stone-400 text-xs">Poids</span><p className="font-semibold text-stone-700">{dog.weight} kg</p></div>}
            {dog.size && <div><span className="text-stone-400 text-xs">Taille</span><p className="font-semibold text-stone-700 capitalize">{dog.size === "small" ? "Petit" : dog.size === "medium" ? "Moyen" : "Grand"}</p></div>}
          </div>
          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {dog.vaccinated && <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">💉 Vacciné</span>}
            {dog.isNeutered && <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">✂️ Stérilisé</span>}
            {dog.good_with_dogs && <span className="text-xs bg-stone-50 text-stone-600 border border-stone-200 rounded-full px-2 py-0.5">🐕 Avec chiens : {GOOD_LABEL[dog.good_with_dogs]}</span>}
            {dog.good_with_children && <span className="text-xs bg-stone-50 text-stone-600 border border-stone-200 rounded-full px-2 py-0.5">👶 Avec enfants : {GOOD_LABEL[dog.good_with_children]}</span>}
            {dog.leashBehavior && <span className="text-xs bg-stone-50 text-stone-600 border border-stone-200 rounded-full px-2 py-0.5">{LEASH_LABEL[dog.leashBehavior]}</span>}
            {dog.playStyle && <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">Jeu : {PLAY_LABEL[dog.playStyle]}</span>}
          </div>
        </div>

        {/* Obéissance */}
        {levelInfo && (
          <div className="rounded-2xl p-4 border" style={{ background: "#EEEDFE", borderColor: "#c4b5fd" }}>
            <p className="font-black text-violet-800 text-sm mb-2">🎓 Obéissance</p>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl font-black text-violet-700">Niv. {levelInfo.level}</span>
              <span className="text-xs text-violet-500">{levelInfo.xp_total} XP</span>
            </div>
            <div className="h-2 bg-violet-200 rounded-full overflow-hidden mb-2">
              <div className="h-2 bg-violet-500 rounded-full" style={{ width: `${levelInfo.xp_total % 100}%` }} />
            </div>
            {levelInfo.badges?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {levelInfo.badges.map((b, i) => (
                  <span key={i} className="text-sm">{b}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bio */}
        {dog.bio && (
          <div className="bg-stone-100 rounded-2xl p-4">
            <p className="text-xs text-stone-400 font-semibold mb-1">Description</p>
            <p className="text-sm text-stone-700 leading-relaxed">{dog.bio}</p>
          </div>
        )}

        {/* Barres de caractère */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4">
          <p className="font-bold text-stone-700 text-sm mb-3">Caractère</p>
          <TraitBar label="Énergie" value={dog.energyLevel} />
          <TraitBar label="Sociabilité chiens" value={dog.sociabilityDogs} />
          <TraitBar label="Sociabilité humains" value={dog.sociabilityHumans} />
          <TraitBar label="Rappel" value={dog.recallLevel} />
          <TraitBar
            label="Réactivité"
            value={dog.reactivityLevel}
            color={dog.reactivityLevel > 3 ? "#f97316" : "#0d9488"}
          />
        </div>
      </div>
    </div>
  );
}