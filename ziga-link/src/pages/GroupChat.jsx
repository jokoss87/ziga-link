import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { ArrowLeft, Send, Users, Lock, Info, Trash2, UserPlus, UserCheck, Clock } from "lucide-react";
import SupportBadge from "@/components/support/SupportBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toUTC } from "@/components/lib/dateUtils";
import GroupInfoModal from "@/components/messaging/GroupInfoModal";
import { useOwnerPhoto } from "@/components/useOwnerPhoto";
import ActivityProposalCard from "@/components/messaging/ActivityProposalCard";
import { toast } from "sonner";
import { CAT } from "@/components/lib/categoryColors";

// Palette de couleurs selon la catégorie du groupe
const GROUP_PALETTE = {
  balade:     { header: "linear-gradient(135deg, #14b8a6, #0d9488)", bubble: "#14b8a6", bubbleBg: "#f0fdfa", bubbleText: "#134e4a", timestamp: "#99f6e4" },
  sport:      { header: "linear-gradient(135deg, #f97316, #ea580c)", bubble: "#f97316", bubbleBg: "#fff7ed", bubbleText: "#7c2d12", timestamp: "#fed7aa" },
  obeissance: { header: "linear-gradient(135deg, #8b5cf6, #7c3aed)", bubble: "#8b5cf6", bubbleBg: "#f5f3ff", bubbleText: "#4c1d95", timestamp: "#ddd6fe" },
  default:    { header: "linear-gradient(135deg, #4CAF87, #3d9e78)", bubble: "#4CAF87", bubbleBg: "#f0fdf4", bubbleText: "#14532d", timestamp: "#86efac" },
};

