import { useState } from "react";
import AdminMonitoring from "@/components/admin/AdminMonitoring";
import AdminMaintenance from "@/components/admin/AdminMaintenance";
import AdminZoneConfig from "@/components/admin/AdminZoneConfig";
import AdminActivityConfig from "@/components/admin/AdminActivityConfig";

const TABS = ["🚨 Monitoring", "🔧 Maintenance", "🗺️ Zones", "🏅 Activités"];

export default function AdminTechnique() {
  const [tab, setTab] = useState(0);
  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap flex-shrink-0 transition-colors ${tab === i ? "bg-stone-800 text-white" : "bg-white border border-stone-200 text-stone-500"}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 0 && <AdminMonitoring />}
      {tab === 1 && <AdminMaintenance />}
      {tab === 2 && <AdminZoneConfig />}
      {tab === 3 && <AdminActivityConfig />}
    </div>
  );
}