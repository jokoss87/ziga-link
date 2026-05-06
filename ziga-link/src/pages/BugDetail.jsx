import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { ArrowLeft, AlertCircle, CheckCircle, MessageSquare } from "lucide-react";

export default function BugDetail() {
  const { user: currentUser } = useUserProfile();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bugId = searchParams.get("id");
  const [bug, setBug] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bugId || !currentUser) return;
    const init = async () => {
      setLoading(true);
      const all = await base44.entities.BugReport.list("-created_date", 200);
      const found = all.find(b => b.id === bugId);
      if (found && (found.created_by === currentUser?.email || currentUser?.role === "admin")) {
        setBug(found);
        // Marquer les notifications liées à ce bug comme lues
        base44.entities.Notification.filter(
          { user_email: currentUser.email, reference_id: bugId, is_read: false },
          "-created_date", 20
        ).then(notifs => {
          notifs.forEach(n => base44.entities.Notification.update(n.id, { is_read: true }).catch(() => {}));
        }).catch(() => {});
      }
      setLoading(false);
    };
    init();
  }, [bugId, currentUser?.email]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-400 border-t-transparent" />
      </div>
    );
  }

  if (!bug) {
    return (
      <div className="min-h-screen bg-stone-50 p-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-teal-600 font-semibold mb-4">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div className="text-center py-12 text-stone-400">Bug non trouvé</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 p-4 pb-20">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-teal-600 font-semibold mb-4">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <div className="max-w-2xl">
        {/* En-tête */}
        <div className="bg-white rounded-2xl border border-stone-100 p-5 mb-4">
          <div className="flex items-start justify-between mb-3">
            <h1 className="text-lg font-black text-stone-800 flex-1">{bug.description}</h1>
            <span className={`text-xs px-3 py-1 rounded-full font-semibold flex-shrink-0 ${
              bug.status === "nouveau" ? "bg-red-100 text-red-700" :
              bug.status === "en_cours" ? "bg-amber-100 text-amber-700" :
              "bg-green-100 text-green-700"
            }`}>
              {bug.status === "nouveau" ? "Nouveau" : bug.status === "en_cours" ? "En cours" : "Corrigé"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-stone-500 mb-3">
            <div><span className="font-semibold">Type :</span> {bug.bug_type}</div>
            <div><span className="font-semibold">Page :</span> {bug.page}</div>
            <div><span className="font-semibold">Appareil :</span> {bug.device_type || "—"}</div>
            <div><span className="font-semibold">OS :</span> {bug.os || "—"}</div>
          </div>

          <div className="text-xs text-stone-400">
            Signalé le {new Date(bug.created_date).toLocaleString("fr-FR")}
          </div>
        </div>

        {/* Réponse admin */}
        {bug.admin_public_response ? (
          <div className="bg-teal-50 border-2 border-teal-200 rounded-2xl p-5 mb-4">
            <div className="flex items-start gap-3 mb-3">
              <MessageSquare className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-teal-900 mb-1">Réponse de l'équipe Ziga Link</h3>
                <p className="text-sm text-teal-800 mb-2">{bug.admin_public_response}</p>
                <div className="text-xs text-teal-600 flex items-center justify-between">
                  <span>Répondu par l'équipe</span>
                  <span>{new Date(bug.admin_public_response_date).toLocaleString("fr-FR")}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-amber-900 mb-1">Nous avons bien reçu votre signalement</h3>
                <p className="text-sm text-amber-800">L'équipe analyse le problème et vous répondra très bientôt. Merci de votre patience ! 🙏</p>
              </div>
            </div>
          </div>
        )}

        {/* Statut résumé */}
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
            {bug.status === "corrige" ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-amber-600" />}
            Statut du signalement
          </h3>
          <div className="text-sm text-stone-600">
            {bug.status === "nouveau" && "⏳ Votre signalement est en attente d'examen par l'équipe."}
            {bug.status === "en_cours" && "🔧 L'équipe est en train d'examiner et de corriger le problème."}
            {bug.status === "corrige" && "✅ Ce problème a été corrigé ! Merci de l'avoir signalé."}
          </div>
        </div>
      </div>
    </div>
  );
}