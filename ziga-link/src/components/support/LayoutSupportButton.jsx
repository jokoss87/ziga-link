import { useEffect, useRef } from "react";
import { APP_NAME } from "@/lib/brand";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function LayoutSupportButton({ userEmail, supportData, onClose }) {
  const prevStatusRef = useRef(null);

  useEffect(() => {
    if (supportData === undefined) return;
    const newStatus = supportData?.status || null;
    if (newStatus === "soutien_actif" && prevStatusRef.current !== "soutien_actif" && prevStatusRef.current !== null) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.4 }, colors: ["#F5C518", "#d4a017", "#FF7A59", "#4CAF87"] });
      const label = supportData?.is_monthly ? "Créateur" : "Ambassadeur";
      toast.success(`🐾 Merci ! Vous êtes maintenant ${label} ${APP_NAME} 🎉`, { duration: 5000 });
    }
    prevStatusRef.current = newStatus;
  }, [supportData]);

  if (supportData === undefined) return <div className="h-9 rounded-2xl bg-stone-100 animate-pulse w-full" />;

  const isActive = supportData?.status === "soutien_actif";
  const isMonthly = supportData?.is_monthly;

  if (isActive && isMonthly) {
    return (
      <Link
        to={createPageUrl("SupportPage")}
        onClick={onClose}
        className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-2xl font-black text-sm text-white transition-all shadow-sm"
        style={{ background: "linear-gradient(135deg, #F5C518, #d4a017)" }}
      >
        ⭐ Créateur {APP_NAME}
      </Link>
    );
  }

  if (isActive && !isMonthly) {
    return (
      <Link
        to={createPageUrl("SupportPage")}
        onClick={onClose}
        className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-2xl font-black text-sm text-white transition-all shadow-sm"
        style={{ background: "linear-gradient(135deg, #F5C518, #d4a017)" }}
      >
        🏅 Ambassadeur {APP_NAME}
      </Link>
    );
  }

  return (
    <Link
      to={createPageUrl("SupportPage")}
      onClick={onClose}
      className="flex flex-col items-center justify-center w-full py-2 px-4 rounded-2xl font-black text-sm text-white transition-all shadow-sm hover:opacity-90 text-center"
      style={{ background: "linear-gradient(135deg, #FF7A59, #e8634a)" }}
    >
      <span>🐾 Je contribue — Ambassadeur / Créateur</span>
      <span>{APP_NAME}</span>
    </Link>
  );
}