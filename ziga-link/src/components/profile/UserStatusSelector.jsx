import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { STATUS_CONFIG } from "./UserStatusBadge";

export default function UserStatusSelector({ profileId, currentStatus, onUpdate }) {
  const [saving, setSaving] = useState(false);

  const handleSelect = async (status) => {
    if (status === currentStatus || saving) return;
    setSaving(true);
    try {
      await base44.entities.UserProfile.update(profileId, { user_status: status });
      onUpdate(status);
    } catch (err) {
      console.error("Erreur mise à jour statut:", err);
      // Rollback automatique : onUpdate n'est pas appelé, le statut reste inchangé
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
        <button
          key={key}
          onClick={() => handleSelect(key)}
          disabled={saving}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-semibold transition-all ${
            currentStatus === key
              ? `${cfg.color} shadow-sm scale-105`
              : "bg-white border-stone-200 text-stone-400 hover:border-stone-300"
          }`}
        >
          <span>{cfg.emoji}</span>
          <span>{cfg.label}</span>
        </button>
      ))}
    </div>
  );
}