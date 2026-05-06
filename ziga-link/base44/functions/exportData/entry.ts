import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const [
      users, userProfiles, dogProfiles, meetupAnnouncements, meetupRequests,
      activities, encounterRatings, userSupports, reports, moderationLogs, moderationAlerts
    ] = await Promise.all([
      base44.asServiceRole.entities.User.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.UserProfile.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.DogProfile.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.MeetupAnnouncement.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.MeetupRequest.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Activity.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.EncounterRating.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.UserSupport.list('-created_date', 200).catch(() => []),
      base44.asServiceRole.entities.Report.list('-created_date', 200).catch(() => []),
      base44.asServiceRole.entities.ModerationLog.list('-created_date', 200).catch(() => []),
      base44.asServiceRole.entities.ModerationAlert.list('-created_date', 200).catch(() => []),
    ]);

    const exportedAt = new Date().toISOString();
    const exportPayload = {
      exported_at: exportedAt,
      users,
      userProfiles,
      dogProfiles,
      meetupAnnouncements,
      meetupRequests,
      activities,
      encounterRatings,
      userSupports,
      reports,
      moderationLogs,
      moderationAlerts,
    };

    const dateLabel = new Date().toLocaleDateString('fr-FR');
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: Deno.env.get("ADMIN_EMAIL"),
      subject: `Export Paw Spot — ${dateLabel}`,
      body: JSON.stringify(exportPayload, null, 2),
    });

    return Response.json({ success: true, exported_at: exportedAt });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});