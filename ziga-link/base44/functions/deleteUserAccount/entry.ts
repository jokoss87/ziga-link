import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { email } = await req.json();
  if (!email) return Response.json({ error: 'Missing email' }, { status: 400 });

  const deleted = {};

  // Fetch all related entities in parallel
  const [profiles, dogs, friendLists, posts, conversations, announcements, activities, reports, notifications, progressEntries] = await Promise.all([
    base44.asServiceRole.entities.UserProfile.filter({ created_by: email }),
    base44.asServiceRole.entities.DogProfile.filter({ created_by: email }),
    base44.asServiceRole.entities.FriendList.filter({ user_email: email }),
    base44.asServiceRole.entities.Post.filter({ created_by: email }),
    base44.asServiceRole.entities.Conversation.list(),
    base44.asServiceRole.entities.MeetupAnnouncement.filter({ created_by: email }),
    base44.asServiceRole.entities.Activity.filter({ created_by: email }),
    base44.asServiceRole.entities.Report.filter({ created_by: email }),
    base44.asServiceRole.entities.Notification.filter({ user_email: email }),
    base44.asServiceRole.entities.ProgressEntry.filter({ created_by: email }),
  ]);

  // Delete all in parallel batches
  const deleteAll = (list) => Promise.all(list.map(i => base44.asServiceRole.entities[i._entity].delete(i.id).catch(() => {})));

  // Tag entity type on each record for generic delete
  const tag = (list, entity) => list.map(i => ({ ...i, _entity: entity }));

  // Remove user from conversations (don't delete group convos, just remove them)
  const convToUpdate = conversations.filter(c => c.members?.includes(email));
  await Promise.all(convToUpdate.map(async (c) => {
    const newMembers = (c.members || []).filter(e => e !== email);
    if (newMembers.length <= 1) {
      // Private conv with no members left → delete
      await base44.asServiceRole.entities.Conversation.delete(c.id).catch(() => {});
    } else {
      // Group conv → just remove user
      await base44.asServiceRole.entities.Conversation.update(c.id, { members: newMembers }).catch(() => {});
    }
  }));

  // Also remove email from other users' FriendList entries
  const allFriendLists = await base44.asServiceRole.entities.FriendList.list();
  await Promise.all(allFriendLists.map(async (fl) => {
    if (fl.user_email === email) return; // own list handled below
    const changed =
      fl.friends?.includes(email) ||
      fl.friend_requests_sent?.includes(email) ||
      fl.friend_requests_received?.includes(email);
    if (!changed) return;
    await base44.asServiceRole.entities.FriendList.update(fl.id, {
      friends: (fl.friends || []).filter(e => e !== email),
      friend_requests_sent: (fl.friend_requests_sent || []).filter(e => e !== email),
      friend_requests_received: (fl.friend_requests_received || []).filter(e => e !== email),
    }).catch(() => {});
  }));

  await Promise.all([
    ...tag(profiles, 'UserProfile'),
    ...tag(dogs, 'DogProfile'),
    ...tag(friendLists, 'FriendList'),
    ...tag(posts, 'Post'),
    ...tag(announcements, 'MeetupAnnouncement'),
    ...tag(activities, 'Activity'),
    ...tag(reports, 'Report'),
    ...tag(notifications, 'Notification'),
    ...tag(progressEntries, 'ProgressEntry'),
  ].map(i => base44.asServiceRole.entities[i._entity].delete(i.id).catch(() => {})));

  deleted.profiles = profiles.length;
  deleted.dogs = dogs.length;
  deleted.friendLists = allFriendLists.filter(fl => fl.user_email === email).length;
  deleted.posts = posts.length;
  deleted.conversations = convToUpdate.length;
  deleted.announcements = announcements.length;
  deleted.activities = activities.length;
  deleted.notifications = notifications.length;
  deleted.progressEntries = progressEntries.length;

  // Log moderation action
  await base44.asServiceRole.entities.ModerationLog.create({
    moderator_email: user.email,
    target_user_email: email,
    target_user_name: profiles[0]?.pseudo || email,
    action: "account_deleted_cascade",
  }).catch(() => {});

  console.log(`[deleteUserAccount] purged ${email}:`, JSON.stringify(deleted));
  return Response.json({ success: true, deleted });
});