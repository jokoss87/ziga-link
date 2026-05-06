import { useState, useEffect } from "react";
import { APP_NAME, APP_SUPPORT_TEXT } from "@/lib/brand";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Heart, CheckCircle, ChevronRight } from "lucide-react";
import { useSupportConfig } from "@/components/lib/SupportConfigContext";

const BRAND_GRADIENT = "linear-gradient(135deg, #FF7A59, #e8634a)";

export default function ProfilSupportSection({ userEmail }) {
  const { supportConfig: config } = useSupportConfig();
  const [mySupport, setMySupport] = useState(null);
  const [activeCount, setActiveCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userEmail) return;
    load();
  }, [userEmail]);

  const load = async () => {
    const [myS, actifs] = await Promise.all([
      base44.entities.UserSupport.filter({ user_email: userEmail }),
      base44.entities.UserSupport.filter({ status: "soutien_actif" }),
    ]);
    setMySupport(myS[0] || null);
    setActiveCount(actifs.length);
    setLoaded(true);
  };

  if (!loaded) return null;

  const isSupporter = mySupport?.status === "soutien_actif";
  const isExpired = mySupport?.status === "soutien_expire";

  const renderExpireMessage = () => {
    if (!mySupport?.expires_at) return <span className="text-xs text-stone-400">Expiré</span>;
    const expiresDate = new Date(mySupport.expires_at);
    const formatted = expiresDate.toLocaleDateString("fr-FR");
    const isFuture = expiresDate > new Date();
    if (isFuture) {
      return <span className="text-xs text-teal-600 font-medium">🐾 Votre soutien reste actif jusqu'au {formatted}</span>;
    }
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs text-stone-400">Votre soutien a expiré le {formatted}</span>
        <Link to={createPageUrl("SupportPage")} className="text-xs text-teal-600 font-semibold hover:underline w-fit">
          Redevenir soutien →
        </Link>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden mb-4">
      {isExpired ? (
        <div className="flex items-center gap-4 p-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-stone-400 bg-stone-100 flex-shrink-0 text-lg">🐾</div>
          <div className="flex-1">
            <div className="font-semibold text-stone-500 text-sm mb-0.5">Soutien {APP_NAME}</div>
            {renderExpireMessage()}
          </div>
        </div>
      ) : isSupporter ? (
        <Link to={createPageUrl("SupportPage")} className="flex items-center gap-4 p-4 hover:bg-stone-50 transition-colors">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background: BRAND_GRADIENT }}>
            🐾
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-700 text-sm">{config?.text_badge || "Soutien Ziga Link 🐾"}</span>
              <CheckCircle className="w-4 h-4 text-teal-500" />
            </div>
            <div className="text-xs text-stone-400">
              {mySupport.amount}€{mySupport.is_monthly ? "/mois" : " unique"} · depuis {mySupport.started_at ? new Date(mySupport.started_at).toLocaleDateString("fr-FR") : "—"}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-300" />
        </Link>
      ) : !isExpired && (
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-2xl">🐾</div>
            <div className="flex-1">
              <p className="font-bold text-stone-700 text-sm">{config?.text_profile_title || `Soutenir ${APP_NAME}`}</p>
              <p className="text-xs text-stone-400">{activeCount} soutien{activeCount !== 1 ? "s" : ""} actif{activeCount !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <p className="text-xs text-stone-500 mb-3 leading-relaxed">
            {config?.text_profile_body || APP_SUPPORT_TEXT}
          </p>
          <Link
            to={createPageUrl("SupportPage")}
            className="w-full py-2.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2"
            style={{ background: BRAND_GRADIENT }}
          >
            <Heart className="w-4 h-4" />
            {config?.text_profile_cta || "Soutenir maintenant"}
          </Link>
        </div>
      )}
    </div>
  );
}