import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { announcementId, userEmail, durationMinutes, steps, distanceLabel, timeLabel, dogId, dogName, announcementTitle, participantsCount } = await req.json();

  if (!announcementId || !userEmail) {
    return Response.json({ error: 'Missing announcementId or userEmail' }, { status: 400 });
  }

  // Vérifier idempotence via walk_saved_by sur l'annonce
  // (plus fiable que filtrer ProgressEntry car created_by est le service account)
  let alreadySaved = false;
  try {
    const anns = await base44.asServiceRole.entities.MeetupAnnouncement.filter({ id: announcementId });
    if (anns.length > 0) {
      const savedBy = Array.isArray(anns[0].walk_saved_by) ? anns[0].walk_saved_by : [];
      if (savedBy.includes(userEmail)) {
        alreadySaved = true;
      }
    }
  } catch (_) {
    // L'annonce peut ne plus exister — vérifier dans ProgressEntry par owner_email + announcement_id
    const recent = await base44.asServiceRole.entities.ProgressEntry.filter(
      { owner_email: userEmail, announcement_id: announcementId },
      "-created_date",
      1
    ).catch(() => []);
    if (recent.length > 0) alreadySaved = true;
  }

  if (alreadySaved) {
    return Response.json({ already_saved: true });
  }

  // Créer la ProgressEntry avec owner_email pour retrouver les entrées liées à un user
  const entry = await base44.asServiceRole.entities.ProgressEntry.create({
    dog_id: dogId || "",
    dog_name: dogName || "",
    session_type: "balade",
    title: participantsCount > 1
      ? `Balade collective (${participantsCount} participants) — ${timeLabel}`
      : `Balade — ${steps} pas (${distanceLabel})`,
    notes: `Annonce : ${announcementTitle || announcementId} | Durée : ${timeLabel} | Pas : ${steps} | Distance : ${distanceLabel}`,
    duration_minutes: durationMinutes,
    announcement_id: announcementId,
    owner_email: userEmail,
  });

  // Ajouter userEmail au flag walk_saved_by sur l'annonce (si elle existe encore)
  try {
    const anns = await base44.asServiceRole.entities.MeetupAnnouncement.filter({ id: announcementId });
    if (anns.length > 0) {
      const savedBy = Array.isArray(anns[0].walk_saved_by) ? anns[0].walk_saved_by : [];
      if (!savedBy.includes(userEmail)) {
        await base44.asServiceRole.entities.MeetupAnnouncement.update(announcementId, {
          walk_saved_by: [...savedBy, userEmail],
        });
      }
    }
  } catch (_) {
    // Annonce déjà supprimée — pas grave, l'idempotence est assurée côté ProgressEntry
  }

  return Response.json({ already_saved: false, entry_id: entry.id });
});