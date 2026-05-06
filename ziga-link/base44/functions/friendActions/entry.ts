import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Helper: get or create FriendList for a user
async function getOrCreate(base44, email) {
  const results = await base44.asServiceRole.entities.FriendList.filter({ user_email: email });
  if (results.length > 0) return results[0];
  return await base44.asServiceRole.entities.FriendList.create({
    user_email: email,
    friend_requests_sent: [],
    friend_requests_received: [],
    friends: [],
    streaks: [],
  });
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { action, targetEmail, lastActivityDate } = await req.json();

  if (action === 'send') {
    const [me, target] = await Promise.all([
      getOrCreate(base44, user.email),
      getOrCreate(base44, targetEmail),
    ]);
    // Prevent duplicate requests
    if (me.friend_requests_sent.includes(targetEmail)) {
      return Response.json({ success: false, reason: 'already_sent' });
    }
    const myProfiles = await base44.asServiceRole.entities.UserProfile.filter({ created_by: user.email });
    const myPseudo = myProfiles[0]?.pseudo || user.email;

    await Promise.all([
      base44.asServiceRole.entities.FriendList.update(me.id, {
        friend_requests_sent: [...me.friend_requests_sent, targetEmail],
      }),
      base44.asServiceRole.entities.FriendList.update(target.id, {
        friend_requests_received: [...target.friend_requests_received, user.email],
      }),
      // Notify the target
      base44.asServiceRole.entities.Notification.create({
        user_email: targetEmail,
        type: 'message',
        title: '🐾 Nouvelle demande d\'ami',
        body: `${myPseudo} vous a envoyé une demande d'ami.`,
        link_page: 'Friends',
        is_read: false,
      }),
    ]);
    return Response.json({ success: true });
  }

  if (action === 'accept') {
    const [me, requester] = await Promise.all([
      getOrCreate(base44, user.email),
      getOrCreate(base44, targetEmail),
    ]);
    // Get my profile for the notification message
    const myProfiles = await base44.asServiceRole.entities.UserProfile.filter({ created_by: user.email });
    const myPseudo = myProfiles[0]?.pseudo || user.email;

    const myFriends = (me.friends || []);
    const reqFriends = (requester.friends || []);
    // Guard: already friends — but still clean up the pending request if it exists
    if (myFriends.includes(targetEmail)) {
      if ((me.friend_requests_received || []).includes(targetEmail)) {
        await base44.asServiceRole.entities.FriendList.update(me.id, {
          friend_requests_received: (me.friend_requests_received || []).filter(e => e !== targetEmail),
        });
      }
      return Response.json({ success: true, reason: 'already_friends' });
    }
    await Promise.all([
      base44.asServiceRole.entities.FriendList.update(me.id, {
        friends: [...myFriends, targetEmail],
        friend_requests_received: (me.friend_requests_received || []).filter(e => e !== targetEmail),
      }),
      base44.asServiceRole.entities.FriendList.update(requester.id, {
        friends: reqFriends.includes(user.email) ? reqFriends : [...reqFriends, user.email],
        friend_requests_sent: (requester.friend_requests_sent || []).filter(e => e !== user.email),
      }),
      // Notify the requester that their request was accepted
      base44.asServiceRole.entities.Notification.create({
        user_email: targetEmail,
        type: 'message',
        title: '🐾 Demande acceptée !',
        body: `${myPseudo} a accepté votre demande d'ami.`,
        link_page: 'Friends',
        is_read: false,
      }),
    ]);
    return Response.json({ success: true });
  }

  if (action === 'decline') {
    const [me, requester] = await Promise.all([
      getOrCreate(base44, user.email),
      getOrCreate(base44, targetEmail),
    ]);
    await Promise.all([
      base44.asServiceRole.entities.FriendList.update(me.id, {
        friend_requests_received: me.friend_requests_received.filter(e => e !== targetEmail),
      }),
      base44.asServiceRole.entities.FriendList.update(requester.id, {
        friend_requests_sent: requester.friend_requests_sent.filter(e => e !== user.email),
      }),
    ]);
    return Response.json({ success: true });
  }

  if (action === 'remove') {
    const [me, friend] = await Promise.all([
      getOrCreate(base44, user.email),
      getOrCreate(base44, targetEmail),
    ]);
    await Promise.all([
      base44.asServiceRole.entities.FriendList.update(me.id, {
        friends: me.friends.filter(e => e !== targetEmail),
        streaks: me.streaks.filter(s => s.friendEmail !== targetEmail),
      }),
      base44.asServiceRole.entities.FriendList.update(friend.id, {
        friends: friend.friends.filter(e => e !== user.email),
        streaks: friend.streaks.filter(s => s.friendEmail !== user.email),
      }),
    ]);
    return Response.json({ success: true });
  }

  if (action === 'streak') {
    const me = await getOrCreate(base44, user.email);
    const streaks = [...me.streaks];
    const idx = streaks.findIndex(s => s.friendEmail === targetEmail);
    const today = new Date(lastActivityDate);

    if (idx >= 0) {
      const diff = (today - new Date(streaks[idx].lastSharedActivity)) / (1000 * 60 * 60 * 24);
      streaks[idx] = {
        ...streaks[idx],
        daysInARow: diff === 1 ? streaks[idx].daysInARow + 1 : 1,
        lastSharedActivity: lastActivityDate,
      };
    } else {
      streaks.push({ friendEmail: targetEmail, daysInARow: 1, lastSharedActivity: lastActivityDate });
    }
    await base44.asServiceRole.entities.FriendList.update(me.id, { streaks });
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
});