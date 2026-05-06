import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Lock, User, Database, Target, Scale, Clock, Server, Shield, MapPin, Baby, Bell, Mail, FileText } from "lucide-react";

const Section = ({ icon: Icon, title, content, color = "teal" }) => {
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
      <div className="text-sm text-stone-700 whitespace-pre-line leading-relaxed">{content}</div>
    </div>
  );
};

export default function PolitiqueConfidentialite() {
  return (
    <div className="min-h-screen bg-stone-50 pb-28">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 to-emerald-700 px-6 pt-10 pb-12 text-white">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black">Politique de confidentialité</h1>
              <p className="text-teal-200 text-xs">Ziga Link — Protection de vos données</p>
            </div>
          </div>
          <p className="text-teal-100 text-xs">Conforme au Règlement Général sur la Protection des Données (RGPD)</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 relative z-10 space-y-4">

        {/* Section 1 */}
        <Section
          icon={User}
          title="1. Responsable du traitement"
          color="teal"
          content={`Ziga Link est responsable du traitement de vos données personnelles.\n\nContact : contact@zigalink.fr\n\nPour toute question relative à vos données, vous pouvez nous écrire à cette adresse. Nous nous engageons à vous répondre dans un délai de 30 jours ouvrés.`}
        />

        {/* Section 2 */}
        <Section
          icon={Database}
          title="2. Données collectées"
          color="blue"
          content={`Nous collectons les données suivantes lors de votre utilisation de l'application :\n\n• Identité : email, prénom, photo de profil\n• Localisation : ville, coordonnées GPS approximatives (~1 km)\n• Profil canin : photos du chien, race, âge, comportement, niveau d'obéissance\n• Activités : annonces de balades, participations à des activités sportives\n• Communication : messages privés et conversations de groupe\n• Progression : données d'activité, sessions d'entraînement, badges obtenus`}
        />

        {/* Section 3 */}
        <Section
          icon={Target}
          title="3. Finalité des traitements"
          color="green"
          content={`Vos données sont traitées exclusivement pour les finalités suivantes :\n\n✔ Mise en relation entre propriétaires de chiens à proximité\n✔ Matching canin par zone géographique et compatibilité comportementale\n✔ Organisation de balades et activités sportives canines\n✔ Messagerie communautaire entre membres\n✔ Suivi de progression canine et journal de vie\n✔ Amélioration de l'expérience utilisateur`}
        />

        {/* Section 4 */}
        <Section
          icon={Scale}
          title="4. Base légale"
          color="purple"
          content={`Le traitement de vos données repose sur votre consentement explicite, recueilli lors de votre inscription à l'application (art. 6.1.a du RGPD).\n\nVous pouvez retirer ce consentement à tout moment en supprimant votre compte depuis Profil → Supprimer mon compte, ou en nous contactant à contact@zigalink.fr.`}
        />

        {/* Section 5 */}
        <Section
          icon={Clock}
          title="5. Durée de conservation"
          color="amber"
          content={`• Données conservées pendant toute la durée de votre compte actif\n• Supprimées dans les 30 jours suivant la suppression du compte\n• Les messages échangés sont supprimés immédiatement sur demande\n• Les données de progression et d'activité sont supprimées avec le compte\n\nVous pouvez supprimer votre compte à tout moment depuis la page Profil.`}
        />

        {/* Section 6 */}
        <Section
          icon={Server}
          title="6. Hébergeur"
          color="teal"
          content={`Base44 / Wix Inc.\n500 Terry Francois Blvd\nSan Francisco, CA 94158 — États-Unis\n\nVos données sont stockées sur des serveurs sécurisés avec :\n• Chiffrement en transit via HTTPS (TLS 1.3)\n• Accès restreint et contrôlé\n• Sauvegardes régulières`}
        />

        {/* Section 7 */}
        <Section
          icon={Shield}
          title="7. Vos droits (RGPD)"
          color="green"
          content={`Conformément au RGPD, vous disposez des droits suivants :\n\n• Droit d'accès à vos données personnelles\n• Droit de rectification en cas d'inexactitude\n• Droit à l'effacement (disponible via Profil → Supprimer mon compte)\n• Droit à la portabilité de vos données\n• Droit d'opposition au traitement\n\nPour exercer vos droits : contact@zigalink.fr — réponse sous 30 jours.\n\nVous pouvez également déposer une réclamation auprès de la CNIL : www.cnil.fr`}
        />

        {/* Section 8 */}
        <Section
          icon={MapPin}
          title="8. Localisation et vie privée"
          color="blue"
          content={`Votre localisation GPS est approximée à environ 1 km pour protéger votre vie privée. Les autres membres ne voient jamais votre position exacte.\n\nLa localisation précise d'un point de rendez-vous n'est partagée qu'après :\n• Acceptation mutuelle d'une demande de balade ou d'activité\n• Confirmation explicite des deux parties\n\nVous pouvez désactiver la localisation à tout moment depuis les paramètres de votre appareil.`}
        />

        {/* Section 9 */}
        <Section
          icon={Baby}
          title="9. Mineurs"
          color="rose"
          content={`L'application Ziga Link est réservée aux personnes âgées de 13 ans et plus.\n\nLes utilisateurs de 13 à 15 ans doivent avoir obtenu l'accord explicite d'un parent ou tuteur légal avant de s'inscrire.\n\nSi vous constatez qu'un mineur de moins de 13 ans utilise l'application, merci de nous le signaler à contact@zigalink.fr.`}
        />

        {/* Section 10 */}
        <Section
          icon={Bell}
          title="10. Modifications de la politique"
          color="amber"
          content={`Toute modification substantielle de cette politique de confidentialité sera notifiée :\n\n• Par email à l'adresse associée à votre compte\n• Par notification dans l'application\n\nNous vous invitons à consulter régulièrement cette page. La date de dernière mise à jour sera toujours indiquée en bas de page.`}
        />

        {/* Contact */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-stone-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-700">Contact données personnelles</p>
            <a href="mailto:contact@zigalink.fr" className="text-sm text-teal-600 font-medium">contact@zigalink.fr</a>
          </div>
        </div>

        {/* Lien CGU */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 flex items-center gap-3">
          <FileText className="w-4 h-4 text-teal-500 flex-shrink-0" />
          <Link to={createPageUrl("CGU")} className="text-sm text-teal-600 font-medium hover:underline">
            Voir aussi nos Conditions Générales d'Utilisation →
          </Link>
        </div>

        <p className="text-center text-xs text-stone-400 pb-4">
          Dernière mise à jour : mai 2026
        </p>
      </div>
    </div>
  );
}