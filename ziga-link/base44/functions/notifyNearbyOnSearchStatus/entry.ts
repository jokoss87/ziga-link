import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const R = 6371; // Earth radius km

function haversine(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data, old_data } = body;

    // Only process UserProfile updates
    if (event?.type !== "update") return Response.json({ skipped: true });

    const newStatus = data?.user_status;
    const oldStatus = old_data?.user_status;

    // Only trigger when switching TO cherche_compagnon
    if (newStatus !== "cherche_compagnon" || oldStatus === "cherche_compagnon") {
      return Response.json({ skipped: "no status change to cherche_compagnon" });
    }

    const senderLat = data?.latitude;
    const senderLon = data?.longitude;
    const senderPseudo = data?.pseudo || "Quelqu'un";
    const senderEmail = data?.created_by;

    if (!senderLat || !senderLon) {
      return Response.json({ skipped: "no location" });
    }

    // Cooldown anti-spam: 30 minutes between notifications
    const COOLDOWN_MS = 30 * 60 * 1000;
    const lastNotifAt = data?.last_search_notif_at;
    if (lastNotifAt && (Date.now() - new Date(lastNotifAt).getTime()) < COOLDOWN_MS) {
      return Response.json({ skipped: "cooldown active", next_allowed_at: new Date(new Date(lastNotifAt).getTime() + COOLDOWN_MS).toISOString() });
    }

    // Load all active profiles (exclude sender, shadow banned)
    const allProfiles = await base44.asServiceRole.entities.UserProfile.filter(
      { isActive: true, is_shadow_banned: false },
      "-updated_date",
      500
    );

    // Filter candidates: disponible or en_balade, has location, not sender
    const candidates = allProfiles.filter(p =>
      p.created_by !== senderEmail &&
      p.latitude && p.longitude &&
      (p.user_status === "disponible" || p.user_status === "en_balade")
    );

    // Find nearby with progressive radius: 10 → 15 → 20 km
    let targets = [];
    for (const radius of [10, 15, 20]) {
      targets = candidates.filter(p =>
        haversine(senderLat, senderLon, p.latitude, p.longitude) <= radius
      );
      if (targets.length >= 5) break;
    }

    if (targets.length === 0) {
      return Response.json({ sent: 0, reason: "no nearby users" });
    }

    // Create notifications in bulk
    const notifications = targets.map(p => ({
      user_email: p.created_by,
      type: "match_suggestion",
      title: "🐶 Cherche compagnon !",
      body: `${senderPseudo} cherche un compagnon de balade près de chez vous !`,
      reference_id: data?.id || "",
      link_page: "Home",
      is_read: false,
    }));

    await Promise.all([
      ...notifications.map(n => base44.asServiceRole.entities.Notification.create(n)),
      // Stamp cooldown timestamp on sender's profile
      base44.asServiceRole.entities.UserProfile.update(data.id, { last_search_notif_at: new Date().toISOString() })
    ]);

    return Response.json({ sent: notifications.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});