import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const now = new Date();

  // Lecture du mode dry_run depuis le payload
  let dryRun = false;
  try {
    const body = await req.json();
    dryRun = body?.dry_run === true;
  } catch (_) { /* payload vide ou absent */ }

  const cutoff = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

  const report = {
    Notification: 0,
    AppLog: 0,
    UserSession: 0,
    ConversationMessage: 0,
    Message: 0,
    MeetupRequest: 0,
    MeetupAnnouncement_expired: 0,
    MeetupAnnouncement_deleted: 0,
    Post: 0,
    PostComment: 0,
    UserFeedback: 0,
    BugReport: 0,
  };

  const errors = [];
  const MAX_ITERATIONS = 200;

  // Helpers AppLog — silencieux en dry_run
  async function logError(message, detail) {
    if (dryRun) return;
    try {
      await base44.asServiceRole.entities.AppLog.create({
        level: "error", category: "cleanup", message, details: detail,
        resolved: false, page: "cleanupExpiredData",
      });
    } catch (_) { /* ignore */ }
  }

  async function logWarn(message, detail) {
    if (dryRun) return;
    try {
      await base44.asServiceRole.entities.AppLog.create({
        level: "warn", category: "cleanup", message, details: detail,
        resolved: true, page: "cleanupExpiredData",
      });
    } catch (_) { /* ignore */ }
  }

  // Helper multi-pass : supprime (ou compte seulement en dry_run)
  async function deleteAllMatching(entityName, dateField, cutoffDate, extraFilter = null) {
    let total = 0;
    let iterations = 0;
    let hasMore = true;
    while (hasMore) {
      if (iterations >= MAX_ITERATIONS) {
        await logWarn(
          `Timeout guard déclenché sur ${entityName}`,
          `${iterations} itérations atteintes, purge interrompue (${total} entrées ${dryRun ? "comptées" : "supprimées"})`
        );
        break;
      }
      iterations++;

      const filter = { [dateField]: { $lt: cutoffDate } };
      const items = await base44.asServiceRole.entities[entityName].filter(filter, dateField, 500);
      if (!items || items.length === 0) break;

      const toDelete = extraFilter ? items.filter(extraFilter) : items;
      if (!dryRun) {
        for (const item of toDelete) {
          await base44.asServiceRole.entities[entityName].delete(item.id);
          total++;
        }
      } else {
        total += toDelete.length;
      }

      hasMore = items.length === 500;
    }
    return total;
  }

  // 1. Notifications > 30 jours
  try {
    report.Notification = await deleteAllMatching("Notification", "created_date", cutoff(30));
  } catch (e) {
    errors.push({ step: "Notification", error: e.message });
    await logError("Notification cleanup failed", e.message);
  }

  // 2. AppLog > 7 jours ET resolved !== false
  try {
    report.AppLog = await deleteAllMatching("AppLog", "created_date", cutoff(7),
      (i) => i.resolved !== false
    );
  } catch (e) {
    errors.push({ step: "AppLog", error: e.message });
    await logError("AppLog cleanup failed", e.message);
  }

  // 3. UserSession > 60 jours
  try {
    report.UserSession = await deleteAllMatching("UserSession", "created_date", cutoff(60));
  } catch (e) {
    errors.push({ step: "UserSession", error: e.message });
    await logError("UserSession cleanup failed", e.message);
  }

  // 4. ConversationMessage > 90 jours
  try {
    report.ConversationMessage = await deleteAllMatching("ConversationMessage", "created_date", cutoff(90));
  } catch (e) {
    errors.push({ step: "ConversationMessage", error: e.message });
    await logError("ConversationMessage cleanup failed", e.message);
  }

  // 5. Message (ancien système) > 30 jours
  try {
    report.Message = await deleteAllMatching("Message", "created_date", cutoff(30));
  } catch (e) {
    errors.push({ step: "Message", error: e.message });
    await logError("Message cleanup failed", e.message);
  }

  // 6. MeetupRequest > 60 jours avec statut terminal
  try {
    const terminalStatuses = ["accepted", "declined", "completed", "cancelled"];
    report.MeetupRequest = await deleteAllMatching("MeetupRequest", "created_date", cutoff(60),
      (i) => terminalStatuses.includes(i.status)
    );
  } catch (e) {
    errors.push({ step: "MeetupRequest", error: e.message });
    await logError("MeetupRequest cleanup failed", e.message);
  }

  // 7a. MeetupAnnouncement : expirer les annonces open dont la date est passée
  try {
    const today = now.toISOString().split("T")[0];
    let hasMore = true;
    let iterations = 0;
    while (hasMore) {
      if (iterations >= MAX_ITERATIONS) {
        await logWarn("Timeout guard déclenché sur MeetupAnnouncement_expire", `${iterations} itérations atteintes`);
        break;
      }
      iterations++;

      const items = await base44.asServiceRole.entities.MeetupAnnouncement.filter(
        { status: "open" }, "created_date", 500
      );
      if (!items || items.length === 0) break;

      const toExpire = items.filter(a => a.date && a.date < today);
      if (!dryRun) {
        for (const a of toExpire) {
          await base44.asServiceRole.entities.MeetupAnnouncement.update(a.id, { status: "expired" });
          report.MeetupAnnouncement_expired++;
        }
      } else {
        report.MeetupAnnouncement_expired += toExpire.length;
      }

      hasMore = items.length === 500 && toExpire.length > 0;
    }
  } catch (e) {
    errors.push({ step: "MeetupAnnouncement_expire", error: e.message });
    await logError("MeetupAnnouncement expire failed", e.message);
  }

  // 7b. MeetupAnnouncement : supprimer expired/completed > 30 jours
  try {
    report.MeetupAnnouncement_deleted = await deleteAllMatching(
      "MeetupAnnouncement", "created_date", cutoff(30),
      (i) => ["expired", "completed"].includes(i.status)
    );
  } catch (e) {
    errors.push({ step: "MeetupAnnouncement_delete", error: e.message });
    await logError("MeetupAnnouncement delete failed", e.message);
  }

  // 7c. Reset reminder_sent_flags sur entités dont la date est passée depuis > 48h
  let reminderFlagsReset = 0;
  try {
    const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [openAnns, matchedAnns, openActs, fullActs] = await Promise.all([
      base44.asServiceRole.entities.MeetupAnnouncement.filter({ status: "open" },    "date", 500),
      base44.asServiceRole.entities.MeetupAnnouncement.filter({ status: "matched" }, "date", 500),
      base44.asServiceRole.entities.Activity.filter({ status: "open" }, "date", 500),
      base44.asServiceRole.entities.Activity.filter({ status: "full" }, "date", 500),
    ]);
    const oldAnns = [...openAnns, ...matchedAnns];
    const oldActs = [...openActs, ...fullActs];

    const entitiesWithStaleFlags = [
      ...oldAnns.map(e => ({ entity: "MeetupAnnouncement", record: e })),
      ...oldActs.map(e => ({ entity: "Activity", record: e })),
    ].filter(({ record: r }) => {
      const dateStr = r.date?.includes("T") ? r.date.split("T")[0] : r.date;
      if (!dateStr || dateStr >= cutoff48h) return false;
      const flags = r.reminder_sent_flags || {};
      return Object.keys(flags).length > 0;
    });

    if (!dryRun) {
      await Promise.all(entitiesWithStaleFlags.map(({ entity, record }) =>
        base44.asServiceRole.entities[entity].update(record.id, { reminder_sent_flags: {} })
      ));
    }
    reminderFlagsReset = entitiesWithStaleFlags.length;

    if (!dryRun && reminderFlagsReset > 0) {
      await base44.asServiceRole.entities.AppLog.create({
        level: "info",
        category: "cleanup",
        message: `[Reminders] reminder_sent_flags réinitialisés sur ${reminderFlagsReset} entités (date > 48h)`,
        details: JSON.stringify({ count: reminderFlagsReset, cutoff: cutoff48h }),
        resolved: true,
        page: "cleanupExpiredData",
      }).catch(() => {});
    }
  } catch (e) {
    errors.push({ step: "ReminderFlagsReset", error: e.message });
    await logError("ReminderFlagsReset failed", e.message);
  }

  // 8. Post > 180 jours
  const affectedPostIds = new Set();
  try {
    let hasMore = true;
    let iterations = 0;
    while (hasMore) {
      if (iterations >= MAX_ITERATIONS) {
        await logWarn("Timeout guard déclenché sur Post", `${iterations} itérations atteintes (${report.Post} ${dryRun ? "comptés" : "supprimés"})`);
        break;
      }
      iterations++;

      const items = await base44.asServiceRole.entities.Post.filter(
        { created_date: { $lt: cutoff(180) } }, "created_date", 500
      );
      if (!items || items.length === 0) break;
      for (const item of items) {
        if (!dryRun) {
          await base44.asServiceRole.entities.Post.delete(item.id);
        }
        affectedPostIds.add(item.id);
        report.Post++;
      }
      hasMore = items.length === 500;
    }
  } catch (e) {
    errors.push({ step: "Post", error: e.message });
    await logError("Post cleanup failed", e.message);
  }

  // 9. PostComment orphelins des posts ci-dessus
  try {
    if (affectedPostIds.size > 0) {
      let hasMore = true;
      let skip = 0;
      let iterations = 0;
      while (hasMore) {
        if (iterations >= MAX_ITERATIONS) {
          await logWarn("Timeout guard déclenché sur PostComment", `${iterations} itérations atteintes (${report.PostComment} ${dryRun ? "comptés" : "supprimés"})`);
          break;
        }
        iterations++;

        const comments = await base44.asServiceRole.entities.PostComment.list("created_date", 500, skip);
        if (!comments || comments.length === 0) break;
        const toDelete = comments.filter(c => affectedPostIds.has(c.post_id));
        if (!dryRun) {
          for (const c of toDelete) {
            await base44.asServiceRole.entities.PostComment.delete(c.id);
            report.PostComment++;
          }
        } else {
          report.PostComment += toDelete.length;
        }
        hasMore = comments.length === 500;
        skip += comments.length;
      }
    }
  } catch (e) {
    errors.push({ step: "PostComment", error: e.message });
    await logError("PostComment cleanup failed", e.message);
  }

  // 10. UserFeedback > 90 jours
  try {
    report.UserFeedback = await deleteAllMatching("UserFeedback", "created_date", cutoff(90));
  } catch (e) {
    errors.push({ step: "UserFeedback", error: e.message });
    await logError("UserFeedback cleanup failed", e.message);
  }

  // 11. BugReport > 180 jours ET (resolved === true OU status === "corrige")
  try {
    report.BugReport = await deleteAllMatching("BugReport", "created_date", cutoff(180),
      (i) => i.resolved === true || i.status === "corrige"
    );
  } catch (e) {
    errors.push({ step: "BugReport", error: e.message });
    await logError("BugReport cleanup failed", e.message);
  }

  // WalkRoute : aucune action

  report.ReminderFlagsReset = reminderFlagsReset;

  const totalAffected =
    report.Notification + report.AppLog + report.UserSession +
    report.ConversationMessage + report.Message + report.MeetupRequest +
    report.MeetupAnnouncement_deleted + report.Post + report.PostComment +
    report.UserFeedback + report.BugReport;

  // AppLog final uniquement en mode réel
  if (!dryRun) {
    try {
      await base44.asServiceRole.entities.AppLog.create({
        level: "info",
        category: "cleanup",
        message: `Purge complète : ${totalAffected} entrées supprimées (tous batches), ${report.MeetupAnnouncement_expired} annonces expirées`,
        details: JSON.stringify({ ...report, errors_count: errors.length, errors }),
        resolved: true,
        page: "cleanupExpiredData",
      });
    } catch (_) { /* ignore */ }
  }

  return Response.json({
    success: true,
    dry_run: dryRun,
    simulation: dryRun ? "⚠️ MODE SIMULATION — aucune donnée supprimée ni modifiée" : undefined,
    total_affected: totalAffected,
    announcements_to_expire: report.MeetupAnnouncement_expired,
    report,
    errors,
  });
});