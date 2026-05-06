import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

function MaintenanceAction({ title, description, buttonLabel, emoji, onRun }) {
  const [state, setState] = useState("idle"); // idle | loading | success | error
  const [result, setResult] = useState(null);

  const handleRun = async () => {
    setState("loading");
    setResult(null);
    const res = await onRun();
    if (res?.error) {
      setState("error");
      setResult(res.error);
    } else {
      setState("success");
      setResult(res);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0">{emoji}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-stone-800 text-sm">{title}</h3>
          <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{description}</p>

          {state === "success" && result && (
            <div className="mt-3 bg-green-50 border border-green-100 rounded-xl p-3 text-xs text-green-700 space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Terminé avec succès
              </div>
              {result.posts && (
                <div>Posts corrigés : <strong>{result.posts.updated}</strong> / ignorés : {result.posts.skipped}</div>
              )}
              {result.comments && (
                <div>Commentaires corrigés : <strong>{result.comments.updated}</strong> / ignorés : {result.comments.skipped}</div>
              )}
              {result.activities && (
                <div>Activités corrigées : <strong>{result.activities.updated}</strong></div>
              )}
              {result.announcements && (
                <div>Annonces corrigées : <strong>{result.announcements.updated}</strong></div>
              )}
            </div>
          )}

          {state === "error" && (
            <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{typeof result === "string" ? result : "Une erreur est survenue."}</span>
            </div>
          )}

          <button
            onClick={handleRun}
            disabled={state === "loading"}
            className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
            style={{ background: state === "loading" ? "#9ca3af" : "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
          >
            {state === "loading"
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> En cours…</>
              : <><RefreshCw className="w-3.5 h-3.5" /> {buttonLabel}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminMaintenance() {
  const runMigratePseudos = async () => {
    const res = await base44.functions.invoke("migratePseudos", {});
    return res.data;
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700">
        ⚠️ Ces outils modifient des données en masse. Ils sont idempotents (relançables sans risque) mais réservés aux situations où une incohérence a été détectée.
      </div>

      <MaintenanceAction
        emoji="🏷️"
        title="Resync tous les pseudos"
        description="Met à jour author_name (posts & commentaires), organizer_name (activités) et owner_name (annonces) pour tous les utilisateurs. À lancer après un import de données ou un changement de pseudo en masse."
        buttonLabel="Lancer la resync"
        onRun={runMigratePseudos}
      />
    </div>
  );
}