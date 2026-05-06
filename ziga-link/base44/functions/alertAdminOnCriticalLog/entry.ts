import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const { event, data } = await req.json();

  // Filtrer uniquement les niveaux error et critical
  if (!["error", "critical"].includes(data?.level)) {
    return Response.json({ skipped: true });
  }

  // Cooldown : vérifier si un log identique existe dans les 10 dernières minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const recentLogs = await base44.asServiceRole.entities.AppLog.filter({
    category: data.category,
    page: data.page,
    level: data.level,
  }, "-created_date", 5);

  const isDuplicate = recentLogs.some(log =>
    log.id !== event?.entity_id && log.created_date > tenMinutesAgo
  );

  if (isDuplicate) {
    return Response.json({ skipped: true, reason: "cooldown — log identique dans les 10 dernières minutes" });
  }

  // Récupérer tous les admins
  const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" });

  const levelEmoji = data.level === "critical" ? "🔴" : "🟠";
  const title = `${levelEmoji} [${data.level.toUpperCase()}] ${data.category || "app"} — ${data.page || "?"}`;
  const body = data.message + (data.user_email ? ` | User: ${data.user_email}` : "");

  // Envoyer notification + email à chaque admin
  await Promise.all(admins.flatMap(admin => [
    base44.asServiceRole.entities.Notification.create({
      user_email: admin.email,
      type: "bug_response",
      title,
      body,
      reference_id: event?.entity_id || "",
      link_page: "Admin",
      is_read: false,
    }),
    base44.asServiceRole.integrations.Core.SendEmail({
      to: admin.email,
      subject: title,
      body: `
        <h3>${title}</h3>
        <p><b>Message :</b> ${data.message}</p>
        <p><b>Page :</b> ${data.page || "—"}</p>
        <p><b>Catégorie :</b> ${data.category || "—"}</p>
        <p><b>Utilisateur :</b> ${data.user_email || "—"}</p>
        <p><b>Détails :</b><br><pre>${data.details || "—"}</pre></p>
        <p><b>Stack :</b><br><pre>${data.stack || "—"}</pre></p>
        <p><small>Log ID : ${event?.entity_id || "?"} — ${new Date().toLocaleString("fr-FR")}</small></p>
      `,
    }),
  ]));

  return Response.json({ ok: true, admins_notified: admins.length });
});