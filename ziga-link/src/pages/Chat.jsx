import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { ArrowLeft, Send, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOwnerPhoto } from "@/components/useOwnerPhoto";
import { toUTC } from "@/components/lib/dateUtils";

function SenderAvatar({ senderEmail, senderName }) {
  const photo = useOwnerPhoto(senderEmail, null);
  if (photo) {
    return <img src={photo} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 self-end" />;
  }
  return (
    <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-600 flex-shrink-0 self-end">
      {(senderName || senderEmail)?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

export default function Chat() {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("request_id");
  const announcementId = searchParams.get("announcement_id");

  // CORRECTION : user depuis le contexte, plus d'appel auth.me()
  const { user } = useUserProfile();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [request, setRequest] = useState(null);
  const [announcement, setAnnouncement] = useState(null);
  const bottomRef = useRef(null);

  // CORRECTION : dépend de user, se relance si user change
  useEffect(() => { if (user) loadData(); }, [user?.email]);

  useEffect(() => {
    if (!requestId) return;
    const unsub = base44.entities.Message.subscribe((event) => {
      if (event.data?.request_id !== requestId) return;
      if (event.type === "create") {
        setMessages(prev => {
          if (prev.some(m => m.id === event.id)) return prev;
          return [...prev, event.data];
        });
      }
    });
    return unsub;
  }, [requestId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadData = async () => {
    if (!user) return;
    try {
      if (requestId) {
        const reqs = await base44.entities.MeetupRequest.filter({ id: requestId });
        if (reqs.length > 0) {
          setRequest(reqs[0]);
          const anns = await base44.entities.MeetupAnnouncement.filter({ id: reqs[0].announcement_id });
          if (anns.length > 0) setAnnouncement(anns[0]);
        }
      }
      await loadMessages();
    } catch (err) {
      console.error("Erreur chargement chat:", err);
    }
  };

  const loadMessages = async () => {
    if (!requestId) return;
    const msgs = await base44.entities.Message.filter({ request_id: requestId }, "created_date");
    setMessages(msgs);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;
    const content = newMessage.trim();
    setNewMessage("");

    const optimisticMsg = {
      id: `optimistic-${Date.now()}`,
      request_id: requestId,
      sender_email: user.email,
      sender_name: user.full_name || user.email,
      content,
      created_date: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    setSending(true);
    try {
      const created = await base44.entities.Message.create({
        request_id: requestId,
        sender_email: user.email,
        sender_name: user.full_name || user.email,
        content,
      });
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? { ...optimisticMsg, id: created.id } : m));
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

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-4 text-white flex items-center gap-3 sticky top-0 z-10">
        <Link to={announcementId ? `${createPageUrl("AnnouncementDetail")}?id=${announcementId}` : createPageUrl("Home")}>
          <ArrowLeft className="w-5 h-5 text-amber-100 hover:text-white" />
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <PawPrint className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-sm">{announcement?.title || "Chat"}</p>
            {request && (
              <p className="text-amber-100 text-xs">
                {request.requester_dog_name} × {announcement?.dog_name}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-amber-400 text-sm py-10">
            Démarrez la conversation ! 🐾
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_email === user?.email;
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
              {!isMe && <SenderAvatar senderEmail={msg.sender_email} senderName={msg.sender_name} />}
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                isMe ? "bg-amber-400 text-white rounded-br-sm" : "bg-white border border-amber-100 text-amber-900 rounded-bl-sm shadow-sm"
              }`}>
                {!isMe && <p className="text-xs font-semibold text-amber-500 mb-0.5">{msg.sender_name}</p>}
                <p>{msg.content}</p>
                <p className={`text-xs mt-1 ${isMe ? "text-amber-200" : "text-amber-400"}`}>
                  {toUTC(msg.created_date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 bg-white border-t border-amber-100 px-4 py-3 flex gap-2">
        <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder="Écrivez un message..." className="flex-1 border-amber-200" />
        <Button onClick={handleSend} disabled={sending || !newMessage.trim()} className="bg-amber-400 hover:bg-amber-500 text-white px-4">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}