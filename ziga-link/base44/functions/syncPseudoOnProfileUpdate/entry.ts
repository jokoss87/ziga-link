import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();

  const newProfile = body.data;
  const oldProfile = body.old_data;

  const email = newProfile?.created_by;
  if (!email) return Response.json({ skipped: true, reason: 'no created_by' });

  const pseudoChanged = newProfile?.pseudo && newProfile.pseudo !== oldProfile?.pseudo;
  const statusChanged = newProfile?.user_status && newProfile.user_status !== oldProfile?.user_status;

  if (!pseudoChanged && !statusChanged) {
    return Response.json({ skipped: true, reason: 'nothing changed' });
  }

  const pseudo = newProfile.pseudo;
  const newStatus = newProfile.user_status;

  // Resync conversations (pseudo + statut dans member_pseudos & member_statuses)
  const allConvs = await base44.asServiceRole.entities.Conversation.filter({}, '-last_message_at', 500);
  const myConvs = allConvs.filter(c => c.members?.includes(email));
  let convsUpdated = 0;
  for (const conv of myConvs) {
    const idx = conv.members.indexOf(email);
    if (idx === -1) continue;
    const update = {};
    if (pseudoChanged) {
      const pseudos = [...(conv.member_pseudos || conv.members.map(() => ""))];
      pseudos[idx] = pseudo;
      update.member_pseudos = pseudos;
    }
    if (statusChanged) {
      const statuses = [...(conv.member_statuses || conv.members.map(() => "disponible"))];
      statuses[idx] = newStatus;
      update.member_statuses = statuses;
    }
    if (Object.keys(update).length > 0) {
      await base44.asServiceRole.entities.Conversation.update(conv.id, update);
      convsUpdated++;
    }
  }

  if (!pseudoChanged) {
    return Response.json({ success: true, email, statusUpdated: newStatus, convsUpdated });
  }

  // Resync posts
  const posts = await base44.asServiceRole.entities.Post.filter({ created_by: email }, '-created_date', 500);
  let postsUpdated = 0;
  for (const post of posts) {
    if (post.author_name !== pseudo) {
      await base44.asServiceRole.entities.Post.update(post.id, { author_name: pseudo });
      postsUpdated++;
    }
  }

  // Resync commentaires
  const comments = await base44.asServiceRole.entities.PostComment.filter({ created_by: email }, '-created_date', 1000);
  let commentsUpdated = 0;
  for (const c of comments) {
    if (c.author_name !== pseudo) {
      await base44.asServiceRole.entities.PostComment.update(c.id, { author_name: pseudo });
      commentsUpdated++;
    }
  }

  // Resync organizer_name dans Activity
  const activities = await base44.asServiceRole.entities.Activity.filter({ created_by: email }, '-created_date', 500);
  let activitiesUpdated = 0;
  for (const a of activities) {
    if (a.organizer_name !== pseudo) {
      await base44.asServiceRole.entities.Activity.update(a.id, { organizer_name: pseudo });
      activitiesUpdated++;
    }
  }

  // Resync owner_name dans MeetupAnnouncement
  const announcements = await base44.asServiceRole.entities.MeetupAnnouncement.filter({ created_by: email }, '-created_date', 500);
  let announcementsUpdated = 0;
  for (const ann of announcements) {
    if (ann.owner_name !== pseudo) {
      await base44.asServiceRole.entities.MeetupAnnouncement.update(ann.id, { owner_name: pseudo });
      announcementsUpdated++;
    }
  }

  return Response.json({ success: true, email, oldPseudo: oldProfile?.pseudo, newPseudo: pseudo, postsUpdated, commentsUpdated, activitiesUpdated, announcementsUpdated, convsUpdated });
});