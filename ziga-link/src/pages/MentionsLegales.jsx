import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Scale, Building2, Server, Copyright, Lock, Cookie, AlertTriangle, Globe, Mail, FileText } from "lucide-react";

const Section = ({ icon: Icon, title, children, color = "teal" }) => {
  const colors = {
    teal:   { bg: "bg-teal-50",   border: "border-teal-100",   icon: "text-teal-600",   title: "text-teal-800" },
    green:  { bg: "bg-green-50",  border: "border-green-100",  icon: "text-green-600",  title: "text-green-800" },
    blue:   { bg: "bg-blue-50",   border: "border-blue-100",   icon: "text-blue-600",   title: "text-blue-800" },
    amber:  { bg: "bg-amber-50",  border: "border-amber-100",  icon: "text-amber-600",  title: "text-amber-800" },
    purple: { bg: "bg-purple-50", border: "border-purple-100", icon: "text-purple-600", title: "text-purple-800" },
    rose:   { bg: "bg-rose-50",   border: "border-rose-100",   icon: "text-rose-600",   title: "text-rose-800" },
  };
  const c = colors[color] || colors.teal;
  return (
    <div className={`rounded-2xl border p-5 ${c.bg} ${c.border}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-5 h-5 ${c.icon}`} />
        <h2 className={`font-bold text-sm ${c.title}`}>{title}</h2>
      </div>
      <div className="text-sm text-stone-700 leading-relaxed">{children}</div>
    </div>
  );
};

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-stone-50 pb-28">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 to-emerald-700 px-6 pt-10 pb-12 text-white">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black">Mentions légales</h1>
              <p className="text-teal-200 text-xs">Ziga Link — Informations légales</p>
            </div>
          </div>
          <p className="text-teal-100 text-xs">Conformément à la loi française n°2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN)</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 relative z-10 space-y-4">

        {/* Section 1 */}
        <Section icon={Building2} title="1. Éditeur de l'application" color="teal">
          <p className="whitespace-pre-line">{`Nom : Ziga Link\nEmail : contact@zigalink.fr\nDirecteur de publication : [à compléter par l'admin]`}</p>
        </Section>

        {/* Section 2 */}
        <Section icon={Server} title="2. Hébergeur" color="blue">
          <p className="whitespace-pre-line">{`Base44 / Wix Inc.\n500 Terry Francois Blvd\nSan Francisco, CA 94158 — États-Unis`}</p>
          <a href="https://www.base44.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-blue-600 font-medium hover:underline">
            <Globe className="w-3.5 h-3.5" /> www.base44.com
          </a>
        </Section>

        {/* Section 3 */}
        <Section icon={Copyright} title="3. Propriété intellectuelle" color="purple">
          L'ensemble du contenu de l'application Ziga Link (textes, logos, design, code source, fonctionnalités) est protégé par le droit d'auteur. Toute reproduction, distribution ou utilisation sans autorisation écrite préalable est interdite.
        </Section>

        {/* Section 4 */}
        <Section icon={Lock} title="4. Données personnelles" color="green">
          <p>Le traitement des données personnelles est décrit dans notre Politique de confidentialité. Conformément au RGPD, vous disposez de droits sur vos données.</p>
          <p className="mt-2">Contact : <a href="mailto:contact@zigalink.fr" className="text-teal-600 font-medium hover:underline">contact@zigalink.fr</a></p>
          <Link
            to={createPageUrl("PolitiqueConfidentialite")}
            className="inline-flex items-center gap-1.5 mt-3 text-teal-600 font-semibold hover:underline text-sm"
          >
            <FileText className="w-4 h-4" /> Voir notre Politique de confidentialité →
          </Link>
        </Section>

        {/* Section 5 */}
        <Section icon={Cookie} title="5. Cookies" color="amber">
          L'application utilise uniquement des cookies techniques nécessaires au fonctionnement (session utilisateur). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.
        </Section>

        {/* Section 6 */}
        <Section icon={AlertTriangle} title="6. Responsabilité" color="rose">
          <p>Ziga Link est une plateforme de mise en relation entre particuliers. Ziga Link ne peut être tenu responsable des interactions entre utilisateurs, des incidents lors des rencontres, ou du comportement des animaux.</p>
          <p className="mt-2">Chaque utilisateur est responsable de son chien conformément à la loi française.</p>
        </Section>

        {/* Section 7 */}
        <Section icon={Scale} title="7. Droit applicable" color="teal">
          Les présentes mentions légales sont soumises au droit français. En cas de litige, la juridiction compétente est le tribunal du lieu de résidence du défendeur, conformément au Code de procédure civile français.
        </Section>

        {/* Contact */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-stone-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-700">Contact légal</p>
            <a href="mailto:contact@zigalink.fr" className="text-sm text-teal-600 font-medium">contact@zigalink.fr</a>
          </div>
        </div>

        <p className="text-center text-xs text-stone-400 pb-4">
          Dernière mise à jour : mai 2026
        </p>
      </div>
    </div>
  );
}