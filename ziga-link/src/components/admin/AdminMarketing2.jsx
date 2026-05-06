import { useState } from "react";
import AdminMarketing from "@/components/admin/AdminMarketing";
import AdminSupport from "@/components/admin/AdminSupport";

const TABS = ["🎨 Event Banner", "💰 Soutiens"];

export default function AdminMarketing2() {
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
      {tab === 0 && <AdminMarketing />}
      {tab === 1 && <AdminSupport />}
    </div>
  );
}