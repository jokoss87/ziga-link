import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { Shield, LogOut, AlertTriangle } from "lucide-react";
import { APP_NAME } from "@/lib/brand";

import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminUrgences from "@/components/admin/AdminUrgences";
import AdminProfileModeration from "@/components/admin/AdminProfileModeration";
import AdminQualite from "@/components/admin/AdminQualite";
import AdminMarketing2 from "@/components/admin/AdminMarketing2";
import AdminTechnique from "@/components/admin/AdminTechnique";
import AdminDonnees from "@/components/admin/AdminDonnees";
import AdminLegal from "@/components/admin/AdminLegal";

const TABS = [
  { id: "dashboard",  label: "Dashboard",    emoji: "📊" },
  { id: "urgences",   label: "Urgences",     emoji: "🚨" },
  { id: "users",      label: "Utilisateurs", emoji: "👥" },
  { id: "qualite",    label: "Qualité",      emoji: "⭐" },
  { id: "marketing",  label: "Marketing",    emoji: "📣" },
  { id: "technique",  label: "Technique",    emoji: "🔧" },
  { id: "donnees",    label: "Données",      emoji: "📋" },
  { id: "legal",      label: "Légal",        emoji: "📄" },
];

export default function Admin() {
  const { user } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [alerts, setAlerts] = useState({});
  const [alertsLoaded, setAlertsLoaded] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // Charger le compteur d'urgences sans bloquer le rendu
    base44.entities.ModerationAlert.filter({ status: "new" }, "-created_date", 100)
      .then(data => { setAlerts({ urgences: data.length }); setAlertsLoaded(true); })
      .catch(() => setAlertsLoaded(true));

    const unsub = base44.entities.ModerationAlert.subscribe(event => {
      setAlerts(prev => {
        const cur = prev.urgences || 0;
        if (event.type === "create") return { ...prev, urgences: cur + 1 };
        if (event.type === "update" && event.data?.status !== "new") return { ...prev, urgences: Math.max(0, cur - 1) };
        return prev;
      });
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent" />
      </div>
    );
  }

  // Protection stricte : admin uniquement
  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-xl font-black text-stone-800 mb-2">Accès refusé</h1>
          <p className="text-stone-400 text-sm">Cette page est réservée aux administrateurs.</p>
          <button
            onClick={() => base44.auth.redirectToLogin()}
            className="mt-6 px-6 py-3 rounded-2xl text-white font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case "dashboard":  return <AdminDashboard onNavigate={setActiveTab} />;
      case "urgences":   return <AdminUrgences />;
      case "users":      return <AdminProfileModeration />;
      case "qualite":    return <AdminQualite />;
      case "marketing":  return <AdminMarketing2 />;
      case "technique":  return <AdminTechnique />;
      case "donnees":    return <AdminDonnees />;
      case "legal":      return <AdminLegal />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black text-stone-800 leading-tight">Centre Admin</h1>
              <p className="text-xs text-stone-400">{APP_NAME} · {user.email}</p>
            </div>
          </div>
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Déco
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-4 pb-0">
          <div className="flex gap-0 overflow-x-auto pb-0 scrollbar-hide">
            {TABS.map(tab => {
              const isUrgences = tab.id === "urgences";
              const count = isUrgences ? (alerts.urgences || 0) : 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                    activeTab === tab.id
                      ? "border-teal-500 text-teal-600"
                      : "border-transparent text-stone-400 hover:text-stone-600"
                  }`}
                >
                  <span>{tab.emoji}</span> {tab.label}
                  {count > 0 && (
                    <span className="ml-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 pb-20">
        {renderTab()}
      </div>
    </div>
  );
}