function SenderAvatar({ senderEmail, senderPseudo }) {
  const photo = useOwnerPhoto(senderEmail, null);
  if (photo) {
    return <img src={photo} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 mb-0.5" />;
  }
  return (
    <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-600 flex-shrink-0 mb-0.5">
      {(senderPseudo || senderEmail)?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

export default function GroupChat() {
  const [searchParams] = useSearchParams();
  const convId = searchParams.get("id");
  const navigate = useNavigate();

  const { user } = useUserProfile();
  const [pseudo, setPseudo] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [friendStatus, setFriendStatus] = useState("none");
  const [addingFriend, setAddingFriend] = useState(false);
  const bottomRef = useRef(null);
  const markedReadRef = useRef(false);

  useEffect(() => { if (user) { markedReadRef.current = false; loadData(); } }, [convId, user?.email]);

  useEffect(() => {
    const unsub = base44.entities.ConversationMessage.subscribe((event) => {
      if (event.data?.conversation_id !== convId) return;
      if (event.type === "create") {
        setMessages(prev => {
          // Ignorer si déjà présent (par ID réel ou via message optimiste remplacé)
          if (prev.find(m => m.id === event.id)) return prev;
          // Ignorer les messages envoyés par nous-mêmes (déjà ajoutés en optimiste)
          if (event.data?.sender_email === user?.email) return prev;
          return [...prev, event.data];
        });
      }
    });
    return unsub;
  }, [convId, user?.email]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!conversation || !user?.email || markedReadRef.current) return;
    markedReadRef.current = true;

    // 1. Remettre le compteur de messages non lus à 0
    const unread = conversation.unread_counts?.[user.email] || 0;
    if (unread > 0) {
      base44.entities.Conversation.update(convId, {
        unread_counts: { ...(conversation.unread_counts || {}), [user.email]: 0 }
      }).catch(() => {});
    }

    // 2. Marquer toutes les notifications liées à cette conversation comme lues
    base44.entities.Notification.filter(
      { user_email: user.email, reference_id: convId, is_read: false },
      "-created_date",
      50
    ).then(notifs => {
      notifs.forEach(n => base44.entities.Notification.update(n.id, { is_read: true }).catch(() => {}));
    }).catch(() => {});
  }, [conversation, user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
      setPseudo(profiles[0]?.pseudo || user.full_name);
      if (convId) {
        // Essai 1 : filtre standard (marche si l'user est membre)
        let conv = null;
        const convs = await base44.entities.Conversation.filter({ id: convId }, "-created_date", 1).catch(() => []);
        if (convs.length > 0) {
          conv = convs[0];
        } else {
          // Essai 2 : admin — liste toutes ses convs et cherche par ID
          const all = await base44.entities.Conversation.list("-last_message_at", 200).catch(() => []);
          conv = all.find(c => c.id === convId) || null;
        }
        if (conv) {
          setConversation(conv);
          if (conv.type === "private" && user?.email) {
            const otherIdx = (conv.members || []).findIndex(e => e !== user.email);
            const otherEmail = otherIdx >= 0 ? conv.members[otherIdx] : null;
            if (otherEmail) {
              const lists = await base44.entities.FriendList.filter({ user_email: user.email }).catch(() => []);
              const myList = lists[0];
              if (myList?.friends?.includes(otherEmail)) setFriendStatus("friend");
              else if (myList?.friend_requests_sent?.includes(otherEmail)) setFriendStatus("pending");
              else setFriendStatus("none");
            }
          }
        }
        const msgs = await base44.entities.ConversationMessage.filter({ conversation_id: convId }, "created_date", 500);
        setMessages(msgs);
      }
    } catch (err) {
      console.error("Erreur chargement conversation:", err);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !convId) return;
    const content = newMessage.trim();
    // Attendre que pseudo et conversation soient chargés
    const senderPseudo = pseudo || user.full_name || user.email;
    setNewMessage("");

    const optimisticMsg = {
      id: `optimistic-${Date.now()}`,
      conversation_id: convId,
      sender_email: user.email,
      sender_pseudo: senderPseudo,
      content,
      created_date: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    setSending(true);
    try {
      const created = await base44.entities.ConversationMessage.create({
        conversation_id: convId,
        sender_email: user.email,
        sender_pseudo: senderPseudo,
        content,
      });
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? { ...optimisticMsg, id: created.id } : m));

      // Recharger la conversation si pas encore disponible
      let conv = conversation;
      if (!conv) {
        const convs = await base44.entities.Conversation.filter({ id: convId }).catch(() => []);
        conv = convs[0] || null;
        if (!conv) {
          const all = await base44.entities.Conversation.list("-last_message_at", 200).catch(() => []);
          conv = all.find(c => c.id === convId) || null;
        }
        if (conv) setConversation(conv);
      }

      const members = conv?.members || [];
      const currentUnread = conv?.unread_counts || {};
      const newUnread = { ...currentUnread };
      const isGroup = conv?.type === "group";
      const otherMembers = members.filter(email => email !== user.email);
      otherMembers.forEach(email => { newUnread[email] = (newUnread[email] || 0) + 1; });

      await base44.entities.Conversation.update(convId, {
        last_message: content.length > 50 ? content.slice(0, 50) + "..." : content,
        last_message_at: new Date().toISOString(),
        last_message_by: senderPseudo,
        unread_counts: newUnread,
      }).catch(() => {});

      const notifTitle = isGroup
        ? `💬 ${senderPseudo} dans ${conv?.name || "le groupe"}`
        : `💬 Message de ${senderPseudo}`;
      await Promise.all(otherMembers.map(email =>
        base44.entities.Notification.create({
          user_email: email,
          type: isGroup ? "group_message" : "message",
          title: notifTitle,
          body: content.length > 60 ? content.slice(0, 60) + "..." : content,
          reference_id: convId,
          link_page: "GroupChat",
          link_param: `id=${convId}`,
          is_read: false,
        })
      ));
    } catch (err) {
      console.error("Erreur envoi message:", err);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const otherEmail = (() => {
    const members = conversation?.members || [];
    const idx = members.findIndex(e => e !== user?.email);
    return idx >= 0 ? members[idx] : null;
  })();

  const handleAddFriend = async () => {
    if (!otherEmail || addingFriend || friendStatus !== "none") return;
    setAddingFriend(true);
    try {
      await base44.functions.invoke("friendActions", { action: "send", targetEmail: otherEmail });
      setFriendStatus("pending");
      toast.success("✅ Demande d'ami envoyée !");
    } catch (err) {
      console.error("Erreur ajout ami:", err);
      toast.error("❌ Erreur : impossible d'envoyer la demande");
    } finally {
      setAddingFriend(false);
    }
  };

  const deleteConversation = async () => {
    if (!window.confirm("Supprimer cette conversation ?")) return;
    try {
      await base44.entities.Conversation.delete(convId);
      navigate(createPageUrl("Messages"));
    } catch (err) {
      console.error("Erreur suppression conversation:", err);
    }
  };

  const isGroup = conversation?.type === "group";
  const convMembers = conversation?.members || [];
  const convPhotos = conversation?.member_photos || [];
  const otherIndex = convMembers.findIndex(e => e !== user?.email);
  const otherPseudo = otherIndex >= 0 ? (conversation?.member_pseudos || [])[otherIndex] : null;
  const otherPhoto = otherIndex >= 0 ? convPhotos[otherIndex] : null;
  const displayName = conversation?.name || (isGroup ? "Groupe" : (otherPseudo ? `@${otherPseudo}` : "Conversation"));
  const palette = isGroup
    ? (GROUP_PALETTE[conversation?.category] || GROUP_PALETTE.default)
    : { header: "linear-gradient(135deg, #14b8a6, #0d9488)", bubble: "#14b8a6", bubbleBg: "#f0fdfa", bubbleText: "#134e4a", timestamp: "#99f6e4" };

  return (
    <div className="h-screen flex flex-col bg-stone-50">
      <div className="px-4 py-3.5 text-white flex items-center gap-3 sticky top-0 z-10" style={{ background: palette.header }}>
        <button onClick={() => navigate(createPageUrl("Messages"))}>
          <ArrowLeft className="w-5 h-5 text-white/80 hover:text-white" />
        </button>
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-white/20 font-bold overflow-hidden">
          {isGroup ? <Users className="w-4 h-4" /> : otherPhoto ? <img src={otherPhoto} alt="" className="w-full h-full object-cover" /> : <Lock className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{displayName}</p>
          <p className="text-white/70 text-xs truncate">{isGroup ? `${conversation?.members?.length || 0} membres` : "Conversation privée"}</p>
        </div>
        <div className="flex items-center gap-1">
          {isGroup && (
            <button onClick={() => setShowInfo(true)} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
              <Info className="w-4 h-4 text-white/80" />
            </button>
          )}
          {!isGroup && otherEmail && friendStatus !== "friend" && (
            <button onClick={handleAddFriend} disabled={addingFriend || friendStatus === "pending"} className="p-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-60" title={friendStatus === "pending" ? "Demande envoyée" : "Ajouter en ami"}>
              {friendStatus === "pending" ? <Clock className="w-4 h-4 text-white/70" /> : addingFriend ? <div className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" /> : <UserPlus className="w-4 h-4 text-white/80" />}
            </button>
          )}
          {!isGroup && friendStatus === "friend" && (
            <div className="p-1.5" title="Déjà amis 🐾"><UserCheck className="w-4 h-4 text-white/70" /></div>
          )}
          <button onClick={deleteConversation} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <Trash2 className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>

      {!isGroup && otherEmail && friendStatus === "none" && (
        <div className="bg-teal-50 border-b border-teal-100 px-4 py-2.5 flex items-center justify-between">
          <p className="text-xs text-teal-700">🐾 Vous n'êtes pas encore amis</p>
          <button onClick={handleAddFriend} disabled={addingFriend} className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
            {addingFriend ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
            Ajouter en ami
          </button>
        </div>
      )}
      {!isGroup && otherEmail && friendStatus === "pending" && (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-2.5 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <p className="text-xs text-amber-700">Demande d'ami envoyée — en attente de réponse</p>
        </div>
      )}

      {messages.some(m => m.sender_pseudo === "🛡️ ADMIN") && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-4 py-3 flex items-start gap-2">
          <div className="text-lg flex-shrink-0 mt-0.5">📢</div>
          <div>
            <p className="text-xs font-bold text-blue-900">Information importante de l'administrateur</p>
            <p className="text-[11px] text-blue-700 mt-0.5">Vous avez reçu un message officiel de l'équipe Ziga Link</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-stone-400 text-sm py-12">
            <div className="text-4xl mb-3">👋</div>
            Démarrez la conversation !
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender_email === user?.email;
          const showSender = !isMe && (i === 0 || messages[i - 1]?.sender_email !== msg.sender_email);
          const senderDisplay = msg.sender_pseudo ? `@${msg.sender_pseudo}` : "Utilisateur";
          const isActivityProposal = msg.content?.startsWith("[ACTIVITY_PROPOSAL]");
          const isAccepted = msg.content?.includes("[PROPOSAL_ACCEPTED]");
          const isDeclined = msg.content?.includes("[PROPOSAL_DECLINED]");
          const cleanContent = msg.content
            ?.replace(/\[PROPOSAL_ACCEPTED\]/g, "")
            .replace(/\[PROPOSAL_DECLINED\]/g, "")
            .replace(/\[PROPOSAL_RESCHEDULE\]/g, "")
            .trim();

          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[82%] ${!isMe ? "flex items-end gap-2" : ""}`}>
                {!isMe && <SenderAvatar senderEmail={msg.sender_email} senderPseudo={msg.sender_pseudo} />}
                <div>
                  {showSender && !isMe && (
            <div className="flex items-center gap-1 mb-0.5 ml-1">
              <p className="text-xs text-stone-400 font-medium">{senderDisplay}</p>
              <SupportBadge userEmail={msg.sender_email} badgeText="🐾" />
            </div>
          )}
                  {isActivityProposal ? (
                    <ActivityProposalCard msg={msg} isMe={isMe} convId={convId} conversation={conversation} pseudo={pseudo} user={user} messages={messages} msgIndex={i} onMessageSent={(newMsg) => setMessages(prev => [...prev, newMsg])} />
                  ) : isMe ? (
                      <div
                        className="px-4 py-2.5 rounded-2xl rounded-br-sm text-sm whitespace-pre-line text-white"
                        style={{ background: isDeclined ? "#9ca3af" : palette.bubble }}
                      >
                        <p>{cleanContent}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {toUTC(msg.created_date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    ) : msg.sender_pseudo === "🛡️ ADMIN" ? (
                      <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm whitespace-pre-line bg-blue-50 border border-blue-300 text-blue-900 shadow-md font-semibold">
                        <p>{cleanContent}</p>
                        <p className="text-xs mt-1 text-blue-400">
                          {toUTC(msg.created_date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    ) : (
                      <div
                        className="px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm whitespace-pre-line border shadow-sm"
                        style={{ background: isDeclined ? "#f1f5f9" : isAccepted ? palette.bubbleBg : "white", borderColor: isAccepted ? palette.bubble + "40" : "#f1f5f9", color: palette.bubbleText }}
                      >
                        <p>{cleanContent}</p>
                        <p className="text-xs mt-1 text-stone-400">
                          {toUTC(msg.created_date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="bg-white border-t border-stone-100 px-4 py-3 flex gap-2">
        <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder="Écrivez un message..." className="flex-1 border-stone-200 rounded-xl" />
        <Button onClick={handleSend} disabled={sending || !newMessage.trim()} className="text-white rounded-xl px-4" style={{ background: palette.bubble }}>
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {showInfo && conversation && (
        <GroupInfoModal conversation={conversation} currentUser={user} currentPseudo={pseudo} onClose={() => setShowInfo(false)} onLeft={() => navigate(createPageUrl("Messages"))} onUpdated={loadData} />
      )}
    </div>
  );
}