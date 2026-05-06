import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Calcul de la date limite (15 jours en arrière)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 15);
  const cutoffISO = cutoff.toISOString();

  // Récupérer toutes les notifications plus vieilles que 15 jours
  const old = await base44.asServiceRole.entities.Notification.filter(
    { created_date: { $lt: cutoffISO } },
    "-created_date",
    500
  );

  if (old.length === 0) {
    return Response.json({ deleted: 0, message: "Aucune notification à supprimer." });
  }

  // Suppression une par une (pas de bulkDelete disponible)
  let deleted = 0;
  for (const notif of old) {
    await base44.asServiceRole.entities.Notification.delete(notif.id);
    deleted++;
  }

  console.log(`[cleanupOldNotifications] ${deleted} notifications supprimées (> 15 jours)`);
  return Response.json({ deleted, cutoff: cutoffISO });
});