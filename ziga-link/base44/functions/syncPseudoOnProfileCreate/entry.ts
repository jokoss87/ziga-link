import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();

  // Payload de l'automation entity: { event, data }
  const profile = body.data;
  if (!profile?.pseudo || !profile?.created_by) {
    return Response.json({ skipped: true, reason: 'no pseudo or created_by' });
  }

  const email = profile.created_by;
  const pseudo = profile.pseudo;

  // Met à jour les posts de cet utilisateur dont author_name != pseudo
  const posts = await base44.asServiceRole.entities.Post.filter({ created_by: email }, '-created_date', 500);
  let postsUpdated = 0;
  for (const post of posts) {
    if (post.author_name !== pseudo) {
      await base44.asServiceRole.entities.Post.update(post.id, { author_name: pseudo });
      postsUpdated++;
    }
  }

  // Met à jour les commentaires de cet utilisateur
  const comments = await base44.asServiceRole.entities.PostComment.filter({ created_by: email }, '-created_date', 1000);
  let commentsUpdated = 0;
  for (const c of comments) {
    if (c.author_name !== pseudo) {
      await base44.asServiceRole.entities.PostComment.update(c.id, { author_name: pseudo });
      commentsUpdated++;
    }
  }

  // Met à jour les activités organisées par cet utilisateur
  const activities = await base44.asServiceRole.entities.Activity.filter({ created_by: email }, '-created_date', 500);
  let activitiesUpdated = 0;
  for (const a of activities) {
    if (a.organizer_name !== pseudo) {
      await base44.asServiceRole.entities.Activity.update(a.id, { organizer_name: pseudo });
      activitiesUpdated++;
    }
  }

  // Met à jour les annonces de balade de cet utilisateur
  const announcements = await base44.asServiceRole.entities.MeetupAnnouncement.filter({ created_by: email }, '-created_date', 500);
  let announcementsUpdated = 0;
  for (const ann of announcements) {
    if (ann.owner_name !== pseudo) {
      await base44.asServiceRole.entities.MeetupAnnouncement.update(ann.id, { owner_name: pseudo });
      announcementsUpdated++;
    }
  }

  return Response.json({ success: true, email, postsUpdated, commentsUpdated, activitiesUpdated, announcementsUpdated });
});