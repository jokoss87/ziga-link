import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { UserCircle, UserMinus, Flame, Check, X, Bell, UserPlus, MessageCircle } from "lucide-react";
import FindFriends from "./FindFriends";
import { useOwnerPhoto } from "@/components/useOwnerPhoto";

function FriendAvatar({ profile }) {
  const dogPhoto = useOwnerPhoto(!profile.photo_url ? profile.created_by : null, null);
  const displayPhoto = profile.photo_url || dogPhoto;
  return displayPhoto
    ? <img src={displayPhoto} className="w-9 h-9 rounded-full object-cover flex-shrink-0" alt="" />
    : <UserCircle className="w-9 h-9 text-stone-300 flex-shrink-0" />;
}

export default function FriendsSection({ currentUserEmail }) {
  const navigate = useNavigate();
  const [friendList, setFriendList] = useState(null);
  const [friendProfiles, setFriendProfiles] = useState([]);
  const [pendingProfiles, setPendingProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("friends");
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);
  const [showFindFriends, setShowFindFriends] = useState(false);
  const [messagingEmail, setMessagingEmail] = useState(null);

  const showToast = useCallback((message) => {
    const id = Date.now();
    setToast({ message, id });
    setTimeout(() => setToast(t => t?.id === id ? null : t), 4000);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [friendRes, allNotifs] = await Promise.all([
      base44.functions.invoke('getFriendList', {}),
      base44.entities.Notification.filter({ user_email: currentUserEmail }, "-created_date", 30),
    ]);
    const list = friendRes.data?.list || { friends: [], friend_requests_received: [], friend_requests_sent: [], streaks: [] };
    setFriendList(list);
    setFriendProfiles(friendRes.data?.friendProfiles || []);
    setPendingProfiles(friendRes.data?.pendingProfiles || []);
    setNotifications(allNotifs);

    const unread = allNotifs.filter(n => !n.is_read && n.type === 'message' && n.link_page === 'Friends');
    if (unread.length > 0) showToast(unread[0].body);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentUserEmail]);

  const action = async (actionType, targetEmail) => {
    await base44.functions.invoke('friendActions', { action: actionType, targetEmail });
    await fetchData();
  };

  const startConversation = async (friendProfile) => {
    setMessagingEmail(friendProfile.created_by);
    const myProfiles = await base44.entities.UserProfile.filter({ created_by: currentUserEmail });
    const myProfile = myProfiles[0];

    // Chercher une conversation privée existante
    const allConvs = await base44.entities.Conversation.filter(
      { members: currentUserEmail },
      "-last_message_at",
      50
    );
    const existing = allConvs.find(c =>
      c.type === "private" &&
      c.members?.includes(currentUserEmail) &&
      c.members?.includes(friendProfile.created_by)
    );

    if (existing) {
      setMessagingEmail(null);
      navigate(`${createPageUrl("GroupChat")}?id=${existing.id}`);
      return;
    }

    // Créer une nouvelle conversation privée
    const newConv = await base44.entities.Conversation.create({
      type: "private",
      members: [currentUserEmail, friendProfile.created_by],
      member_pseudos: [myProfile?.pseudo || currentUserEmail, friendProfile.pseudo],
      member_photos: [myProfile?.photo_url || "", friendProfile.photo_url || ""],
      last_message: "",
      last_message_at: new Date().toISOString(),
      unread_counts: {},
    });
    setMessagingEmail(null);
    navigate(`${createPageUrl("GroupChat")}?id=${newConv.id}`);
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read && n.link_page === 'Friends');
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter(n => !n.is_read && n.link_page === 'Friends').length;

  if (loading) return <div className="p-6 text-center text-stone-400 text-sm">Chargement des amis...</div>;

  const renderFriends = () => (
    <div className="space-y-5 p-4">
      {/* Bouton trouver des amis */}
      <button
        onClick={() => setShowFindFriends(true)}
        className="w-full flex items-center justify-center gap-2 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-semibold text-sm transition-colors"
      >
        <UserPlus className="w-4 h-4" /> Trouver des amis
      </button>

      {/* Demandes reçues */}
      {pendingProfiles.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-stone-600 mb-2">Demandes d'amitié ({pendingProfiles.length})</h3>
          <div className="space-y-2">
            {pendingProfiles.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-teal-50 border border-teal-100 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <FriendAvatar profile={p} />
                  <span className="text-sm font-semibold text-stone-800">{p.pseudo}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => action('accept', p.created_by)} className="p-1.5 bg-teal-500 text-white rounded-lg"><Check className="w-4 h-4" /></button>
                  <button onClick={() => action('decline', p.created_by)} className="p-1.5 bg-stone-200 text-stone-600 rounded-lg"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liste amis */}
      <div>
        <h3 className="text-sm font-bold text-stone-600 mb-2">Mes amis ({friendProfiles.length})</h3>
        {friendProfiles.length === 0 ? (
          <p className="text-stone-400 text-sm text-center py-4">Pas encore d'amis. Cliquez sur "Trouver des amis" !</p>
        ) : (
          <div className="space-y-2">
            {friendProfiles.map(p => {
              const streak = friendList?.streaks?.find(s => s.friendEmail === p.created_by);
              return (
                <div key={p.id} className="flex items-center justify-between bg-white border border-stone-100 rounded-xl p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <FriendAvatar profile={p} />
                    <div>
                      <p className="text-sm font-semibold text-stone-800">{p.pseudo}</p>
                      <p className="text-xs text-stone-400">{p.city}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {streak?.daysInARow > 1 && (
                      <span className="flex items-center gap-0.5 text-orange-500 text-xs font-bold">
                        <Flame className="w-3.5 h-3.5" />{streak.daysInARow}
                      </span>
                    )}
                    <button
                      onClick={() => startConversation(p)}
                      disabled={messagingEmail === p.created_by}
                      className="p-1.5 bg-teal-50 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors disabled:opacity-50"
                      title="Envoyer un message"
                    >
                      {messagingEmail === p.created_by
                        ? <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                        : <MessageCircle className="w-4 h-4" />}
                    </button>
                    <button onClick={() => action('remove', p.created_by)} className="p-1.5 text-stone-400 hover:text-red-500">
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="px-4 space-y-3 pb-6">
      {notifications.length === 0 ? (
        <p className="text-center text-stone-400 text-sm py-8">Aucune notification</p>
      ) : (
        <>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-teal-600 font-semibold underline">Tout marquer comme lu</button>
          )}
          {notifications.map(n => (
            <div key={n.id} className={`flex items-start gap-3 p-3 rounded-xl border ${n.is_read ? "bg-white border-stone-100" : "bg-teal-50 border-teal-200"}`}>
              <Bell className={`w-4 h-4 mt-0.5 flex-shrink-0 ${n.is_read ? "text-stone-300" : "text-teal-500"}`} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-stone-800">{n.title}</p>
                <p className="text-xs text-stone-500">{n.body}</p>
              </div>
              {!n.is_read && (
                <button onClick={() => base44.entities.Notification.update(n.id, { is_read: true }).then(fetchData)} className="text-xs text-stone-400 hover:text-teal-600">✓</button>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );

  return (
    <div>
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-teal-600 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold flex items-center gap-2">
          <Bell className="w-4 h-4" /> {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100"><X className="w-3 h-3" /></button>
        </div>
      )}

      <div className="flex border-b border-stone-200 mb-4">
        <button onClick={() => setTab("friends")} className={`flex-1 py-2.5 text-sm font-semibold ${tab === "friends" ? "border-b-2 border-teal-500 text-teal-600" : "text-stone-400"}`}>
          Amis
        </button>
        <button onClick={() => setTab("notifications")} className={`flex-1 py-2.5 text-sm font-semibold relative ${tab === "notifications" ? "border-b-2 border-teal-500 text-teal-600" : "text-stone-400"}`}>
          Notifications
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-6 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{unreadCount}</span>
          )}
        </button>
      </div>

      {tab === "notifications" ? renderNotifications() : renderFriends()}

      {showFindFriends && (
        <FindFriends
          currentUserEmail={currentUserEmail}
          onClose={() => { setShowFindFriends(false); fetchData(); }}
        />
      )}
    </div>
  );
}