import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { data: entry, event } = body;
    if (event?.type !== "create" || !entry) {
      return Response.json({ ok: true, skipped: "not a create event" });
    }

    const ownerEmail = entry.created_by;
    if (!ownerEmail) return Response.json({ ok: true, skipped: "no owner" });

    // Récupérer le profil pour l'objectif mensuel
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ created_by: ownerEmail });
    const profile = profiles[0];
    const goal = parseInt(profile?.monthly_goal) || 0;

    if (goal <= 0) return Response.json({ ok: true, skipped: "no goal set" });

    // Compter les activités du mois en cours
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const allEntries = await base44.asServiceRole.entities.ProgressEntry.filter({ created_by: ownerEmail });
    const monthEntries = allEntries.filter(e => {
      if (!e.created_date) return false;
      return e.created_date >= monthStart && e.created_date <= monthEnd;
    });

    const count = monthEntries.length;

    // Félicitation uniquement quand on atteint EXACTEMENT l'objectif
    if (count !== goal) return Response.json({ ok: true, skipped: `count=${count}, goal=${goal}` });

    // Vérifie qu'on n'a pas déjà envoyé cette notification ce mois-ci
    const monthLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const existingNotifs = await base44.asServiceRole.entities.Notification.filter({
      user_email: ownerEmail,
      type: "level_up",
    });

    const alreadySent = existingNotifs.some(n =>
      n.title?.includes("objectif") && n.created_date?.startsWith(monthLabel.slice(0, 7))
    );

    if (alreadySent) return Response.json({ ok: true, skipped: "already notified this month" });

    // Créer la notification de félicitation
    await base44.asServiceRole.entities.Notification.create({
      user_email: ownerEmail,
      type: "level_up",
      title: `🎉 Objectif du mois atteint !`,
      body: `Bravo ! Tu as atteint ton objectif de ${goal} activités ce mois-ci. Continue comme ça ! 🐾`,
      link_page: "JournalVie",
      is_read: false,
    });

    return Response.json({ ok: true, notified: true, goal, count });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});