import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Charger tous les profils utilisateur pour construire un map email → pseudo
    const allProfiles = await base44.asServiceRole.entities.UserProfile.list('-created_date', 500);
    const pseudoMap = {};
    for (const p of allProfiles) {
      if (p.created_by && p.pseudo) {
        pseudoMap[p.created_by] = p.pseudo;
      }
    }

    const stats = {
      activities_checked: 0,
      activities_updated: 0,
      posts_checked: 0,
      posts_updated: 0,
      announcements_checked: 0,
      announcements_updated: 0,
    };

    // ── 1. Activités ─────────────────────────────────────────────────────────
    const activities = await base44.asServiceRole.entities.Activity.list('-created_date', 500);
    stats.activities_checked = activities.length;

    for (const act of activities) {
      if (!act.created_by) continue;
      const pseudo = pseudoMap[act.created_by];
      if (!pseudo) continue;

      // Mettre à jour si organizer_name est différent du pseudo
      if (act.organizer_name !== pseudo) {
        await base44.asServiceRole.entities.Activity.update(act.id, {
          organizer_name: pseudo,
          organizer_photo: null, // supprimer la photo de profil (vie privée)
        });
        stats.activities_updated++;
      }
    }

    // ── 2. Posts ─────────────────────────────────────────────────────────────
    const posts = await base44.asServiceRole.entities.Post.list('-created_date', 500);
    stats.posts_checked = posts.length;

    for (const post of posts) {
      if (!post.created_by) continue;
      const pseudo = pseudoMap[post.created_by];
      if (!pseudo) continue;

      if (post.author_name !== pseudo) {
        await base44.asServiceRole.entities.Post.update(post.id, {
          author_name: pseudo,
          author_photo: null,
        });
        stats.posts_updated++;
      }
    }

    // ── 3. Annonces MeetupAnnouncement ────────────────────────────────────────
    const announcements = await base44.asServiceRole.entities.MeetupAnnouncement.list('-created_date', 500);
    stats.announcements_checked = announcements.length;

    for (const ann of announcements) {
      if (!ann.created_by) continue;
      const pseudo = pseudoMap[ann.created_by];
      if (!pseudo) continue;

      if (ann.owner_name !== pseudo) {
        await base44.asServiceRole.entities.MeetupAnnouncement.update(ann.id, {
          owner_name: pseudo,
          owner_photo: null,
        });
        stats.announcements_updated++;
      }
    }

    return Response.json({
      success: true,
      message: 'Migration anonymisation terminée',
      stats,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});