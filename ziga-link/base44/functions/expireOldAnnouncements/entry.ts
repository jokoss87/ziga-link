import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Calcul de la date d'hier (fin de journée)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0]; // YYYY-MM-DD

  // Récupérer toutes les annonces ouvertes dont la date est passée
  const openAnns = await base44.asServiceRole.entities.MeetupAnnouncement.filter(
    { status: "open" },
    "-created_date",
    200
  );

  const expired = openAnns.filter(ann => {
    if (!ann.date) return false;
    return ann.date <= yesterdayStr;
  });

  let count = 0;
  for (const ann of expired) {
    await base44.asServiceRole.entities.MeetupAnnouncement.update(ann.id, { status: "expired" });
    count++;
  }

  console.log(`[expireOldAnnouncements] ${count} annonce(s) expirée(s)`);
  return Response.json({ expired: count });
});