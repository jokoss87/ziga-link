import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { FileText, Shield, CheckCircle, XCircle, AlertTriangle, Mail, Lock, Scale } from "lucide-react";

export default function CGU() {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDoc();
  }, []);

  const loadDoc = async () => {
    setLoading(true);
    const docs = await base44.entities.LegalDocument.filter({ is_active: true }, "-created_date", 1);
    setDoc(docs[0] || null);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent" />
      </div>
    );
  }

  const defaultDoc = {
    version: "1.0",
    effective_date: "2026-02-28",
    intro: "Bienvenue sur ZIGA LINK. En utilisant cette application, vous acceptez les présentes conditions générales d'utilisation. Ces CGU régissent votre accès et votre utilisation de la plateforme ZIGA LINK, une communauté dédiée aux propriétaires de chiens.",
    license: "ZIGA LINK vous accorde une licence personnelle, non exclusive, non transférable et révocable pour accéder et utiliser l'application à des fins personnelles et non commerciales. Tous les droits de propriété intellectuelle (textes, logos, designs, code source) restent la propriété exclusive de ZIGA LINK.",
    allowed: "✔ Créer un profil personnel et un profil pour votre chien\n✔ Publier des posts, des photos et des commentaires\n✔ Organiser et rejoindre des activités canines\n✔ Contacter d'autres membres via la messagerie interne\n✔ Partager du contenu soumis par vos soins\n✔ Utiliser les fonctionnalités de matching et de balade",
    forbidden: "✘ Reproduire, copier ou distribuer le contenu de l'application sans autorisation\n✘ Utiliser l'application à des fins commerciales sans accord préalable\n✘ Usurper l'identité d'un autre utilisateur\n✘ Publier du contenu illégal, offensant, harcelant ou trompeur\n✘ Tenter d'accéder au code source ou aux systèmes de l'application\n✘ Vendre, louer ou transférer votre compte à un tiers\n✘ Utiliser des bots ou outils automatisés pour interagir avec la plateforme",
    legal_recourse: "Toute violation des présentes CGU pourra entraîner :\n• La suspension ou suppression immédiate de votre compte\n• Des poursuites civiles et/ou pénales conformément au droit français\n• Une demande de dommages et intérêts pour préjudice subi\n• Un signalement aux autorités compétentes si nécessaire\n\nEn cas de litige, la juridiction compétente est celle du tribunal de grande instance de Paris, conformément à la loi française.",
    contact: "legal@zigalink.fr",
  };

  const d = doc || defaultDoc;

  const Section = ({ icon: Icon, title, content, color = "teal" }) => {
    const colors = {
      teal: { bg: "bg-teal-50", border: "border-teal-100", icon: "text-teal-600", title: "text-teal-800" },
      green: { bg: "bg-green-50", border: "border-green-100", icon: "text-green-600", title: "text-green-800" },
      red: { bg: "bg-red-50", border: "border-red-100", icon: "text-red-600", title: "text-red-800" },
      amber: { bg: "bg-amber-50", border: "border-amber-100", icon: "text-amber-600", title: "text-amber-800" },
    };
    const c = colors[color];
    return (
      <div className={`rounded-2xl border p-5 ${c.bg} ${c.border}`}>
        <div className="flex items-center gap-2 mb-3">
          <Icon className={`w-5 h-5 ${c.icon}`} />
          <h2 className={`font-bold text-sm ${c.title}`}>{title}</h2>
        </div>
        <div className="text-sm text-stone-700 whitespace-pre-line leading-relaxed">{content}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-28">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 to-emerald-700 px-6 pt-10 pb-12 text-white">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black">Conditions d'utilisation</h1>
              <p className="text-teal-200 text-xs">ZIGA LINK — Version {d.version}</p>
            </div>
          </div>
          <p className="text-teal-100 text-xs">
            En vigueur depuis le {new Date(d.effective_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 relative z-10 space-y-4">
        {/* Intro */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <p className="text-sm text-stone-600 leading-relaxed">{d.intro}</p>
        </div>

        <Section icon={Shield} title="🔐 Licence d'usage" content={d.license} color="teal" />
        <Section icon={CheckCircle} title="✅ Ce que vous pouvez faire" content={d.allowed} color="green" />
        <Section icon={XCircle} title="🚫 Ce que vous ne pouvez pas faire" content={d.forbidden} color="red" />
        <Section icon={AlertTriangle} title="⚖️ Recours légaux en cas de violation" content={d.legal_recourse} color="amber" />

        {/* Contact */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-stone-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-700">Contact légal</p>
            <a href={`mailto:${d.contact}`} className="text-sm text-teal-600 font-medium">{d.contact}</a>
          </div>
        </div>

        <p className="text-center text-xs text-stone-400 pb-4">
          Ces conditions peuvent être mises à jour. Vous serez informé en cas de changement majeur.
        </p>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1">
            <Lock className="w-4 h-4 text-teal-500 flex-shrink-0" />
            <Link to={createPageUrl("PolitiqueConfidentialite")} className="text-sm text-teal-600 font-medium hover:underline">
              Politique de confidentialité →
            </Link>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <Scale className="w-4 h-4 text-teal-500 flex-shrink-0" />
            <Link to={createPageUrl("MentionsLegales")} className="text-sm text-teal-600 font-medium hover:underline">
              Mentions légales →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}