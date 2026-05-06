import { useState, useEffect } from "react";
import { useAsync } from "@/hooks/useAsync";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { PenSquare, MessageCircle, Search, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConversationListItem from "@/components/messaging/ConversationListItem";
import NewConversationModal from "@/components/messaging/NewConversationModal";

export default function Messages() {
  const { user } = useUserProfile();
  const [pseudo, setPseudo] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [myPhoto, setMyPhoto] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [friendEmails, setFriendEmails] = useState(new Set());
  const [pendingEmails, setPendingEmails] = useState(new Set());
  const navigate = useNavigate();
  const { status, run } = useAsync();

  useEffect(() => { if (user) loadData(); }, [user?.email]);

  useEffect(() => {
    const unsub = base44.entities.Conversation.subscribe((event) => {
      if (event.type === "create") {
        if (event.data?.members?.includes(user?.email)) {
          setConversations(prev => {
            if (prev.find(c => c.id === event.data.id)) return prev;
            return [event.data, ...prev];
          });
        }
      } else if (event.type === "update") {
        setConversations(prev => prev.map(c =>
          c.id === (event.data?.id || event.id) ? { ...c, ...event.data } : c
        ));
      } else if (event.type === "delete") {
        const deletedId = event.data?.id || event.id;
        setConversations(prev => prev.filter(c => c.id !== deletedId));
      }
    });
    return unsub;
  }, []);

  const loadData = () => {
    if (status === "loading") return;
    run(async () => {
      if (!user) return;
      const [myProfiles, mine] = await Promise.all([
        base44.entities.UserProfile.filter({ created_by: user.email }),
        base44.entities.Conversation.filter({ members: user.email }, "-last_message_at", 50),
      ]);
      const myProfile = myProfiles[0];
      setPseudo(myProfile?.pseudo || user.full_name);
      setMyPhoto(myProfile?.photo_url || "");
      setConversations(mine);
      // Chargement des amis en parallèle non-bloquant
      base44.functions.invoke("getFriendList", {}).then(friendRes => {
        const fr = friendRes.data?.list || {};
        setFriendEmails(new Set(fr.friends || []));
        setPendingEmails(new Set(fr.friend_requests_sent || []));
      }).catch(() => {});
    });
  };

  const openChat = (conv) => {
    if (conv.unread_counts?.[user?.email] > 0) {
      const newCounts = { ...(conv.unread_counts || {}), [user.email]: 0 };
      // Mise à jour locale immédiate pour que le badge disparaisse sans attendre
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_counts: newCounts } : c));
      base44.entities.Conversation.update(conv.id, { unread_counts: newCounts }).catch(() => {});
    }
    navigate(`${createPageUrl("GroupChat")}?id=${conv.id}`);
  };

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread_counts?.[user?.email] || 0), 0);

  const filtered = conversations.filter(conv => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = conv.name || "";
    const pseudos = (conv.member_pseudos || []).join(" ");
    return name.toLowerCase().includes(q) || pseudos.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      <div className="bg-gradient-to-br from-teal-600 to-emerald-700 px-6 pt-10 pb-6 text-white">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4 gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-black flex items-center gap-2">
                <MessageCircle className="w-6 h-6 flex-shrink-0" />
                <span className="truncate">Messages</span>
                {totalUnread > 0 && (
                  <span className="bg-white text-teal-600 text-sm font-black rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0">
                    {totalUnread > 9 ? "9+" : totalUnread}
                  </span>
                )}
              </h1>
              {pseudo && (
                <p className="text-teal-200 text-sm mt-1 truncate">
                  Connecté en tant que <span className="font-bold text-white">{pseudo}</span>
                </p>
              )}
            </div>
            <Button
              onClick={() => setShowNew(true)}
              className="bg-white text-teal-700 hover:bg-teal-50 font-bold rounded-xl gap-1.5 shadow flex-shrink-0 text-sm px-3"
            >
              <PenSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Nouvelle conversation</span>
              <span className="sm:hidden">Nouveau</span>
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-300" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher une conversation..."
              className="pl-9 bg-white/20 border-white/20 text-white placeholder:text-teal-200 rounded-xl"
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {conversations.filter(c => c.members?.some(m =>
          m.includes("admin") || m === "admin@zigalink.local"
        )).length > 0 && (
          <div className="mb-4 bg-blue-50 border-2 border-blue-300 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-blue-900 text-sm">📢 Information importante de l'administrateur</h3>
              <p className="text-xs text-blue-700 mt-1">Vous avez un message privé de l'équipe Ziga Link.</p>
            </div>
          </div>
        )}

        {status === "loading" ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-400 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 p-10 text-center shadow-sm">
            <div className="text-5xl mb-4">💬</div>
            <p className="font-semibold text-stone-700 mb-1">Aucune conversation</p>
            <p className="text-sm text-stone-400 mb-5">Créez une discussion privée ou un groupe !</p>
            <Button
              onClick={() => setShowNew(true)}
              className="bg-teal-500 hover:bg-teal-600 text-white rounded-xl gap-2"
            >
              <PenSquare className="w-4 h-4" /> Nouvelle conversation
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(conv => (
              <ConversationListItem
                key={conv.id}
                conv={conv}
                currentUserEmail={user?.email}
                onClick={() => openChat(conv)}
                friendEmails={friendEmails}
                pendingEmails={pendingEmails}
                onAddFriend={async (targetEmail) => {
                  await base44.functions.invoke("friendActions", { action: "send", targetEmail });
                  setPendingEmails(prev => new Set([...prev, targetEmail]));
                }}
              />
            ))}
          </div>
        )}
      </div>

      {showNew && (
        <NewConversationModal
          currentUser={user}
          currentPseudo={pseudo}
          currentPhoto={myPhoto}
          onClose={() => setShowNew(false)}
          onCreated={(id) => {
            setShowNew(false);
            navigate(`${createPageUrl("GroupChat")}?id=${id}`);
          }}
        />
      )}
    </div>
  );
}