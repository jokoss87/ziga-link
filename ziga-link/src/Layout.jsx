import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Home, Plus, MessageCircle, Menu, X, Shield, ChevronRight, Heart } from "lucide-react";
import { KeyboardHeightProvider } from "@/components/hooks/useKeyboardHeight.jsx";
import { PseudoCacheProvider } from "@/components/lib/PseudoCacheContext";
import BugReportButton from "@/components/bugs/BugReportButton";
import ErrorBoundary from "@/components/ErrorBoundary";
import MonitoringBoundary from "@/components/MonitoringBoundary";
import useSessionTracker from "@/components/useSessionTracker";
import LocationProvider from "@/components/location/LocationProvider";
import { getLevelInfo, computeXP } from "@/components/badges/BadgeSystem";
import { getUserLevelCache, setUserLevelCache } from "@/components/lib/userLevelCache";
import LayoutSupportButton from "@/components/support/LayoutSupportButton";
import { FeatureFlagsProvider } from "@/components/lib/FeatureFlagsContext";
import { STATUS_CONFIG } from "@/components/profile/UserStatusBadge";
import { useUserProfileContext } from "@/components/lib/UserProfileContext";
import { APP_NAME, APP_EMOJI, APP_URL, APP_SHARE_TEXT } from "@/lib/brand";

const menuPages = [
{ name: "Profil", label: "Mon profil", emoji: "👤", desc: "Voir et modifier mon profil" },
{ name: "MyDogs", label: "Mes chiens", emoji: "🐕", desc: "Gérez vos profils canins" },
{ name: "Friends", label: "Mes amis", emoji: "🤝", desc: "Gérez vos amis canins" },
{ name: "SportsCanins", label: "Sports Canins", emoji: "🏅", desc: "Toutes les disciplines" },
{ name: "Feedback", label: "Donner mon avis", emoji: "💬", desc: "Votre retour compte !" },
{ name: "Regles", label: "Règles communautaires", emoji: "📋", desc: "Charte de confiance" }];


