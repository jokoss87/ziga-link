import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Star, Users, TrendingUp } from "lucide-react";

function StatCard({ icon: Icon, label, value, sub, color = "teal" }) {
  const colors = {
    teal: "bg-teal-50 text-teal-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
      <div className={`w-9 h-9 rounded-xl ${colors[color]} flex items-center justify-center mb-2`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-2xl font-black text-stone-800">{value}</div>
      <div className="text-xs font-semibold text-stone-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-stone-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState("stats");

  useEffect(() => {
    base44.entities.UserFeedback.list("-created_date", 200).then(data => {
      setFeedbacks(data);
      setLoading(false);
    });
  }, []);

  const formFeedbacks = feedbacks.filter(f => f.feedback_type === "form");
  const exitFeedbacks = feedbacks.filter(f => f.feedback_type === "exit" && f.pleasure_score != null);
  const avgScore = exitFeedbacks.length > 0
    ? Math.round(exitFeedbacks.reduce((s, f) => s + f.pleasure_score, 0) / exitFeedbacks.length)
    : null;

  const participationRate = feedbacks.length > 0
    ? Math.round((exitFeedbacks.length / (exitFeedbacks.length + formFeedbacks.length)) * 100)
    : 0;

  // Group by day
  const byDay = {};
  exitFeedbacks.forEach(f => {
    const day = new Date(f.created_date).toLocaleDateString("fr-FR");
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(f.pleasure_score);
  });

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-400 border-t-transparent" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="text-2xl">🎯</div>
        <div>
          <h2 className="font-black text-stone-800">Analyse Expérience Utilisateur</h2>
          <p className="text-xs text-stone-400">Version Test – Eymoutiers</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Star} label="Score de plaisir moyen" value={avgScore !== null ? `${avgScore}%` : "—"} color="amber" />
        <StatCard icon={MessageSquare} label="Retours formulaire" value={formFeedbacks.length} color="teal" />
        <StatCard icon={Users} label="Scores de sortie" value={exitFeedbacks.length} color="blue" />
        <StatCard icon={TrendingUp} label="Total retours" value={feedbacks.length} color="purple" />
      </div>

      {/* Sections */}
      <div className="flex gap-2">
        {[{ id: "stats", label: "📊 Stats" }, { id: "comments", label: "💬 Commentaires" }, { id: "evolution", label: "📈 Évolution" }].map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${section === s.id ? "bg-stone-800 text-white" : "bg-white text-stone-400 border border-stone-200"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "stats" && (
        <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm space-y-3">
          <h3 className="font-bold text-stone-700 text-sm">Répartition de la fluidité</h3>
          {["oui", "moyennement", "non"].map(val => {
            const count = formFeedbacks.filter(f => f.is_fluid === val).length;
            const pct = formFeedbacks.length > 0 ? Math.round(count / formFeedbacks.length * 100) : 0;
            const colors = { oui: "bg-teal-400", moyennement: "bg-amber-400", non: "bg-red-400" };
            const labels = { oui: "✅ Fluide", moyennement: "⚠️ Moyen", non: "❌ Non fluide" };
            return (
              <div key={val}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-stone-600">{labels[val]}</span>
                  <span className="text-stone-400">{count} ({pct}%)</span>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div className={`h-full ${colors[val]} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          <div className="pt-2 border-t border-stone-50">
            <p className="text-xs text-stone-500">🐛 Bugs signalés : <strong>{formFeedbacks.filter(f => f.had_bug).length}</strong></p>
          </div>
        </div>
      )}

      {section === "comments" && (
        <div className="space-y-3">
          {formFeedbacks.length === 0 && (
            <div className="text-center py-10 text-stone-400 text-sm">Aucun commentaire pour l'instant.</div>
          )}
          {formFeedbacks.map(f => (
            <div key={f.id} className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-stone-700">{f.user_name || "Anonyme"}</span>
                <span className="text-xs text-stone-400">{new Date(f.created_date).toLocaleDateString("fr-FR")}</span>
              </div>
              {f.liked && <p className="text-xs text-teal-700 bg-teal-50 rounded-xl px-3 py-2">😊 {f.liked}</p>}
              {f.disliked && <p className="text-xs text-orange-700 bg-orange-50 rounded-xl px-3 py-2">😕 {f.disliked}</p>}
              {f.suggestion && <p className="text-xs text-blue-700 bg-blue-50 rounded-xl px-3 py-2">💡 {f.suggestion}</p>}
              {f.is_fluid && <span className="text-xs text-stone-400">Fluidité : {f.is_fluid} {f.had_bug ? "· 🐛 Bug signalé" : ""}</span>}
            </div>
          ))}
        </div>
      )}

      {section === "evolution" && (
        <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm space-y-3">
          <h3 className="font-bold text-stone-700 text-sm">Score de plaisir par jour</h3>
          {Object.keys(byDay).length === 0 && <p className="text-xs text-stone-400">Pas encore de données.</p>}
          {Object.entries(byDay).reverse().map(([day, scores]) => {
            const avg = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
            return (
              <div key={day}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-stone-600">{day}</span>
                  <span className="text-stone-500">{avg}% · {scores.length} retour{scores.length > 1 ? "s" : ""}</span>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-400 rounded-full" style={{ width: `${avg}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}