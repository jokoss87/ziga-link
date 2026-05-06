import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Récupérer tous les profils utilisateurs actifs (avec un chien enregistré)
    const [allProfiles, allDogs] = await Promise.all([
      base44.asServiceRole.entities.UserProfile.list("-created_date", 500),
      base44.asServiceRole.entities.DogProfile.list("-created_date", 500),
    ]);

    // Index des emails ayant au moins un chien
    const emailsWithDogs = new Set(allDogs.map(d => d.created_by).filter(Boolean));

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const todayKey = `challenge_${today}`;

    let sent = 0;
    let skipped = 0;

    for (const profile of allProfiles) {
      const email = profile.created_by;
      if (!email || !emailsWithDogs.has(email)) {
        skipped++;
        continue;
      }

      // Idempotence : vérifier si une notif "challenge" a déjà été envoyée aujourd'hui
      const existing = await base44.asServiceRole.entities.Notification.filter(
        { user_email: email, type: "level_up", reference_id: todayKey },
        "-created_date",
        1
      ).catch(() => []);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      // Créer la notification
      await base44.asServiceRole.entities.Notification.create({
        user_email: email,
        type: "level_up",
        title: "⚡ Défi du jour disponible !",
        body: "Un nouveau défi d'obéissance vous attend. Entraînez votre chien aujourd'hui !",
        reference_id: todayKey,
        link_page: "JournalVie",
        link_param: "tab=challenge",
        is_read: false,
      });

      sent++;
    }

    console.log(`[DailyChallenge] Notifications envoyées: ${sent}, ignorées: ${skipped}`);
    return Response.json({ success: true, sent, skipped });
  } catch (error) {
    console.error("[DailyChallenge] Erreur:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});