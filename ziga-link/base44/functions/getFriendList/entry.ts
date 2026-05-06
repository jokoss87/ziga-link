import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const results = await base44.asServiceRole.entities.FriendList.filter({ user_email: user.email });
  const list = results[0] || { friends: [], friend_requests_received: [], friend_requests_sent: [], streaks: [] };

  // Fetch friend profiles and pending profiles via service role (frontend can't read other users' profiles)
  let friendProfiles = [];
  let pendingProfiles = [];

  const allEmails = [
    ...(list.friends || []),
    ...(list.friend_requests_received || []),
  ];

  if (allEmails.length > 0) {
    const profileResults = await Promise.all(
      allEmails.map(email =>
        base44.asServiceRole.entities.UserProfile.filter({ created_by: email }, "-created_date", 1)
          .then(r => r[0] || { created_by: email, pseudo: email, city: '', photo_url: '' })
          .catch(() => ({ created_by: email, pseudo: email, city: '', photo_url: '' }))
      )
    );
    const byEmail = {};
    profileResults.forEach(p => { byEmail[p.created_by] = p; });

    if (list.friends?.length > 0) {
      friendProfiles = list.friends.map(email => byEmail[email] || { created_by: email, pseudo: email, city: '', photo_url: '' });
    }
    if (list.friend_requests_received?.length > 0) {
      pendingProfiles = list.friend_requests_received.map(email => byEmail[email] || { created_by: email, pseudo: email, city: '', photo_url: '' });
    }
  }

  return Response.json({ list, friendProfiles, pendingProfiles });
});