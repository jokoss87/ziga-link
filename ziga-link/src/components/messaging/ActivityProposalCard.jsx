import { useState } from "react";
import { parseUTC } from "@/components/lib/dateUtils";
import { base44 } from "@/api/base44Client";
import { CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

export default function ActivityProposalCard({ msg, isMe, convId, conversation, pseudo, user, messages, msgIndex, onMessageSent }) {
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  let payload = null;
  try {
    const raw = msg.content.replace("[ACTIVITY_PROPOSAL]", "");
    payload = JSON.parse(raw);
  } catch {
    return null;
  }

  const alreadyAnswered = messages.slice(msgIndex + 1).some(m =>
    m.content?.includes("[PROPOSAL_ACCEPTED]") ||
    m.content?.includes("[PROPOSAL_DECLINED]") ||
    m.content?.includes("[PROPOSAL_RESCHEDULE]")
  );

  const sendReply = async (content, lastMsg) => {
    setSubmitting(true);
    
    // Optimistic message pour feedback immédiat
    const optimisticMsg = {
      id: `optimistic-${Date.now()}`,
      conversation_id: convId,
      sender_email: user.email,
      sender_pseudo: pseudo,
      content,
      created_date: new Date().toISOString(),
    };
    onMessageSent?.(optimisticMsg);
    
    try {
      const created = await base44.entities.ConversationMessage.create({
        conversation_id: convId,
        sender_email: user.email,
        sender_pseudo: pseudo,
        content,
      });
      
      const newUnread = { ...(conversation?.unread_counts || {}) };
      const others = (conversation?.members || []).filter(e => e !== user.email);
      others.forEach(e => { newUnread[e] = (newUnread[e] || 0) + 1; });
      await base44.entities.Conversation.update(convId, {
        last_message: lastMsg,
        last_message_at: new Date().toISOString(),
        last_message_by: pseudo,
        unread_counts: newUnread,
      });
      // Notification
      await Promise.all(others.map(email =>
        base44.entities.Notification.create({
          user_email: email,
          type: "walk_request",
          title: `🐾 Réponse à ta proposition`,
          body: lastMsg,
          reference_id: convId,
          link_page: "GroupChat",
          link_param: `id=${convId}`,
          is_read: false,
        })
      ));
    } catch (err) {
      console.error("Erreur envoi réponse:", err);
    } finally {
      setSubmitting(false);
      setShowReschedule(false);
    }
  };

  const handleAccept = () => sendReply(
    `[PROPOSAL_ACCEPTED] Super, c'est noté avec plaisir ! 🎉 J'ai hâte, à très vite avec nos toutous ! 🐾`,
    "✅ Proposition acceptée !"
  );

  const handleDecline = () => sendReply(
    `[PROPOSAL_DECLINED] Merci pour l'invitation ! Malheureusement ça ne sera pas possible cette fois-ci, mais n'hésite pas à reproposer ! 😊🐾`,
    "😕 Proposition déclinée"
  );

  const handleReschedule = () => {
    if (!newDate) return;
    const dateStr = parseUTC(newDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const timeStr = newTime ? newTime.replace(":", "h") : "";
    const newPayload = JSON.stringify({ ...payload, date: dateStr, rawDate: newDate, time: timeStr });
    sendReply(
      `[ACTIVITY_PROPOSAL]${newPayload}`,
      `📅 Nouvelle proposition : ${payload.label} le ${dateStr}`
    );
  };

  const typeEmoji = { balade: "🐾", jeu: "🎾", sport: "🏃", educateur: "📚" }[payload.type] || "🐕";

  return (
    <div className={`rounded-2xl overflow-hidden shadow-sm border max-w-xs ${isMe ? "border-teal-200 bg-teal-50 ml-auto" : "border-amber-200 bg-amber-50"}`}>
      {/* Header de la carte */}
      <div className={`px-4 pt-4 pb-3 ${isMe ? "bg-teal-50" : "bg-amber-50"}`}>
        <p className="text-sm font-semibold text-stone-700 mb-3">
          {isMe ? "Tu as proposé une activité avec vos compagnons 🐶" : "Je te propose une activité avec nos compagnons 🐶"}
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-stone-700">
            <span className="text-base">{typeEmoji}</span>
            <span><span className="text-stone-400">Activité :</span> <span className="font-semibold">{payload.label}</span>{payload.isGroup ? " · groupe" : ""}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-stone-700">
            <span className="text-base">📅</span>
            <span><span className="text-stone-400">Date :</span> <span className="font-semibold">{payload.date}</span></span>
          </div>
          {payload.time && (
            <div className="flex items-center gap-2 text-sm text-stone-700">
              <span className="text-base">⏰</span>
              <span><span className="text-stone-400">Heure :</span> <span className="font-semibold">{payload.time}</span></span>
            </div>
          )}
        </div>
        <p className="text-xs text-stone-500 mt-3 leading-relaxed">{payload.motiv}</p>
        {payload.note && (
          <p className="text-xs text-stone-500 italic mt-1">« {payload.note} »</p>
        )}
        {!isMe && !alreadyAnswered && (
          <p className="text-xs text-stone-400 mt-2">Dis-moi si cela te convient ou si tu souhaites modifier l'horaire.</p>
        )}
      </div>

      {/* Boutons d'action — uniquement pour le destinataire, si pas encore répondu */}
      {!isMe && !alreadyAnswered && !showReschedule && (
        <div className="flex border-t border-amber-200">
          <button
            onClick={handleAccept}
            disabled={submitting}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-all ${
              submitting ? "bg-teal-400 opacity-60 cursor-not-allowed pointer-events-none" : "bg-teal-500 text-white hover:bg-teal-600"
            }`}
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            {submitting ? "Traitement..." : "Accepter"}
          </button>
          <button
            onClick={() => setShowReschedule(true)}
            disabled={submitting}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold border-l border-amber-200 transition-all ${
              submitting ? "bg-amber-300 opacity-60 cursor-not-allowed pointer-events-none" : "bg-amber-400 text-white hover:bg-amber-500"
            }`}
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
            {submitting ? "Traitement..." : "Modifier"}
          </button>
          <button
            onClick={handleDecline}
            disabled={submitting}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold border-l border-amber-200 transition-all ${
              submitting ? "bg-stone-50 opacity-60 cursor-not-allowed text-stone-400 pointer-events-none" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
            {submitting ? "Traitement..." : "Décliner"}
          </button>
        </div>
      )}

      {/* Formulaire de modification d'horaire */}
      {!isMe && !alreadyAnswered && showReschedule && (
        <div className="px-4 py-3 border-t border-amber-200 bg-white space-y-2">
          <p className="text-xs font-semibold text-stone-600">Proposer un autre horaire</p>
          <div className="flex gap-2">
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="flex-1 border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-300"
            />
            <input
              type="time"
              value={newTime}
              onChange={e => setNewTime(e.target.value)}
              className="flex-1 border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-300"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReschedule}
              disabled={!newDate || submitting}
              className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                !newDate || submitting ? "bg-amber-300 opacity-60 cursor-not-allowed text-white pointer-events-none" : "bg-amber-400 text-white hover:bg-amber-500"
              }`}
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {submitting ? "Traitement..." : "Envoyer la nouvelle proposition"}
            </button>
            <button
              onClick={() => setShowReschedule(false)}
              disabled={submitting}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                submitting ? "bg-stone-100 text-stone-400 cursor-not-allowed pointer-events-none" : "bg-stone-100 text-stone-500 hover:bg-stone-200"
              }`}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {!isMe && alreadyAnswered && (
        <div className="px-4 py-2 bg-stone-50 border-t border-stone-100 text-xs text-stone-400 text-center">Déjà répondu</div>
      )}
    </div>
  );
}