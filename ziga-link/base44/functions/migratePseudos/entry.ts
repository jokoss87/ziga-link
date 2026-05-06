import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 1. Charger tous les UserProfiles (pseudo + email créateur)
  const profiles = await base44.asServiceRole.entities.UserProfile.list('-created_date', 5000);
  const pseudoMap = {}; // email → pseudo
  for (const p of profiles) {
    if (p.created_by && p.pseudo) pseudoMap[p.created_by] = p.pseudo;
  }

  // 2. Charger tous les posts
  const posts = await base44.asServiceRole.entities.Post.list('-created_date', 5000);
  let updated = 0;
  let skipped = 0;

  for (const post of posts) {
    if (!post.created_by) { skipped++; continue; }
    const pseudo = pseudoMap[post.created_by];
    if (!pseudo) { skipped++; continue; }
    if (post.author_name === pseudo) { skipped++; continue; }
    await base44.asServiceRole.entities.Post.update(post.id, { author_name: pseudo });
    updated++;
  }

  // 3. Même chose pour les commentaires PostComment
  const comments = await base44.asServiceRole.entities.PostComment.list('-created_date', 10000);
  let commentsUpdated = 0;
  let commentsSkipped = 0;

  for (const c of comments) {
    if (!c.created_by) { commentsSkipped++; continue; }
    const pseudo = pseudoMap[c.created_by];
    if (!pseudo) { commentsSkipped++; continue; }
    if (c.author_name === pseudo) { commentsSkipped++; continue; }
    await base44.asServiceRole.entities.PostComment.update(c.id, { author_name: pseudo });
    commentsUpdated++;
  }

  // 4. Resync organizer_name dans Activity
  const activities = await base44.asServiceRole.entities.Activity.list('-created_date', 5000);
  let activitiesUpdated = 0;
  for (const a of activities) {
    if (!a.created_by) continue;
    const pseudo = pseudoMap[a.created_by];
    if (!pseudo || a.organizer_name === pseudo) continue;
    await base44.asServiceRole.entities.Activity.update(a.id, { organizer_name: pseudo });
    activitiesUpdated++;
  }

  // 5. Resync owner_name dans MeetupAnnouncement
  const announcements = await base44.asServiceRole.entities.MeetupAnnouncement.list('-created_date', 5000);
  let announcementsUpdated = 0;
  for (const ann of announcements) {
    if (!ann.created_by) continue;
    const pseudo = pseudoMap[ann.created_by];
    if (!pseudo || ann.owner_name === pseudo) continue;
    await base44.asServiceRole.entities.MeetupAnnouncement.update(ann.id, { owner_name: pseudo });
    announcementsUpdated++;
  }

  return Response.json({
    success: true,
    posts: { updated, skipped },
    comments: { updated: commentsUpdated, skipped: commentsSkipped },
    activities: { updated: activitiesUpdated },
    announcements: { updated: announcementsUpdated },
  });
});