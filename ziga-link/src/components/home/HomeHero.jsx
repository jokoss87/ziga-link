import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/lib/routes";
import NotificationBell from "@/components/notifications/NotificationBell";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { STATUS_CONFIG } from "@/components/profile/UserStatusBadge";
import { CAT } from "@/components/lib/categoryColors";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function getMotivationalMessage(announcementsCount, activitiesCount) {
  if (announcementsCount >= 3) return `🔥 ${announcementsCount} chiens disponibles près de vous aujourd'hui`;
  if (announcementsCount === 2) return `🐾 2 chiens cherchent un compagnon maintenant`;
  if (announcementsCount === 1) return `🐾 1 chien disponible près de vous`;
  if (activitiesCount > 0) return `🏃 ${activitiesCount} activité${activitiesCount > 1 ? "s" : ""} ouverte${activitiesCount > 1 ? "s" : ""} cette semaine`;
  return "🌿 Soyez le premier à proposez une sortie !";
}

const PROPOSE_OPTIONS = [
  { label: "🐾 Proposez une balade",  desc: "Sortie libre avec un autre chien", page: ROUTES.createAnnouncement, color: `${CAT.balade.bg} ${CAT.balade.border}`,         iconBg: CAT.balade.iconBg,       textColor: CAT.balade.text },
  { label: "🏃 Activités sportives", desc: "Canicross, agility, frisbee...",    page: ROUTES.sport,              color: `${CAT.sport.bg} ${CAT.sport.border}`,           iconBg: CAT.sport.iconBg,         textColor: CAT.sport.text },
  { label: "🏋️ Obéissance",          desc: "Séances de travail et dressage",   page: ROUTES.dressage,           color: `${CAT.obeissance.bg} ${CAT.obeissance.border}`, iconBg: CAT.obeissance.iconBg,   textColor: CAT.obeissance.text },
];

export default function HomeHero({ displayName, profile, announcementsCount, activitiesCount, userEmail }) {
  const [time, setTime] = useState(new Date());
  const [showPropose, setShowPropose] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const greeting = getGreeting();
  const message = getMotivationalMessage(announcementsCount, activitiesCount);
  const day = time.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="text-stone-50 relative overflow-hidden" style={{ backgroundImage: "url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699797b556ee6b9c51a26f9f/d43148122_banniere.png')", backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="absolute inset-0 bg-black/40" />

      <div className="mx-auto pt-10 pb-6 px-5 relative max-w-2xl z-10">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <Link to={ROUTES.journalVie} className="flex items-center gap-3 active:opacity-80">
            {profile?.photo_url ? (
              <div className="relative">
                <img src={profile.photo_url} alt="profil" className="w-10 h-10 rounded-2xl object-cover border-2 border-white/20" />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ backgroundColor: STATUS_CONFIG[profile?.user_status]?.dot || "#4CAF87" }} />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl border border-white/15" style={{ background: "rgba(76,175,135,0.2)" }}>🐾</div>
            )}
<div>
              <p className="text-white/50 text-xs font-medium capitalize">{day}</p>
              <p className="text-white font-bold text-base leading-tight">{greeting}, {displayName} 👋</p>
              <p className="text-white/50 font-bold text-base leading-tight">📓 Journal de vie</p>
            </div>
          </Link>
          <NotificationBell userEmail={userEmail} dark={false} />
        </div>

        {/* Live status pill — cliquable vers section balades */}
        <div
          className="bg-transparent mb-4 px-3 py-1.5 rounded-full inline-flex items-center gap-2 border border-white/10 cursor-pointer active:opacity-70 transition-opacity"
          style={{ background: "rgba(76,175,135,0.15)" }}
          onClick={() => {
            const el = document.getElementById("balade-du-jour");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4CAF87] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4CAF87]" />
          </span>
          <p className="text-white/90 text-xs font-semibold">{message} →</p>
        </div>

        {/* CTA buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setShowPropose(true)}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-white transition-all active:scale-95 shadow-lg"
            style={{ background: "linear-gradient(135deg, #FF7A59, #e8634a)" }}>
           🐾 Proposez une activité
          </button>
          <Link
            to={ROUTES.matching}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-lg"
            style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)", color: "white" }}>
            ❤️ Trouvez un match
          </Link>
        </div>
      </div>

      {/* Drawer simple - choix activité */}
      <Drawer open={showPropose} onOpenChange={setShowPropose}>
        <DrawerContent>
          <DrawerHeader className="border-b border-stone-100 pb-3">
            <DrawerTitle className="text-base font-black text-stone-800 text-left">Que voulez-vous proposer ?</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-2 pb-8">
            {PROPOSE_OPTIONS.map(({ label, desc, page, color, iconBg, textColor }) => (
              <Link
                key={page}
                to={page}
                onClick={() => setShowPropose(false)}
                className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-colors border ${color}`}
              >
                <div className={`text-2xl w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                  {label.split(" ")[0]}
                </div>
                <div className="flex-1">
                  <div className={`font-bold text-sm ${textColor}`}>{label.split(" ").slice(1).join(" ")}</div>
                  <div className="text-xs text-stone-400 mt-0.5">{desc}</div>
                </div>
                <div className="text-stone-300 text-lg">›</div>
              </Link>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}