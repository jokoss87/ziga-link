import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Bell, CheckCircle2, XCircle, Clock, ChevronRight, MessageCircle } from "lucide-react";

export default function NotificationsPanel({ user }) {
  const [requests, setRequests] = useState([]);
  const [myAnnouncements, setMyAnnouncements] = useState([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    // Récupère mes annonces
    const myAnns = await base44.entities.MeetupAnnouncement.filter({ created_by: user.email });
    setMyAnnouncements(myAnns);
    const annIds = myAnns.map(a => a.id);

    // Récupère aussi mes propres demandes envoyées
    const sentReqs = await base44.entities.MeetupRequest.filter({ created_by: user.email }, "-created_date", 20);

    // Rassemble tout
    const allReqs = sentReqs;
    setRequests(allReqs);
  };

  const handleOpenChat = async (req) => {
    // Trouve ou crée une conversation privée
    const otherEmail = req.created_by;
    const allConvs = await base44.entities.Conversation.list("-created_date", 50);
    const existing = allConvs.find(c =>
      c.type === "private" && c.members?.includes(user.email) && c.members?.includes(otherEmail)
    );
    if (existing) {
      navigate(`${createPageUrl("GroupChat")}?id=${existing.id}`);
    } else {
      const conv = await base44.entities.Conversation.create({
        type: "private",
        members: [user.email, otherEmail],
        created_by_name: user.full_name || user.email,
      });
      navigate(`${createPageUrl("GroupChat")}?id=${conv.id}`);
    }
    setOpen(false);
  };

  const statusConfig = {
    pending: { label: "En attente", color: "text-amber-600 bg-amber-50 border-amber-200", icon: Clock },
    accepted: { label: "Acceptée ✓", color: "text-green-700 bg-green-50 border-green-200", icon: CheckCircle2 },
    declined: { label: "Refusée", color: "text-red-600 bg-red-50 border-red-200", icon: XCircle },
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors"
      >
        <Bell className="w-5 h-5 text-white" />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
            {pendingCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-stone-100 z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50">
              <h3 className="font-bold text-stone-800 text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-teal-500" /> Mes demandes envoyées
              </h3>
              <span className="text-xs text-stone-400">{requests.length} demande{requests.length > 1 ? "s" : ""}</span>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-stone-50">
              {requests.length === 0 ? (
                <div className="py-8 text-center text-stone-400 text-sm">
                  <div className="text-3xl mb-2">🐾</div>
                  Aucune demande envoyée
                </div>
              ) : (
                requests.map(req => {
                  const cfg = statusConfig[req.status] || statusConfig.pending;
                  const Icon = cfg.icon;
                  return (
                    <div key={req.id} className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm flex-shrink-0">🐕</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-stone-800 text-xs truncate">{req.requester_dog_name}</p>
                          <p className="text-stone-500 text-xs mt-0.5 line-clamp-2">{req.message || "Demande de rencontre"}</p>
                          <span className={`inline-flex items-center gap-1 mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}>
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                      {req.status === "accepted" && (
                        <button
                          onClick={() => handleOpenChat(req)}
                          className="w-full mt-2 py-1.5 text-xs font-semibold text-teal-600 bg-teal-50 border border-teal-100 rounded-xl flex items-center justify-center gap-1.5 hover:bg-teal-100 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> Envoyer un message
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-stone-100 p-2">
              <button
                onClick={() => { navigate(createPageUrl("Messages")); setOpen(false); }}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-teal-600 hover:bg-teal-50 rounded-xl transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Voir tous mes messages
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}