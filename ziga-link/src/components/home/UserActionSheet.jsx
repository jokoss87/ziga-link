import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { X, MessageCircle, Calendar, Users, Dog, MapPin, Clock } from "lucide-react";
import { parseUTC } from "@/components/lib/dateUtils";
import UserStatusBadge from "@/components/profile/UserStatusBadge";

const ACTIVITY_TYPES = [
  { value: "balade", label: "🐾 Balade", desc: "Sortie en extérieur" },
  { value: "jeu", label: "🎾 Jeu / Socialisation", desc: "Rencontre détendue" },
  { value: "sport", label: "🏃 Sport canin", desc: "Canicross, agility..." },
  { value: "educateur", label: "📚 Séance éducation", desc: "Apprentissage" },
];

export default function UserActionSheet({ announcement, onClose, initialView = "main" }) {
  const { user } = useUserProfile();
  const navigate = useNavigate();
  const [view, setView] = useState(initialView === "activity" ? "activity" : initialView === "message" ? "message" : "main");

  const [actType, setActType] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [navigating, setNavigating] = useState(false);

  const distKm = announcement?.distKm ?? null;
  const ownerStatus = announcement?.ownerStatus ?? null;
  const [ownerPseudo, setOwnerPseudo] = useState(null);

  useEffect(() => {
    if (!announcement?.created_by) return;
    base44.entities.UserProfile.filter(
      { created_by: announcement.created_by }, "-created_date", 1
    ).then(res => {
      setOwnerPseudo(res[0]?.pseudo || null);
    }).catch(() => {});
  }, [announcement?.created_by]);

  useEffect(() => {
    if (initialView === "message") {
      handleStartConversation();
    }
  }, []);

  const handleStartConversation = async () => {
    setNavigating(true);
    if (!user) return;

    const myProfiles = await base44.entities.UserProfile.filter({ created_by: user.email });
    const myPseudo = myProfiles[0]?.pseudo || user.full_name || user.email;

    const all = await base44.entities.Conversation.filter(
      { members: user.email },
      "-last_message_at",
      50
    );
    const existing = all.find(c =>
      c.type === "private" &&
      c.members?.includes(user.email) &&
      c.members?.includes(announcement.created_by)
    );

    if (existing) {
      navigate(`${createPageUrl("GroupChat")}?id=${existing.id}`);
      onClose();
      return;
    }

    const otherProfiles = await base44.entities.UserProfile.filter({ created_by: announcement.created_by });
    const otherPseudo = otherProfiles[0]?.pseudo || "Propriétaire 🐾";

    const conv = await base44.entities.Conversation.create({
      type: "private",
      members: [user.email, announcement.created_by],
      member_pseudos: [myPseudo, otherPseudo],
      created_by_pseudo: myPseudo,
      last_message: "",
      unread_counts: {},
    });

    navigate(`${createPageUrl("GroupChat")}?id=${conv.id}`);
    onClose();
  };

  const handleSendActivity = async () => {
    if (!actType || !date) return;
    setSending(true);
    if (!user) { setSending(false); return; }

    const myProfiles = await base44.entities.UserProfile.filter({ created_by: user.email });
    const myPseudo = myProfiles[0]?.pseudo || user.full_name || user.email;
    const otherPseudo = announcement.owner_name || "Propriétaire 🐾";

    const all = await base44.entities.Conversation.filter(
      { members: user.email },
      "-last_message_at",
      50
    );
    let conv = all.find(c =>
      c.type === "private" &&
      c.members?.includes(user.email) &&
      c.members?.includes(announcement.created_by)
    );

    if (!conv) {
      const otherProfiles = await base44.entities.UserProfile.filter({ created_by: announcement.created_by });
      const otherPseudoFull = otherProfiles[0]?.pseudo || otherPseudo;
      conv = await base44.entities.Conversation.create({
        type: "private",
        members: [user.email, announcement.created_by],
        member_pseudos: [myPseudo, otherPseudoFull],
        created_by_pseudo: myPseudo,
        last_message: "",
        unread_counts: { [announcement.created_by]: 1 },
      });
    }

    const typeLabel = ACTIVITY_TYPES.find(a => a.value === actType)?.label || actType;
    const activityName = typeLabel.replace(/^[^\s]+\s/, "");
    const motivLines = {
      balade: "Ce serait l'occasion de partager un moment agréable et de laisser nos chiens explorer ensemble.",
      jeu: "Une belle occasion de laisser nos chiens se défouler et se socialiser dans la bonne humeur !",
      sport: "Prêt(e) à relever le défi ? Ce serait super de partager cette expérience sportive ensemble 💪",
      educateur: "Une belle opportunité d'apprendre ensemble et de faire progresser nos compagnons 🌟",
    };
    const dateStr = parseUTC(date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const timeStr = time ? time.replace(":", "h") : "";

    const payload = JSON.stringify({
      type: actType,
      label: activityName,
      date: dateStr,
      rawDate: date,
      time: timeStr,
      isGroup,
      note: note || "",
      motiv: motivLines[actType] || "",
    });
    const content = `[ACTIVITY_PROPOSAL]${payload}`;

    await base44.entities.ConversationMessage.create({
      conversation_id: conv.id,
      sender_email: user.email,
      sender_pseudo: myPseudo,
      content,
    });

    await base44.entities.Conversation.update(conv.id, {
      last_message: content.split("\n")[0],
      last_message_at: new Date().toISOString(),
      last_message_by: myPseudo,
      unread_counts: { ...(conv.unread_counts || {}), [announcement.created_by]: (conv.unread_counts?.[announcement.created_by] || 0) + 1 },
    });

    setSending(false);
    setSent(true);
    setTimeout(() => { navigate(`${createPageUrl("GroupChat")}?id=${conv.id}`); onClose(); }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-amber-100 flex-shrink-0 flex items-center justify-center">
              {announcement.owner_photo ? (
                <img src={announcement.owner_photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <Dog className="w-6 h-6 text-amber-500" />
              )}
            </div>
            <div>
              <div className="font-black text-stone-800 text-base leading-tight">
                {announcement.dog_name || "Chien"}
              </div>
              <div className="text-xs text-stone-400 flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                {ownerPseudo && <span>{ownerPseudo}</span>}
                {distKm !== null && (
                  <span className="text-teal-600 font-semibold">
                    📍 {distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)} km`}
                  </span>
                )}
              </div>
              {ownerStatus && (
                <div className="mt-1">
                  <UserStatusBadge status={ownerStatus} />
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-stone-100">
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>

        {navigating && (
          <div className="px-6 py-10 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-400 border-t-transparent mx-auto mb-3" />
            <div className="text-stone-400 text-sm">Ouverture de la conversation…</div>
          </div>
        )}

        {!navigating && view === "main" && (
          <div className="px-6 py-5 space-y-3 pb-8">
            <button
              onClick={() => setView("activity")}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 transition-colors text-left"
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF7A59, #e8634a)" }}>
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-stone-800 text-sm">Proposer une activité</div>
                <div className="text-xs text-stone-400">Balade, jeu, sport... solo ou en groupe</div>
              </div>
            </button>

            <button
              onClick={handleStartConversation}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border border-teal-100 bg-teal-50 hover:bg-teal-100 transition-colors text-left"
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}>
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-stone-800 text-sm">Démarrer une conversation</div>
                <div className="text-xs text-stone-400">Envoyer un message direct</div>
              </div>
            </button>
          </div>
        )}

        {!navigating && view === "activity" && !sent && (
          <div className="px-6 py-5 space-y-4 pb-8">
            <button onClick={() => setView("main")} className="text-xs text-stone-400 flex items-center gap-1 mb-1">
              ← Retour
            </button>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Type d'activité</label>
              <div className="grid grid-cols-2 gap-2">
                {ACTIVITY_TYPES.map(a => (
                  <button
                    key={a.value}
                    onClick={() => setActType(a.value)}
                    className={`text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                      actType === a.value
                        ? "border-teal-500 bg-teal-50 text-teal-700"
                        : "border-stone-200 bg-stone-50 text-stone-600"
                    }`}
                  >
                    <div>{a.label}</div>
                    <div className="text-stone-400 font-normal">{a.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Date *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Heure
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 bg-stone-50 rounded-xl px-4 py-3 border border-stone-200">
              <Users className="w-4 h-4 text-stone-400" />
              <span className="text-sm text-stone-600 flex-1">Invitation collective</span>
              <button
                onClick={() => setIsGroup(!isGroup)}
                className={`w-12 h-6 rounded-full transition-all duration-200 relative ${isGroup ? "bg-teal-500" : "bg-stone-200"}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${isGroup ? "left-6" : "left-0.5"}`} />
              </button>
            </div>

            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Un petit mot... (optionnel)"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-300"
            />

            <button
              onClick={handleSendActivity}
              disabled={!actType || !date || sending}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #FF7A59, #e8634a)" }}
            >
              {sending ? "Envoi en cours..." : "📅 Envoyer la proposition"}
            </button>
          </div>
        )}

        {!navigating && sent && (
          <div className="px-6 py-10 text-center">
            <div className="text-5xl mb-3">🎉</div>
            <div className="font-black text-stone-800 text-lg">Proposition envoyée !</div>
            <div className="text-stone-400 text-sm mt-1">Redirection vers la conversation…</div>
          </div>
        )}
      </div>
    </div>
  );
}