export default function Layout({ children, currentPageName }) {
  const { user, profile: userProfile, updateStatus } = useUserProfileContext();
  const [userSupport, setUserSupport] = useState(undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Tab navigation — preserve scroll per tab, only close menu on route change
  const MAIN_TABS = ["Home", "Social", "Messages"];
  const isMainTab = MAIN_TABS.includes(currentPageName);

  useEffect(() => {
    setMenuOpen(false);
    // Only reset scroll for non-tab pages (detail pages, modals, etc.)
    if (!isMainTab) {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [levelInfo, setLevelInfo] = useState(null);
  const [weekSessions, setWeekSessions] = useState(0);

  const currentUserEmail = user?.email;

  useSessionTracker(currentPageName, currentUserEmail);

  const handleStatusChange = (status) => updateStatus(status);

  // Charger XP/niveau avec cache localStorage
  useEffect(() => {
    if (!currentUserEmail) return;
    loadUnreadMessages(currentUserEmail);
    loadUnreadNotifs(currentUserEmail);

    // Charger userSupport indépendamment du cache niveau
    base44.entities.UserSupport.filter({ user_email: currentUserEmail })
      .then(res => setUserSupport(res[0] || null))
      .catch(() => setUserSupport(null));

    try {
      const cached = getUserLevelCache(currentUserEmail);
      if (cached) {
        setLevelInfo(cached.levelInfo);
        setWeekSessions(cached.weekSessions);
        return;
      }
    } catch (_) {}

    Promise.all([
    base44.entities.ProgressEntry.filter({ created_by: currentUserEmail }, "-created_date", 50),
    base44.entities.DogProfile.filter({ created_by: currentUserEmail }),
    base44.entities.MeetupAnnouncement.filter({ created_by: currentUserEmail }, "-created_date", 20),
    base44.entities.Activity.filter({ created_by: currentUserEmail }, "-created_date", 10)]
    ).then(([sessions, dogs, announcements, activities]) => {
      const statsData = {
        sessions: sessions.length,
        totalMinutes: sessions.reduce((s, e) => s + (e.duration_minutes || 0), 0),
        sessionTypes: new Set(sessions.map((e) => e.session_type)).size,
        meetups: announcements.filter((a) => a.status === "completed").length,
        dogs: dogs.length,
        activitiesOrganized: activities.length,
        activitiesJoined: 0,
        profileComplete: !!(userProfile?.pseudo && userProfile?.city && userProfile?.experience_level)
      };
      const li = getLevelInfo(computeXP(statsData));
      const weekAgo = new Date();weekAgo.setDate(weekAgo.getDate() - 7);
      const ws = sessions.filter((s) => new Date(s.created_date) > weekAgo).length;
      setLevelInfo(li);
      setWeekSessions(ws);
      setUserLevelCache(currentUserEmail, { profile: userProfile, levelInfo: li, weekSessions: ws });
    }).catch(() => {});
  }, [currentUserEmail]);

  const loadUnreadNotifs = async (email) => {
    // Délai aléatoire pour éviter les appels simultanés avec NotificationBell
    await new Promise((r) => setTimeout(r, 2000));
    const notifs = await base44.entities.Notification.filter({ user_email: email, is_read: false }, "-created_date", 20).catch(() => []);
    setUnreadNotifs(notifs.length);
  };

  const loadUnreadMessages = async (email) => {
    // Filtre direct sur les membres pour éviter de charger toutes les conversations
    const mine = await base44.entities.Conversation.filter({ members: email }, "-last_message_at", 50).catch(() => []);
    const total = mine.reduce((acc, c) => acc + (c.unread_counts?.[email] || 0), 0);
    setUnreadMessages(total);
  };

  useEffect(() => {
    if (!currentUserEmail) return;
    const unsub = base44.entities.Conversation.subscribe(() => {
      loadUnreadMessages(currentUserEmail);
    });
    return unsub;
  }, [currentUserEmail]);

  useEffect(() => {
    if (!currentUserEmail) return;
    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.type === "create" && event.data?.user_email === currentUserEmail && !event.data?.is_read) {
        setUnreadNotifs((prev) => prev + 1);
      } else if (event.type === "update" && event.data?.user_email === currentUserEmail) {
        // Recompte après lecture
        loadUnreadNotifs(currentUserEmail);
      }
    });
    return unsub;
  }, [currentUserEmail]);

  useEffect(() => {
    const onFocusIn = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) {
        setKeyboardOpen(true);
        setTimeout(() => {
          e.target.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 600);
      }
    };
    const onFocusOut = () => setKeyboardOpen(false);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);



  const hideBottomNav = ["Chat", "GroupChat", "CarteFullscreen"].includes(currentPageName);
  const isMenuPage = menuPages.some((p) => p.name === currentPageName);

  return (
    <FeatureFlagsProvider zoneTag={userProfile?.zoneTag}>
    <PseudoCacheProvider>
    <KeyboardHeightProvider>
    <LocationProvider>
    <div className="min-h-screen bg-stone-50">
      <style>{`
        body { background-color: #f5f6f4; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        .leaflet-container { z-index: 1; }
      `}</style>

      <div
        key={currentPageName}
        className="overflow-y-auto"
        style={{ ...(hideBottomNav ? {} : { paddingBottom: "var(--nav-height, 80px)" }), WebkitOverflowScrolling: "touch" }}
      >
        <MonitoringBoundary>
          <ErrorBoundary key={currentPageName}>
            {children}
          </ErrorBoundary>
        </MonitoringBoundary>
      </div>

      <BugReportButton
                currentPageName={currentPageName}
                userEmail={currentUserEmail}
                userId={currentUserEmail} />


      {!hideBottomNav &&
              <>
          {menuOpen &&
                <div className="fixed inset-0 z-50 flex flex-col justify-end">
              <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
              <div className="relative bg-white rounded-t-3xl z-10 max-h-[80vh] overflow-y-auto">
                {/* Header menu avec profil + XP */}
                <div className="px-5 pt-5 pb-4 border-b border-stone-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1 mr-2">
                      <LayoutSupportButton userEmail={currentUserEmail} supportData={userSupport} onClose={() => setMenuOpen(false)} />
                    </div>
                    

                        
                  </div>
                  {/* Bouton Partager */}
                  <button
                    onClick={async () => {
                      try {
                        if (navigator.share) {
                          await navigator.share({ title: `${APP_NAME} ${APP_EMOJI}`, text: APP_SHARE_TEXT, url: APP_URL });
                        } else {
                          await navigator.clipboard.writeText(APP_URL);
                          alert("Lien copié ! Partage-le à tes amis 🐾");
                        }
                      } catch (e) { console.warn("Partage annulé", e); }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 mb-3 rounded-2xl text-white font-bold text-[clamp(11px,3vw,14px)] transition-all active:scale-95"
                    style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
                  >
                    {APP_EMOJI} Partager {APP_NAME}
                  </button>
                  {/* Sélecteur de statut */}
                  {userProfile &&
                      <div className="mb-3">
                      <p className="text-xs text-stone-400 font-medium mb-2">Mon statut</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) =>
                          <button
                            key={key}
                            onClick={() => handleStatusChange(key)}
                            disabled={false}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                            userProfile.user_status === key ?
                            `${cfg.color} shadow-sm scale-105` :
                            "bg-white border-stone-200 text-stone-400 hover:border-stone-300"}`
                            }>
                            
                            <span>{cfg.emoji}</span>
                            <span>{cfg.label}</span>
                          </button>
                          )}
                      </div>
                    </div>
                      }
                  {/* Widget utilisateur */}
                  {levelInfo &&
                      <Link
                        to={createPageUrl("JournalVie")}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-4 py-3">
                        
                      {userProfile?.photo_url ?
                        <img src={userProfile.photo_url} alt="profil" className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-amber-300" /> :

                        <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center text-lg flex-shrink-0">{levelInfo.emoji}</div>
                        }
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-stone-800">{levelInfo.label}</span>
                          <span className="text-xs text-amber-600 font-semibold">{levelInfo.xp} XP</span>
                        </div>
                        <div className="w-full h-1.5 bg-amber-100 rounded-full mt-1.5 overflow-hidden">
                          <div className="h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${levelInfo.progress}%` }} />
                        </div>
                        {levelInfo.next &&
                          <p className="text-[10px] text-stone-400 mt-0.5">Prochain : {levelInfo.next.emoji} {levelInfo.next.label}</p>
                          }
                      </div>
                      {weekSessions > 0 &&
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-black text-amber-500">{weekSessions}</div>
                          <div className="text-[10px] text-stone-400 leading-tight">sessions<br />semaine</div>
                        </div>
                        }
                    </Link>
                      }
                </div>
                <div className="p-4 space-y-2">
                  {menuPages.map(({ name, label, emoji, desc }) =>
                      <Link
                        key={name}
                        to={createPageUrl(name)}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-colors ${
                        currentPageName === name ? "text-white" : "bg-stone-50 hover:bg-stone-100"}`
                        }
                        style={currentPageName === name ? { background: "linear-gradient(135deg, #4CAF87, #3d9e78)" } : {}}>

                      <div className="text-2xl">{emoji}</div>
                      <div className="flex-1">
                        <div className={`font-semibold text-sm ${currentPageName === name ? "text-white" : "text-stone-800"}`}>{label}</div>
                        <div className={`text-xs ${currentPageName === name ? "text-teal-100" : "text-stone-400"}`}>{desc}</div>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${currentPageName === name ? "text-teal-100" : "text-stone-300"}`} />
                    </Link>
                      )}
                </div>
                <div className="px-4 pb-6">
                  <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 flex items-start gap-3">
                    <Shield className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-teal-700">Votre localisation est toujours affichée de manière approximative.</p>
                  </div>
                </div>
              </div>
            </div>
                }

          <nav
                  className={`fixed left-0 right-0 bg-white border-t border-stone-100 z-[100] shadow-lg transition-transform duration-300 ${keyboardOpen ? "translate-y-full" : "bottom-0 translate-y-0"}`}
                  style={{ bottom: 0, paddingBottom: "max(env(safe-area-inset-bottom), 12px)", paddingTop: "env(safe-area-inset-top, 0px)", isolation: "isolate" }}>

            <div className="flex items-center justify-around w-full px-1 relative">

              {/* Accueil */}
              <Link
                to={createPageUrl("Home")}
                aria-label="Accueil"
                className={`flex flex-col items-center py-2.5 px-3 transition-colors min-w-[44px] min-h-[44px] justify-center ${currentPageName === "Home" ? "" : "text-stone-400"}`}
                style={currentPageName === "Home" ? { color: "#4CAF87" } : {}}>
                <div className={`p-1.5 rounded-xl transition-colors ${currentPageName === "Home" ? "bg-[#4CAF87]/10" : ""}`}>
                  <Home className="w-5 h-5" />
                </div>
                <span className="text-xs mt-0.5 font-medium">Accueil</span>
              </Link>

              {/* Communauté */}
              <Link
                to={createPageUrl("Social")}
                aria-label="Mon Clan"
                className={`flex flex-col items-center py-2.5 px-3 transition-colors min-w-[44px] min-h-[44px] justify-center ${currentPageName === "Social" ? "" : "text-stone-400"}`}
                style={currentPageName === "Social" ? { color: "#4CAF87" } : {}}>
                <div className={`p-1.5 rounded-xl transition-colors ${currentPageName === "Social" ? "bg-[#4CAF87]/10" : ""}`}>
                  <Heart className="w-5 h-5" />
                </div>
                <span className="text-xs mt-0.5 font-medium">Mon Clan</span>
              </Link>

              {/* Bouton Journal central */}
              <Link to={createPageUrl("JournalVie")} aria-label="Journal de vie" className="flex flex-col items-center min-w-[44px] min-h-[44px] justify-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg -mt-4" style={{ background: "linear-gradient(135deg, #FF7A59, #e8634a)" }}>
                  <span className="text-xl">📖</span>
                </div>
              </Link>

              {/* Messages */}
              <Link
                to={createPageUrl("Messages")}
                aria-label="Messages"
                className={`flex flex-col items-center py-2.5 px-3 transition-colors min-w-[44px] min-h-[44px] justify-center ${currentPageName === "Messages" ? "" : "text-stone-400"}`}
                style={currentPageName === "Messages" ? { color: "#4CAF87" } : {}}>
                <div className={`p-1.5 rounded-xl transition-colors relative ${currentPageName === "Messages" ? "bg-[#4CAF87]/10" : ""}`}>
                  <MessageCircle className="w-5 h-5" />
                  {unreadMessages > 0 &&
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-0.5 shadow">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  }
                </div>
                <span className="text-xs mt-0.5 font-medium">Messages</span>
              </Link>

              {/* Plus */}
              <button
                onClick={() => setMenuOpen(true)}
                aria-label="Menu principal"
                className="flex flex-col items-center py-2.5 px-3 transition-colors min-w-[44px] min-h-[44px] justify-center"
                style={isMenuPage ? { color: "#4CAF87" } : { color: "#a8a29e" }}>
                <div className={`relative p-1.5 rounded-xl ${isMenuPage ? "bg-[#4CAF87]/10" : ""}`}>
                  <Menu className="w-5 h-5" />
                </div>
                <span className="text-xs mt-0.5 font-medium">Plus</span>
              </button>

            </div>
          </nav>
        </>
              }
    </div>
    </LocationProvider>
    </KeyboardHeightProvider>
    </PseudoCacheProvider>
    </FeatureFlagsProvider>);

}