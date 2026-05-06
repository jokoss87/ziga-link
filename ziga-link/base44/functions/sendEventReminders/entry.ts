import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    let totalSent = 0;

    // Fenêtres de rappel en minutes
    const WINDOWS = [
      { key: "reminder_24h",   minutesBefore: 1440, title: "📅 Rappel — demain !",                        bodyTpl: (t, h, c) => `${t} — demain à ${h} à ${c}`,              link_param_suffix: "" },
      { key: "reminder_2h",    minutesBefore: 120,  title: (t) => `⏰ Dans 2h — ${t}`,                    bodyTpl: (t, h, c) => `Préparez-vous ! ${t} commence à ${h} à ${c}`, link_param_suffix: "" },
      { key: "reminder_30min", minutesBefore: 30,   title: (t) => `🚀 C'est l'heure — ${t} dans 30 min !`, bodyTpl: () => `Tapez pour démarrer directement 🐾`,               link_param_suffix: "&start=1" },
    ];

    const TOLERANCE = 15; // ±15 min

    // Construit un datetime ISO depuis date + time
    const buildEventDate = (dateStr, timeStr) => {
      if (!dateStr) return null;
      const base = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
      const time = timeStr || "09:00";
      return new Date(`${base}T${time}:00`);
    };

    // Vérifie reminder_sent_flags et envoie si nécessaire.
    // Retourne { newFlags, sentCount } pour mise à jour batch après la boucle.
    const processFlagsAndNotify = async (entity, recipients, window, linkPage, linkParam) => {
      const flags = entity.reminder_sent_flags || {};
      const alreadySent = Array.isArray(flags[window.key]) ? flags[window.key] : [];
      const toSend = [...recipients].filter(email => email && !alreadySent.includes(email));

      if (toSend.length === 0) return { newFlags: null, sentCount: 0 };

      const titleStr = typeof window.title === "function" ? window.title(entity.title) : window.title;
      const bodyStr = window.bodyTpl(entity.title, entity.time, entity.city || "");

      await Promise.all(toSend.map(email =>
        base44.asServiceRole.entities.Notification.create({
          user_email: email,
          type: window.key,
          title: titleStr,
          body: bodyStr,
          reference_id: entity.id,
          link_page: linkPage,
          link_param: linkParam,
          is_read: false,
        })
      ));

      // Nouveau state des flags avec les emails ajoutés
      const updatedFlags = {
        ...flags,
        [window.key]: [...alreadySent, ...toSend],
      };

      return { newFlags: updatedFlags, sentCount: toSend.length };
    };

    // ── Balades (MeetupAnnouncement) ──────────────────────────────────────────
    const [openAnn, matchedAnn] = await Promise.all([
      base44.asServiceRole.entities.MeetupAnnouncement.filter({ status: "open" },    "-date", 200),
      base44.asServiceRole.entities.MeetupAnnouncement.filter({ status: "matched" }, "-date", 200),
    ]);
    const allAnnouncements = [...openAnn, ...matchedAnn];

    for (const ann of allAnnouncements) {
      if (!ann.date || !ann.time) continue;

      const eventDate = buildEventDate(ann.date, ann.time);
      if (!eventDate) continue;

      const diffMinutes = (eventDate.getTime() - now.getTime()) / 60000;

      for (const w of WINDOWS) {
        if (Math.abs(diffMinutes - w.minutesBefore) > TOLERANCE) continue;

        // Récupère les participants acceptés
        const requests = await base44.asServiceRole.entities.MeetupRequest.filter(
          { announcement_id: ann.id, status: "accepted" }, "-created_date", 50
        );
        const recipients = new Set([ann.created_by]);
        for (const r of requests) { if (r.created_by) recipients.add(r.created_by); }

        const linkParam = `id=${ann.id}${w.link_param_suffix}`;
        const { newFlags, sentCount } = await processFlagsAndNotify(ann, recipients, w, "AnnouncementDetail", linkParam);

        if (newFlags) {
          await base44.asServiceRole.entities.MeetupAnnouncement.update(ann.id, { reminder_sent_flags: newFlags });
          totalSent += sentCount;
        }
      }
    }

    // ── Activités ─────────────────────────────────────────────────────────────
    const activities = await base44.asServiceRole.entities.Activity.filter(
      { status: "open" }, "-date", 200
    );

    for (const act of activities) {
      if (!act.date || !act.time) continue;

      const eventDate = buildEventDate(act.date, act.time);
      if (!eventDate) continue;

      const diffMinutes = (eventDate.getTime() - now.getTime()) / 60000;

      for (const w of WINDOWS) {
        if (Math.abs(diffMinutes - w.minutesBefore) > TOLERANCE) continue;

        const recipients = new Set([act.created_by]);
        if (Array.isArray(act.participants)) {
          for (const p of act.participants) { if (p) recipients.add(p); }
        }

        const linkParam = `id=${act.id}${w.link_param_suffix}`;
        const { newFlags, sentCount } = await processFlagsAndNotify(act, recipients, w, "ActivityDetail", linkParam);

        if (newFlags) {
          await base44.asServiceRole.entities.Activity.update(act.id, { reminder_sent_flags: newFlags });
          totalSent += sentCount;
        }
      }
    }

    // Log AppLog
    await base44.asServiceRole.entities.AppLog.create({
      level: "info",
      category: "other",
      message: `[Reminders] ${totalSent} notifications envoyées`,
      details: JSON.stringify({
        announcements_checked: allAnnouncements.length,
        activities_checked: activities.length,
        notifications_sent: totalSent,
        ran_at: now.toISOString(),
      }),
      page: "sendEventReminders",
    }).catch(() => {});

    return Response.json({ ok: true, sent: totalSent });
  } catch (error) {
    console.error("[sendEventReminders] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});