import { useState } from "react";
import AdminCGU from "@/components/admin/AdminCGU";
import AdminEmailLogDashboard from "@/components/admin/AdminEmailLogDashboard";

const TABS = ["📋 CGU", "📧 Journal Emails"];

export default function AdminLegal() {
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
      {tab === 0 && <AdminCGU />}
      {tab === 1 && <AdminEmailLogDashboard />}
    </div>
  );
}