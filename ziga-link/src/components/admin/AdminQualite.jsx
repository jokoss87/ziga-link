import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import AdminFeedback from "@/components/admin/AdminFeedback";
import AdminBugReports from "@/components/admin/AdminBugReports";
import AdminRatings from "@/components/admin/AdminRatings";

const TABS = ["💬 Feedback", "🛠 Bugs", "⭐ Évaluations"];

export default function AdminQualite() {
  const [tab, setTab] = useState(0);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.UserFeedback.list("-created_date", 100).catch(() => []),
      base44.entities.BugReport.filter({ status: "nouveau" }, "-created_date", 100).catch(() => []),
    ]).then(([feedback, openBugs]) => {
      const scores = feedback.filter(f => f.pleasure_score).map(f => f.pleasure_score);
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      setSummary({ feedbackCount: feedback.length, openBugs: openBugs.length, avgScore: avg });
    });
  }, []);

  return (
    <div className="space-y-4">
      {/* Barre résumé */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm text-center">
            <div className="text-2xl font-black text-amber-600">{summary.avgScore !== null ? `${summary.avgScore}%` : "—"}</div>
            <div className="text-xs text-stone-400 mt-0.5">Score satisfaction</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm text-center">
            <div className={`text-2xl font-black ${summary.openBugs > 0 ? "text-red-600" : "text-green-600"}`}>{summary.openBugs}</div>
            <div className="text-xs text-stone-400 mt-0.5">Bugs ouverts</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm text-center">
            <div className="text-2xl font-black text-purple-600">{summary.feedbackCount}</div>
            <div className="text-xs text-stone-400 mt-0.5">Retours reçus</div>
          </div>
        </div>
      )}

      {/* Sous-tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap flex-shrink-0 transition-colors ${tab === i ? "bg-stone-800 text-white" : "bg-white border border-stone-200 text-stone-500 hover:border-stone-300"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <AdminFeedback />}
      {tab === 1 && <AdminBugReports />}
      {tab === 2 && <AdminRatings />}
    </div>
  );
}