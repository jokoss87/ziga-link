import { useState } from "react";
import { X, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function InviteModal({ type, targetEmail, targetProfile, currentUser, myProfile, getOrCreateConversation, onClose }) {
  const [dateMode, setDateMode] = useState("today"); // today | tomorrow | custom
  const [customDate, setCustomDate] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const isBalade = type === "balade";

  const getDateStr = () => {
    if (dateMode === "today") {
      return new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    }
    if (dateMode === "tomorrow") {
      const d = new Date(); d.setDate(d.getDate() + 1);
      return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    }
    if (customDate) {
      return new Date(customDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    }
    return "à définir";
  };

  const handleSend = async () => {
    if (sending) return;
    setSending(true);
    try {
      const conv = await getOrCreateConversation();
      if (!conv) throw new Error("Pas de conversation");

      const myPseudo = myProfile?.pseudo || currentUser?.full_name || "Moi";
      const dateStr = getDateStr();
      const proposalPayload = isBalade
        ? { type: "balade", label: "Balade avec nos compagnons", date: dateStr, time: "", motiv: "Je t'invite à une balade avec nos chiens !", note: note || undefined }
        : { type: "sport", label: "Activité sport ou obéissance", date: dateStr, time: "", motiv: "Je t'invite à une activité canine !", note: note || undefined };

      const content = `[ACTIVITY_PROPOSAL]${JSON.stringify(proposalPayload)}`;

      await base44.entities.ConversationMessage.create({
        conversation_id: conv.id,
        sender_email: currentUser.email,
        sender_pseudo: myPseudo,
        content,
      });

      const newUnread = { ...(conv.unread_counts || {}), [targetEmail]: ((conv.unread_counts?.[targetEmail] || 0) + 1) };
      await base44.entities.Conversation.update(conv.id, {
        last_message: isBalade ? "🐾 Invitation balade" : "🏃 Invitation activité",
        last_message_at: new Date().toISOString(),
        last_message_by: myPseudo,
        unread_counts: newUnread,
      });

      await base44.entities.Notification.create({
        user_email: targetEmail,
        type: "walk_request",
        title: isBalade ? `🐾 ${myPseudo} t'invite pour une balade !` : `🏃 ${myPseudo} t'invite pour une activité !`,
        body: `Le ${dateStr}`,
        reference_id: conv.id,
        link_page: "GroupChat",
        link_param: `id=${conv.id}`,
        is_read: false,
      });

      setSent(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      console.error("InviteModal send error:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-3xl p-6 pb-10"
        style={{ maxWidth: 480 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-stone-800 text-lg">
            {isBalade ? "🐾 Inviter pour une balade" : "🏃 Inviter pour une activité"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
            <X className="w-4 h-4 text-stone-600" />
          </button>
        </div>

        {sent ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">🎉</div>
            <p className="font-bold text-teal-600">Invitation envoyée !</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-stone-500 mb-4">Choisir une date pour {targetProfile?.pseudo || "cet utilisateur"}</p>

            {/* Sélecteur date */}
            <div className="flex gap-2 mb-4">
              {[
                { key: "today", label: "Aujourd'hui" },
                { key: "tomorrow", label: "Demain" },
                { key: "custom", label: "Choisir" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setDateMode(key)}
                  className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all border ${
                    dateMode === key
                      ? isBalade
                        ? "bg-teal-500 text-white border-teal-500"
                        : "bg-violet-500 text-white border-violet-500"
                      : "bg-stone-50 text-stone-600 border-stone-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {dateMode === "custom" && (
              <input
                type="date"
                value={customDate}
                onChange={e => setCustomDate(e.target.value)}
                className="w-full mb-4 border border-stone-200 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-300"
              />
            )}

            {/* Note */}
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Note optionnelle (lieu, heure préférée...)"
              className="w-full border border-stone-200 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-300 resize-none mb-5"
              rows={3}
            />

            <button
              onClick={handleSend}
              disabled={sending || (dateMode === "custom" && !customDate)}
              className="w-full py-4 rounded-2xl font-black text-white text-base flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              style={{ background: isBalade ? "linear-gradient(135deg, #0d9488, #5DCAA5)" : "linear-gradient(135deg, #7c3aed, #a78bfa)" }}
            >
              <Send className="w-4 h-4" />
              {sending ? "Envoi..." : "Envoyer l'invitation"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}