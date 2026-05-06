import { useState } from "react";
import AdminEngagement from "@/components/admin/AdminEngagement";
import AdminSessionStats from "@/components/admin/AdminSessionStats";
import AdminMap from "@/components/admin/AdminMap";

const TABS = ["📈 Activité", "⏱️ Sessions", "🗺️ Carte"];

export default function AdminDonnees() {
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
      {tab === 0 && <AdminEngagement />}
      {tab === 1 && <AdminSessionStats />}
      {tab === 2 && <AdminMap />}
    </div>
  );
}