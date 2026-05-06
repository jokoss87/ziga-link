import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Fenêtre des 10 dernières minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  // Récupérer tous les logs error/critical des 10 dernières minutes
  const recentLogs = await base44.asServiceRole.entities.AppLog.list("-created_date", 200);
  const windowLogs = recentLogs.filter(log =>
    ["error", "critical"].includes(log.level) && log.created_date > tenMinutesAgo
  );

  if (windowLogs.length === 0) {
    return Response.json({ skipped: true, reason: "aucun log error/critical dans les 10 dernières minutes" });
  }

  // Grouper par category + page + level
  const groups = {};
  for (const log of windowLogs) {
    const key = `${log.level}|${log.category}|${log.page || "?"}`;
    if (!groups[key]) {
      groups[key] = { count: 0, sample: log, level: log.level, category: log.category, page: log.page };
    }
    groups[key].count++;
  }

  // Ne notifier que les groupes avec plus d'1 occurrence (les singletons ont déjà été alertés)
  const stormGroups = Object.values(groups).filter(g => g.count > 1);

  if (stormGroups.length === 0) {
    return Response.json({ skipped: true, reason: "aucun storm détecté (que des erreurs isolées)" });
  }

  // Construire le résumé
  const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" });

  const rows = stormGroups.map(g => {
    const emoji = g.level === "critical" ? "🔴" : "🟠";
    return `<tr>
      <td style="padding:6px 12px">${emoji} ${g.level.toUpperCase()}</td>
      <td style="padding:6px 12px">${g.category}</td>
      <td style="padding:6px 12px">${g.page || "—"}</td>
      <td style="padding:6px 12px;font-weight:bold;color:${g.count > 10 ? "red" : "orange"}">${g.count} fois</td>
      <td style="padding:6px 12px;font-size:12px;color:#666">${g.sample.message?.slice(0, 80) || "—"}</td>
    </tr>`;
  }).join("");

  const subject = `⚠️ Résumé erreurs — ${stormGroups.length} groupe(s) répété(s) en 10 min`;
  const body = `
    <h2>⚠️ Résumé des erreurs répétées (10 dernières minutes)</h2>
    <p>Les erreurs suivantes se sont produites plusieurs fois. La première occurrence a déjà été alertée individuellement.</p>
    <table border="1" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-family:sans-serif;font-size:13px">
      <thead style="background:#f3f4f6">
        <tr>
          <th style="padding:8px 12px">Niveau</th>
          <th style="padding:8px 12px">Catégorie</th>
          <th style="padding:8px 12px">Page</th>
          <th style="padding:8px 12px">Occurrences</th>
          <th style="padding:8px 12px">Message</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="color:#888;font-size:12px;margin-top:16px">Généré automatiquement — ${new Date().toLocaleString("fr-FR")}</p>
  `;

  await Promise.all(admins.map(admin =>
    base44.asServiceRole.integrations.Core.SendEmail({ to: admin.email, subject, body })
  ));

  return Response.json({ ok: true, storm_groups: stormGroups.length, admins_notified: admins.length });
});