import { useState, useEffect } from "react";
import { APP_NAME, APP_EMOJI, APP_SUPPORT_TEXT } from "@/lib/brand";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { useSupportConfig } from "@/components/lib/SupportConfigContext";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Heart, X } from "lucide-react";

const LS_KEY = "zigalink_support_shown";
const BRAND_GRADIENT = "linear-gradient(135deg, #4CAF87, #3d9e78)";

export default function PostWalkSupportCard({ onClose }) {
  const { user } = useUserProfile();
  const { supportConfig } = useSupportConfig();
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (user?.email) check();
  }, [user?.email]);

  const check = async () => {
    if (!user?.email) return;

    const [supports] = await Promise.all([
      base44.entities.UserSupport.filter({ user_email: user.email }),
    ]);
    const cfg = supportConfig;

    setChecked(true);

    if (!cfg) return;
    if (supports[0]?.status === "soutien_actif") return;

    const lastShown = localStorage.getItem(LS_KEY);
    if (lastShown) {
      const delayDays = cfg.text_post_walk_delay_days ?? 7;
      const diff = (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60 * 24);
      if (diff < delayDays) return;
    }

    setConfig(cfg);
    setVisible(true);
    localStorage.setItem(LS_KEY, String(Date.now()));
  };

  const handleClose = () => {
    setVisible(false);
    // Délai avant d'appeler onClose pour que l'utilisateur voit la fermeture
    setTimeout(() => onClose?.(), 300);
  };

  const handleCTA = () => {
    setVisible(false);
    setTimeout(() => {
      onClose?.();
      navigate(createPageUrl("SupportPage"));
    }, 300);
  };

  // Ne pas appeler onClose automatiquement si non visible après check
  // Le parent ne doit pas être notifié tant que l'utilisateur n'a pas agi
  if (!checked) return null;
  if (!visible || !config) return null;

  return (
    <div className="fixed inset-x-4 z-[100] max-w-md mx-auto"
      style={{ bottom: "calc(5rem + env(safe-area-inset-bottom, 16px))" }}>
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-100 overflow-hidden">
        <div className="p-1.5 text-center text-white text-xs font-bold"
          style={{ background: BRAND_GRADIENT }}>
          {APP_EMOJI} {APP_NAME} — Application communautaire gratuite
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-black text-stone-800 text-base leading-snug pr-4">
              {config.text_post_walk_title || "Vous avez aimé cette balade ?"}
            </h3>
            <button
              onClick={handleClose}
              className="p-1 rounded-full hover:bg-stone-100 flex-shrink-0 transition-colors">
              <X className="w-4 h-4 text-stone-400" />
            </button>
          </div>
          <p className="text-sm text-stone-500 leading-relaxed mb-4">
            {config.text_post_walk_body || APP_SUPPORT_TEXT}
          </p>
          <button
            onClick={handleCTA}
            className="w-full py-3 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2"
            style={{ background: BRAND_GRADIENT }}>
            <Heart className="w-4 h-4" />
            {config.text_post_walk_cta || `Soutenir ${APP_NAME} ${APP_EMOJI}`}
          </button>
          <button
            onClick={handleClose}
            className="w-full text-center text-xs text-stone-400 mt-2 py-1 hover:text-stone-600 transition-colors">
            Non merci
          </button>
        </div>
      </div>
    </div>
  );
}