import { useState } from "react";
import { Trophy, Zap, Wind, Dumbbell, Star, ChevronRight } from "lucide-react";
import { getActivityImage } from "@/components/lib/activityAssets";

const sports = [
  {
    name: "Agility",
    icon: "🏃",
    description: "Parcours d'obstacles chronométré. Le duo chien/maître en parfaite harmonie.",
    niveau: ["Débutant", "Intermédiaire", "Compétition"],
    color: "bg-orange-50 border-orange-200",
    iconBg: "bg-orange-100",
  },
  {
    name: "Canicross",
    icon: null,
    iconImg: getActivityImage("canicross"),
    description: "Course à pied avec son chien attaché à une ceinture. Idéal pour les amateurs de running.",
    niveau: ["Débutant", "Intermédiaire", "Compétition"],
    color: "bg-amber-50 border-amber-200",
    iconBg: "bg-amber-100",
  },
  {
    name: "Frisbee (Disc Dog)",
    icon: "🥏",
    description: "Lancers de frisbee. Spectaculaire et très ludique.",
    niveau: ["Débutant", "Intermédiaire", "Compétition"],
    color: "bg-yellow-50 border-yellow-200",
    iconBg: "bg-yellow-100",
  },
  {
    name: "Flyball",
    icon: "🎾",
    description: "Relais de balles en équipe. Sport collectif intense et fun.",
    niveau: ["Intermédiaire", "Compétition"],
    color: "bg-lime-50 border-lime-200",
    iconBg: "bg-lime-100",
  },
  {
    name: "Mondioring",
    icon: "🛡️",
    description: "Sport de travail combinant obéissance, sauts et mordant.",
    niveau: ["Avancé", "Compétition"],
    color: "bg-red-50 border-red-200",
    iconBg: "bg-red-100",
  },
  {
    name: "Treibball",
    icon: "⚽",
    description: "Pousser des ballons de gym dans un but. Idéal pour les chiens de troupeau.",
    niveau: ["Débutant", "Intermédiaire"],
    color: "bg-green-50 border-green-200",
    iconBg: "bg-green-100",
  },
  {
    name: "Bikejoring",
    icon: "🚴",
    description: "Traction d'un vélo par le chien. Pour les chiens à fort gabarit et énergie.",
    niveau: ["Intermédiaire", "Avancé"],
    color: "bg-blue-50 border-blue-200",
    iconBg: "bg-blue-100",
  },
  {
    name: "Nosework",
    icon: "👃",
    description: "Recherche d'odeurs spécifiques. Idéal pour tous les chiens, même seniors.",
    niveau: ["Débutant", "Intermédiaire", "Compétition"],
    color: "bg-purple-50 border-purple-200",
    iconBg: "bg-purple-100",
  },
];

export default function SportsCanins() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="min-h-screen bg-amber-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-400 via-amber-500 to-yellow-400 px-6 py-10 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-3xl font-bold mb-2">Sports Canins</h1>
          <p className="text-amber-100 text-base">Découvrez les sports à pratiquer avec votre chien</p>
        </div>
      </div>

      {/* Sports Grid */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-5">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-amber-900">Disciplines sportives</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sports.map((sport) => (
            <div
              key={sport.name}
              onClick={() => setSelected(selected === sport.name ? null : sport.name)}
              className={`border-2 rounded-2xl p-4 cursor-pointer transition-all ${sport.color} ${selected === sport.name ? "shadow-md scale-[1.02]" : "hover:shadow-sm"}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${sport.iconBg} flex-shrink-0 overflow-hidden`}>
                  {sport.iconImg
                    ? <img src={sport.iconImg} alt={sport.name} className="w-full h-full object-cover rounded-xl" />
                    : sport.icon
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-amber-900 text-base">{sport.name}</h3>
                    <ChevronRight className={`w-4 h-4 text-amber-400 transition-transform ${selected === sport.name ? "rotate-90" : ""}`} />
                  </div>
                  {selected === sport.name && (
                    <div className="mt-2 space-y-2">
                      <p className="text-sm text-amber-800">{sport.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {sport.niveau.map((n) => (
                          <span key={n} className="text-xs bg-white/70 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
                            {n}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selected !== sport.name && (
                    <p className="text-xs text-amber-600 mt-1 line-clamp-1">{sport.description}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tip */}
        <div className="mt-6 bg-orange-100 border border-orange-200 rounded-2xl p-4 flex gap-3 items-start">
          <Star className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-orange-800 text-sm">Conseil ActivityDogs</p>
            <p className="text-sm text-orange-700 mt-1">Chaque chien est unique ! Choisissez un sport adapté à sa morphologie, son énergie et son caractère. Consultez un éducateur canin pour bien démarrer.</p>
          </div>
        </div>
      </div>
    </div>
  );
}