import { Shield, Heart, AlertTriangle, Eye, Users, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const RULES = [
  {
    icon: Heart,
    color: "text-rose-500 bg-rose-50",
    title: "Bienveillance & Respect",
    rules: [
      "Respectez tous les membres et leurs chiens",
      "Pas de jugement sur les méthodes éducatives positives",
      "Signalez tout comportement inapproprié",
      "Encouragez les débutants",
    ],
  },
  {
    icon: Shield,
    color: "text-teal-500 bg-teal-50",
    title: "Sécurité des rencontres",
    rules: [
      "N'organisez les rencontres qu'en espace public",
      "Informez un proche de l'heure et du lieu",
      "Votre chien doit être à jour de vaccinations",
      "Prévenez en cas d'annulation",
    ],
  },
  {
    icon: Eye,
    color: "text-purple-500 bg-purple-50",
    title: "Vie privée",
    rules: [
      "Ne partagez pas votre adresse exacte",
      "Utilisez la localisation approximative fournie",
      "Demandez accord avant de photographier les autres",
      "Ne divulguez pas les informations des membres",
    ],
  },
  {
    icon: Users,
    color: "text-amber-500 bg-amber-50",
    title: "Responsabilité canine",
    rules: [
      "Vous êtes responsable de votre chien à tout moment",
      "Laisse obligatoire dans les espaces publics",
      "Ramassez toujours les déjections",
      "Signalez la réactivité ou agressivité de votre chien",
    ],
  },
  {
    icon: AlertTriangle,
    color: "text-orange-500 bg-orange-50",
    title: "Tolérance zéro",
    rules: [
      "Maltraitance animale → exclusion immédiate et permanente",
      "Harcèlement ou menaces → exclusion",
      "Faux profils → exclusion",
      "Spam ou publicité non autorisée → exclusion",
    ],
  },
];

export default function Regles() {
  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <div className="bg-gradient-to-br from-teal-600 to-emerald-700 px-6 py-10 text-white">
        <div className="max-w-2xl mx-auto">
          <Link to={createPageUrl("Profil")} className="flex items-center gap-2 text-teal-200 hover:text-white mb-4 text-sm">
            <ChevronLeft className="w-4 h-4" /> Retour
          </Link>
          <div className="text-4xl mb-3">📋</div>
          <h1 className="text-3xl font-black mb-1">Règles de la communauté</h1>
          <p className="text-teal-200">Pour une communauté sûre et bienveillante</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {RULES.map(({ icon: Icon, color, title, rules }) => (
          <div key={title} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-stone-50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="font-bold text-stone-800">{title}</h2>
              </div>
            </div>
            <ul className="p-4 space-y-2">
              {rules.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
                  <span className="text-teal-400 font-bold flex-shrink-0">•</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
          <div className="text-3xl mb-2">🤝</div>
          <p className="font-bold text-emerald-800 mb-1">Ensemble pour nos chiens</p>
          <p className="text-sm text-emerald-700">En utilisant PAW SPOT vous acceptez ces règles et vous engagez à les respecter pour le bien de toute la communauté.</p>
        </div>
      </div>
    </div>
  );
}