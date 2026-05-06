import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const [allFriendLists, allProfiles] = await Promise.all([
    base44.asServiceRole.entities.FriendList.list(),
    base44.asServiceRole.entities.UserProfile.list(),
  ]);

  const validEmails = new Set(allProfiles.map(p => p.created_by));
  let cleaned = 0;
  let updated = 0;

  for (const fl of allFriendLists) {
    // If owner no longer exists, delete the whole list
    if (!validEmails.has(fl.user_email)) {
      await base44.asServiceRole.entities.FriendList.delete(fl.id);
      cleaned++;
      continue;
    }

    // Clean orphaned entries in friends / requests arrays
    const originalFriends = fl.friends || [];
    const originalReceived = fl.friend_requests_received || [];
    const originalSent = fl.friend_requests_sent || [];

    const cleanFriends = originalFriends.filter(e => validEmails.has(e));
    const cleanReceived = originalReceived.filter(e => validEmails.has(e));
    const cleanSent = originalSent.filter(e => validEmails.has(e));

    const hasChanged =
      cleanFriends.length !== originalFriends.length ||
      cleanReceived.length !== originalReceived.length ||
      cleanSent.length !== originalSent.length;

    if (hasChanged) {
      await base44.asServiceRole.entities.FriendList.update(fl.id, {
        friends: cleanFriends,
        friend_requests_received: cleanReceived,
        friend_requests_sent: cleanSent,
      });
      updated++;
    }
  }

  console.log(`[auditFriendList] deleted=${cleaned}, updated=${updated}, total=${allFriendLists.length}`);
  return Response.json({ success: true, deleted: cleaned, updated, total: allFriendLists.length });
});