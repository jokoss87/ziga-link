// Badge compact à afficher à côté du pseudo si l'utilisateur est soutien_actif
// Usage : <SupportBadge userEmail="..." badgeText="Soutien 🐾" />
import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

// Cache simple en mémoire pour éviter les requêtes répétées
const supportCache = {};

export default function SupportBadge({ userEmail, badgeText }) {
  const [isSupporter, setIsSupporter] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!userEmail || fetchedRef.current) return;
    if (supportCache[userEmail] !== undefined) {
      setIsSupporter(supportCache[userEmail]);
      return;
    }
    fetchedRef.current = true;
    base44.entities.UserSupport.filter({ user_email: userEmail }).then(res => {
      const val = res[0]?.status === "soutien_actif";
      supportCache[userEmail] = val;
      setIsSupporter(val);
    }).catch(() => {});
  }, [userEmail]);

  if (!isSupporter) return null;

  return (
    <span className="inline-flex items-center bg-teal-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1 flex-shrink-0">
      {badgeText || "🐾 Soutien"}
    </span>
  );
}