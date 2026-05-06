import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
const ALERT_THRESHOLD = 5000;
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL");
// ──────────────────────────────────────────────────────────────────────────────

// Logique dry_run complète (miroir de cleanupExpiredData, mode comptage uniquement)
async function runDryRun(base44) {
  const now = new Date();
  const cutoff = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  const MAX_ITERATIONS = 200;

  const report = {
    Notification: 0, AppLog: 0, UserSession: 0,
    ConversationMessage: 0, Message: 0, MeetupRequest: 0,
    MeetupAnnouncement_expired: 0, MeetupAnnouncement_deleted: 0,
    Post: 0, PostComment: 0, UserFeedback: 0, BugReport: 0,
  };
  const errors = [];

  // Comptage multi-pass sans suppression
  async function countMatching(entityName, dateField, cutoffDate, extraFilter = null) {
    let total = 0;
    let iterations = 0;
    let hasMore = true;
    while (hasMore) {
      if (iterations >= MAX_ITERATIONS) break;
      iterations++;
      const filter = { [dateField]: { $lt: cutoffDate } };
      const items = await base44.asServiceRole.entities[entityName].filter(filter, dateField, 500);
      if (!items || items.length === 0) break;
      const matching = extraFilter ? items.filter(extraFilter) : items;
      total += matching.length;
      hasMore = items.length === 500;
    }
    return total;
  }

  // 1. Notifications > 30j
  try { report.Notification = await countMatching("Notification", "created_date", cutoff(30)); }
  catch (e) { errors.push({ step: "Notification", error: e.message }); }

  // 2. AppLog > 7j résolus
  try { report.AppLog = await countMatching("AppLog", "created_date", cutoff(7), (i) => i.resolved !== false); }
  catch (e) { errors.push({ step: "AppLog", error: e.message }); }

  // 3. UserSession > 60j
  try { report.UserSession = await countMatching("UserSession", "created_date", cutoff(60)); }
  catch (e) { errors.push({ step: "UserSession", error: e.message }); }

  // 4. ConversationMessage > 90j
  try { report.ConversationMessage = await countMatching("ConversationMessage", "created_date", cutoff(90)); }
  catch (e) { errors.push({ step: "ConversationMessage", error: e.message }); }

  // 5. Message > 30j
  try { report.Message = await countMatching("Message", "created_date", cutoff(30)); }
  catch (e) { errors.push({ step: "Message", error: e.message }); }

  // 6. MeetupRequest > 60j terminal
  try {
    const terminalStatuses = ["accepted", "declined", "completed", "cancelled"];
    report.MeetupRequest = await countMatching("MeetupRequest", "created_date", cutoff(60), (i) => terminalStatuses.includes(i.status));
  } catch (e) { errors.push({ step: "MeetupRequest", error: e.message }); }

  // 7a. MeetupAnnouncement à expirer (open + date passée)
  try {
    const today = now.toISOString().split("T")[0];
    let hasMore = true;
    let iterations = 0;
    while (hasMore) {
      if (iterations >= MAX_ITERATIONS) break;
      iterations++;
      const items = await base44.asServiceRole.entities.MeetupAnnouncement.filter({ status: "open" }, "created_date", 500);
      if (!items || items.length === 0) break;
      report.MeetupAnnouncement_expired += items.filter(a => a.date && a.date < today).length;
      hasMore = items.length === 500;
    }
  } catch (e) { errors.push({ step: "MeetupAnnouncement_expire", error: e.message }); }

  // 7b. MeetupAnnouncement expired/completed > 30j
  try {
    report.MeetupAnnouncement_deleted = await countMatching("MeetupAnnouncement", "created_date", cutoff(30), (i) => ["expired", "completed"].includes(i.status));
  } catch (e) { errors.push({ step: "MeetupAnnouncement_delete", error: e.message }); }

  // 8. Post > 180j
  const affectedPostIds = new Set();
  try {
    let hasMore = true;
    let iterations = 0;
    while (hasMore) {
      if (iterations >= MAX_ITERATIONS) break;
      iterations++;
      const items = await base44.asServiceRole.entities.Post.filter({ created_date: { $lt: cutoff(180) } }, "created_date", 500);
      if (!items || items.length === 0) break;
      items.forEach(i => affectedPostIds.add(i.id));
      report.Post += items.length;
      hasMore = items.length === 500;
    }
  } catch (e) { errors.push({ step: "Post", error: e.message }); }

  // 9. PostComment orphelins
  try {
    if (affectedPostIds.size > 0) {
      let hasMore = true;
      let skip = 0;
      let iterations = 0;
      while (hasMore) {
        if (iterations >= MAX_ITERATIONS) break;
        iterations++;
        const comments = await base44.asServiceRole.entities.PostComment.list("created_date", 500, skip);
        if (!comments || comments.length === 0) break;
        report.PostComment += comments.filter(c => affectedPostIds.has(c.post_id)).length;
        hasMore = comments.length === 500;
        skip += comments.length;
      }
    }
  } catch (e) { errors.push({ step: "PostComment", error: e.message }); }

  // 10. UserFeedback > 90j
  try { report.UserFeedback = await countMatching("UserFeedback", "created_date", cutoff(90)); }
  catch (e) { errors.push({ step: "UserFeedback", error: e.message }); }

  // 11. BugReport > 180j résolus/corrigés
  try {
    report.BugReport = await countMatching("BugReport", "created_date", cutoff(180), (i) => i.resolved === true || i.status === "corrige");
  } catch (e) { errors.push({ step: "BugReport", error: e.message }); }

  const totalAffected =
    report.Notification + report.AppLog + report.UserSession +
    report.ConversationMessage + report.Message + report.MeetupRequest +
    report.MeetupAnnouncement_deleted + report.Post + report.PostComment +
    report.UserFeedback + report.BugReport;

  return { report, errors, totalAffected, announcementsToExpire: report.MeetupAnnouncement_expired };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { report, errors, totalAffected, announcementsToExpire } = await runDryRun(base44);

    const lines = [
      `Notifications          : ${report.Notification}`,
      `AppLog (résolus)       : ${report.AppLog}`,
      `UserSession            : ${report.UserSession}`,
      `ConversationMessage    : ${report.ConversationMessage}`,
      `Message (ancien)       : ${report.Message}`,
      `MeetupRequest          : ${report.MeetupRequest}`,
      `MeetupAnnouncement exp : ${announcementsToExpire}`,
      `MeetupAnnouncement del : ${report.MeetupAnnouncement_deleted}`,
      `Post                   : ${report.Post}`,
      `PostComment orphelins  : ${report.PostComment}`,
      `UserFeedback           : ${report.UserFeedback}`,
      `BugReport              : ${report.BugReport}`,
    ].join("\n");

    const isAboveThreshold = totalAffected >= ALERT_THRESHOLD;
    const logLevel = isAboveThreshold ? "warn" : "info";
    const logMessage = isAboveThreshold
      ? `[ALERTE SIMULATION] ${totalAffected} entrées seraient supprimées dimanche — SEUIL ${ALERT_THRESHOLD} DÉPASSÉ`
      : `[SIMULATION — PURGE DIMANCHE] ${totalAffected} entrées seraient supprimées, ${announcementsToExpire} annonces expirées`;

    const details = `⚠️ PRÉVISUALISATION — aucune donnée n'a été modifiée\nSeuil d'alerte : ${ALERT_THRESHOLD} | Total détecté : ${totalAffected}\n\nDétail par entité :\n${lines}${errors.length > 0 ? `\n\n⚠️ Erreurs (${errors.length}) :\n${JSON.stringify(errors, null, 2)}` : ""}`;

    // AppLog
    try {
      await base44.asServiceRole.entities.AppLog.create({
        level: logLevel,
        category: "cleanup_preview",
        message: logMessage,
        details,
        resolved: !isAboveThreshold,
        page: "cleanupDryRunPreview",
      });
    } catch (_) { /* ignore */ }

    // Email d'alerte si seuil dépassé
    if (isAboveThreshold) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: ADMIN_EMAIL,
          from_name: "Paw Spot — Monitoring",
          subject: `⚠️ Alerte purge dimanche — ${totalAffected} entrées détectées (seuil : ${ALERT_THRESHOLD})`,
          body: `Bonjour,

La simulation de purge hebdomadaire (samedi dry_run) a détecté un volume anormalement élevé.

━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RAPPORT DE SIMULATION
━━━━━━━━━━━━━━━━━━━━━━━━━━
Total qui serait supprimé : ${totalAffected} entrées
Annonces qui seraient expirées : ${announcementsToExpire}
Seuil d'alerte configuré : ${ALERT_THRESHOLD}

Détail par entité :
${lines}
${errors.length > 0 ? `\n⚠️ Erreurs détectées (${errors.length}) :\n${JSON.stringify(errors, null, 2)}\n` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  AUCUNE DONNÉE N'A ÉTÉ SUPPRIMÉE — simulation uniquement
La purge réelle est planifiée dimanche à 3h00.

Si ce volume vous semble incorrect, désactivez l'automation "Nettoyage global des données expirées" avant dimanche matin.
━━━━━━━━━━━━━━━━━━━━━━━━━━

Paw Spot — Système de monitoring automatique`,
        });
      } catch (_) { /* email non bloquant */ }
    }

    return Response.json({
      success: true,
      dry_run: true,
      simulation: "⚠️ MODE SIMULATION — aucune donnée supprimée ni modifiée",
      alert_sent: isAboveThreshold,
      alert_threshold: ALERT_THRESHOLD,
      total_would_be_deleted: totalAffected,
      announcements_would_expire: announcementsToExpire,
      report,
      errors,
    });

  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});