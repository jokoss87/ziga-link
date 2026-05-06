import { useState } from "react";
import { base44 } from "@/api/base44Client";
import BottomFixedModal from "@/components/ui/BottomFixedModal";
import { Button } from "@/components/ui/button";

const APP_VERSION = "1.0.0";

const BUG_TYPES = [
  { value: "affichage", label: "Problème d'affichage" },
  { value: "fonction", label: "Fonction qui ne répond pas" },
  { value: "calcul", label: "Erreur de calcul" },
  { value: "carte", label: "Bug carte / géolocalisation" },
  { value: "connexion", label: "Problème de connexion" },
  { value: "autre", label: "Autre" },
];

function getDeviceInfo() {
  const ua = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  const isTablet = /iPad/i.test(ua);
  const deviceType = isTablet ? "Tablette" : isMobile ? "Mobile" : "Desktop";
  let os = "Inconnu";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  return { deviceType, os };
}

export default function BugReportModal({ currentPageName, userEmail, userId, onClose }) {
  const [bugType, setBugType] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const MAX_CHARS = 300;

  const handleSubmit = async () => {
    if (!bugType || !description.trim()) return;
    setSending(true);
    const { deviceType, os } = getDeviceInfo();
    await base44.entities.BugReport.create({
      bug_type: bugType,
      description: description.trim(),
      page: currentPageName || "Inconnue",
      user_email: userEmail,
      user_id: userId || "",
      app_version: APP_VERSION,
      device_type: deviceType,
      os,
      status: "nouveau",
      priority: "moyenne",
    });
    const profiles = await base44.entities.UserProfile.filter({ created_by: userEmail });
    if (profiles[0]) {
      const badge = "🛠 Contributeur Actif";
      const current = profiles[0].preferred_activities || [];
      if (!current.includes(badge)) {
        await base44.entities.UserProfile.update(profiles[0].id, {
          bio: profiles[0].bio ? profiles[0].bio : "🛠 Badge Contributeur Actif débloqué !",
        });
      }
    }
    setSending(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.5)" }}>
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-black text-stone-800 mb-2">Merci pour ton aide !</h2>
          <p className="text-stone-500 text-sm mb-3">Tu contribues directement à améliorer l'application.</p>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl py-3 px-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">🛠</span>
            <div className="text-left">
              <div className="font-bold text-amber-800 text-sm">Badge débloqué !</div>
              <div className="text-xs text-amber-600">Contributeur Actif</div>
            </div>
          </div>
          <button onClick={onClose} className="w-full py-3 rounded-2xl text-white font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}>
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <BottomFixedModal
      title={
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛠</span>
          <div>
            <h2 className="text-base font-black text-stone-800">Signaler un bug</h2>
            <p className="text-xs text-stone-400">Aide-nous à améliorer l'app</p>
          </div>
        </div>
      }
      onClose={onClose}
      zIndex="z-50"
      footer={
        <Button
          onClick={handleSubmit}
          disabled={!bugType || !description.trim() || sending}
          className="w-full py-3.5 rounded-2xl text-white font-bold text-sm disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
        >
          {sending ? "Envoi en cours..." : "Envoyer le signalement"}
        </Button>
      }
    >
      <div className="px-6 py-5 space-y-4">
        {/* Type de bug */}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">Type de bug *</label>
          <div className="grid grid-cols-2 gap-2">
            {BUG_TYPES.map(({ value, label }) => (
              <button key={value} onClick={() => setBugType(value)}
                className={`text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                  bugType === value ? "border-teal-500 bg-teal-50 text-teal-700" : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100"
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">Description *</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value.slice(0, MAX_CHARS))}
            rows={4}
            placeholder="Décris brièvement ce qui s'est passé."
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-700 resize-none focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
          <div className={`text-right text-xs mt-1 ${description.length >= MAX_CHARS ? "text-red-400" : "text-stone-400"}`}>
            {description.length}/{MAX_CHARS}
          </div>
        </div>

        {/* Page automatique */}
        <div className="flex items-center gap-2 bg-stone-50 rounded-xl px-3 py-2.5 border border-stone-100">
          <span className="text-xs text-stone-400">Page :</span>
          <span className="text-xs font-semibold text-stone-600">{currentPageName || "Inconnue"}</span>
        </div>
      </div>
    </BottomFixedModal>
  );
}