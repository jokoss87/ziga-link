import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Haversine distance in km
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceScore(km) {
  if (km <= 3) return 100;
  if (km <= 7) return 80;
  if (km <= 15) return 55;
  if (km <= 25) return 30;
  return 5;
}

const SIZE_COMPAT = {
  small: { small: 100, medium: 70, large: 40 },
  medium: { small: 70, medium: 100, large: 70 },
  large: { small: 40, medium: 70, large: 100 },
};

const ENERGY_COMPAT = {
  low: { low: 100, medium: 60, high: 20 },
  medium: { low: 60, medium: 100, high: 60 },
  high: { low: 20, medium: 60, high: 100 },
};

function compatScore(myDog, otherDog) {
  let score = 0;
  let count = 0;
  if (myDog.size && otherDog.size) { score += SIZE_COMPAT[myDog.size]?.[otherDog.size] ?? 50; count++; }
  if (myDog.energy_level && otherDog.energy_level) { score += ENERGY_COMPAT[myDog.energy_level]?.[otherDog.energy_level] ?? 50; count++; }
  if (myDog.age_years != null && otherDog.age_years != null) {
    const diff = Math.abs(myDog.age_years - otherDog.age_years);
    score += diff <= 1 ? 100 : diff <= 3 ? 70 : diff <= 6 ? 40 : 20;
    count++;
  }
  if (myDog.good_with_dogs && otherDog.good_with_dogs) {
    const soc = { yes: 100, sometimes: 60, no: 10 };
    score += Math.min(soc[myDog.good_with_dogs] ?? 50, soc[otherDog.good_with_dogs] ?? 50);
    count++;
  }
  return count > 0 ? score / count : 50;
}

function globalScore(distKm, myDog, otherDog, hasCommonActivity) {
  const d = distanceScore(distKm) * 0.4;
  const c = compatScore(myDog, otherDog) * 0.3;
  const a = (hasCommonActivity ? 100 : 30) * 0.2;
  const avail = 50 * 0.1;
  return Math.round(d + c + a + avail);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { userLat, userLng } = await req.json().catch(() => ({}));

    // Check if already received a match suggestion today
    const today = new Date().toISOString().split('T')[0];
    const existingNotifs = await base44.entities.Notification.filter({
      user_email: user.email,
      type: 'match_suggestion',
    }, '-created_date', 5);

    const alreadySentToday = existingNotifs.some(n => {
      const notifDate = new Date(n.created_date).toISOString().split('T')[0];
      return notifDate === today;
    });

    if (alreadySentToday) {
      return Response.json({ already_sent: true });
    }

    // Load user's dogs
    const myDogs = await base44.entities.DogProfile.filter({ created_by: user.email });
    if (myDogs.length === 0) return Response.json({ no_dogs: true });

    const selectedDog = myDogs[0];

    // Load all open announcements
    const openAnns = await base44.entities.MeetupAnnouncement.filter({ status: 'open' }, '-created_date', 100);

    // Load all other dogs
    const allDogs = await base44.entities.DogProfile.list('-created_date', 200);
    const otherDogs = allDogs.filter(d => d.created_by !== user.email);

    const myAnns = openAnns.filter(a => a.created_by === user.email);
    const myActivityTypes = new Set(myAnns.map(a => a.type).filter(Boolean));

    const annsByOwner = {};
    openAnns.forEach(a => {
      if (!annsByOwner[a.created_by]) annsByOwner[a.created_by] = [];
      annsByOwner[a.created_by].push(a);
    });

    const results = otherDogs.map(dog => {
      let distKm = null;
      const ownerAnns = annsByOwner[dog.created_by] || [];
      const annWithPos = ownerAnns.find(a => a.latitude && a.longitude);
      
      if (userLat && userLng && annWithPos) {
        distKm = haversine(userLat, userLng, annWithPos.latitude, annWithPos.longitude);
      }

      const ownerActivityTypes = new Set(ownerAnns.map(a => a.type).filter(Boolean));
      const hasCommonActivity = [...myActivityTypes].some(t => ownerActivityTypes.has(t));
      const score = globalScore(distKm != null ? distKm : 20, selectedDog, dog, hasCommonActivity);

      return { dog, score, distKm, announcement: ownerAnns[0] || null };
    })
    .filter(s => s.score > 0 && s.announcement)
    .sort((a, b) => {
      // Priority: distance first, then score
      if (a.distKm != null && b.distKm != null) return a.distKm - b.distKm;
      return b.score - a.score;
    });

    if (results.length === 0) return Response.json({ no_matches: true });

    const best = results[0];
    const distLabel = best.distKm != null
      ? best.distKm < 1 ? `${Math.round(best.distKm * 1000)} m` : `${best.distKm.toFixed(1)} km`
      : null;

    const body = distLabel
      ? `${best.dog.name} est à ${distLabel} de vous 🐾`
      : `${best.dog.name} cherche un partenaire de balade 🐾`;

    // Create notification
    const notif = await base44.entities.Notification.create({
      user_email: user.email,
      type: 'match_suggestion',
      title: '🐾 Un match sympa vous attend près de chez vous !',
      body,
      reference_id: best.announcement.id,
      link_page: 'AnnouncementDetail',
      link_param: `id=${best.announcement.id}`,
      is_read: false,
    });

    return Response.json({ 
      success: true, 
      match: {
        dog_name: best.dog.name,
        dist_label: distLabel,
        announcement_id: best.announcement.id,
      },
      notification_id: notif.id,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});