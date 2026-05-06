import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Star, TrendingUp, TrendingDown } from "lucide-react";

const SCORE_BADGE = {
  green: "🟢",
  yellow: "🟡",
  red: "🔴",
};

const TRUST_BADGE = {
  normal: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  shadow_banned: "bg-red-100 text-red-700",
};

export default function AdminRatings() {
  const [ratings, setRatings] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scoreFilter, setScoreFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    Promise.all([
      base44.entities.EncounterRating.list("-created_date", 200).catch(() => []),
      base44.entities.UserProfile.list("-reputation_score", 200).catch(() => []),
    ]).then(([r, p]) => {
      setRatings(r);
      setProfiles(p);
      setLoading(false);
    });
  }, []);

  const filtered = ratings.filter(r => {
    if (scoreFilter !== "all" && r.score !== scoreFilter) return false;
    if (typeFilter !== "all" && r.rating_type !== typeFilter) return false;
    return true;
  });

  const sorted = [...profiles].sort((a, b) => (b.reputation_score || 0) - (a.reputation_score || 0));
  const topPositive = sorted.slice(0, 10);
  const topNegative = [...profiles].sort((a, b) => (a.reputation_score || 0) - (b.reputation_score || 0)).slice(0, 10);

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-4 border-amber-400 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      {/* Zone A — Tableau évaluations */}
      <div>
        <h2 className="font-black text-stone-800 mb-3 flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500" /> Évaluations ({ratings.length})
        </h2>

        <div className="flex gap-2 flex-wrap mb-3">
          {["all", "green", "yellow", "red"].map(s => (
            <button key={s} onClick={() => setScoreFilter(s)}
              className={`text-xs px-3 py-1 rounded-full border font-semibold transition-all ${scoreFilter === s ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-500 border-stone-200"}`}>
              {s === "all" ? "Tous scores" : SCORE_BADGE[s]}
            </button>
          ))}
          {["all", "dog", "owner"].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`text-xs px-3 py-1 rounded-full border font-semibold transition-all ${typeFilter === t ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-500 border-stone-200"}`}>
              {t === "all" ? "Tous types" : t === "dog" ? "🐕 Chien" : "👤 Proprio"}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-stone-100 bg-white">
          <table className="w-full text-xs">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="text-left px-4 py-3 text-stone-500 font-semibold">De</th>
                <th className="text-left px-4 py-3 text-stone-500 font-semibold">Vers</th>
                <th className="text-left px-4 py-3 text-stone-500 font-semibold">Chien</th>
                <th className="text-left px-4 py-3 text-stone-500 font-semibold">Type</th>
                <th className="text-left px-4 py-3 text-stone-500 font-semibold">Score</th>
                <th className="text-left px-4 py-3 text-stone-500 font-semibold">Tags</th>
                <th className="text-left px-4 py-3 text-stone-500 font-semibold">Interne</th>
                <th className="text-left px-4 py-3 text-stone-500 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-stone-400">Aucune évaluation</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="border-b border-stone-50 hover:bg-stone-50">
                  <td className="px-4 py-2.5 text-stone-500 max-w-[100px] truncate">{r.from_email}</td>
                  <td className="px-4 py-2.5 font-medium max-w-[100px] truncate">{r.to_email}</td>
                  <td className="px-4 py-2.5">{r.dog_name || "—"}</td>
                  <td className="px-4 py-2.5">{r.rating_type === "dog" ? "🐕" : "👤"}</td>
                  <td className="px-4 py-2.5">{SCORE_BADGE[r.score] || r.score}</td>
                  <td className="px-4 py-2.5 max-w-[120px] truncate">{(r.tags || []).join(", ") || "—"}</td>
                  <td className="px-4 py-2.5 font-mono font-semibold">{r.internal_score}</td>
                  <td className="px-4 py-2.5 text-stone-400">{r.created_date ? new Date(r.created_date).toLocaleDateString("fr-FR") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Zone B — Classement réputation */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h2 className="font-black text-stone-800 mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" /> Top positifs
          </h2>
          <div className="space-y-2">
            {topPositive.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 bg-white rounded-xl border border-stone-100 px-4 py-2.5">
                <span className="text-xs font-black text-stone-400 w-5">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-stone-800 truncate">{p.pseudo}</p>
                  <p className="text-xs text-stone-400 truncate">{p.created_by}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TRUST_BADGE[p.trust_level] || TRUST_BADGE.normal}`}>
                  {p.trust_level || "normal"}
                </span>
                <span className="text-sm font-black text-green-600">+{p.reputation_score || 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-black text-stone-800 mb-3 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" /> Top négatifs
          </h2>
          <div className="space-y-2">
            {topNegative.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 bg-white rounded-xl border border-stone-100 px-4 py-2.5">
                <span className="text-xs font-black text-stone-400 w-5">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-stone-800 truncate">{p.pseudo}</p>
                  <p className="text-xs text-stone-400 truncate">{p.created_by}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TRUST_BADGE[p.trust_level] || TRUST_BADGE.normal}`}>
                  {p.trust_level || "normal"}
                </span>
                <span className="text-sm font-black text-red-600">{p.reputation_score || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}