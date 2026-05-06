import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Backend function — Récupère les spots de promenade via Overpass API (OSM)
 * et génère des WalkSpots enrichis côté serveur.
 * 
 * Payload: { lat, lng, radius_km? }
 * Returns: { spots: WalkSpot[] }
 */

// Distance haversine entre deux points (km)
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Surface approximative d'un polygone (m²)
function estimateArea(nodes) {
  if (!nodes || nodes.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < nodes.length - 1; i++) {
    area += (nodes[i].lon + nodes[i + 1].lon) * (nodes[i].lat - nodes[i + 1].lat);
  }
  const latRad = nodes[0].lat * Math.PI / 180;
  const mPerDeg = 111320;
  return Math.abs(area * mPerDeg * mPerDeg * Math.cos(latRad)) / 2;
}

// Centroïde d'une liste de nodes
function centroid(nodes) {
  const lat = nodes.reduce((s, n) => s + n.lat, 0) / nodes.length;
  const lng = nodes.reduce((s, n) => s + n.lon, 0) / nodes.length;
  return { lat, lng };
}

// Détermine le type de spot depuis les tags OSM
function getSpotType(tags) {
  if (tags.amenity === 'dog_park') return 'dog_park';
  if (tags.leisure === 'park') return 'park';
  if (tags.leisure === 'garden') return 'garden';
  if (tags.landuse === 'forest' || tags.natural === 'wood') return 'forest';
  if (tags.natural === 'grassland' || tags.landuse === 'meadow' || tags.landuse === 'grass') return 'grassland';
  if (tags.natural === 'heath') return 'heath';
  if (tags.natural === 'water' || tags.natural === 'lake') return 'water';
  return 'mixed';
}

// Emoji par type
function typeEmoji(type) {
  const m = { forest: '🌲', park: '🌳', dog_park: '🐕', garden: '🌳', grassland: '🌿', heath: '🌾', water: '💧', mixed: '📍' };
  return m[type] || '📍';
}

// Génère des circuits basés sur la surface et le nombre de chemins
function generateCircuits(spot) {
  const circuits = [];
  const area = spot.area_m2 || 0;
  const paths = spot.path_count || 0;

  // Court : 1-2 km (toujours proposé si surface > 5000m²)
  if (area > 5000 || paths >= 1) {
    const dist = Math.max(1, Math.min(2, area / 50000 + paths * 0.3));
    circuits.push({
      label: `🥾 Courte promenade`,
      distance_km: Math.round(dist * 10) / 10,
      duration_min: Math.round(dist * 15),
      difficulty: 'facile',
      surface: spot.spot_type,
      start_lat: spot.latitude,
      start_lng: spot.longitude
    });
  }

  // Moyenne : 3-5 km (surface > 2 ha ou chemins >= 3)
  if (area > 20000 || paths >= 3) {
    const dist = Math.max(3, Math.min(5, area / 30000 + paths * 0.5));
    circuits.push({
      label: `🥾 Balade moyenne`,
      distance_km: Math.round(dist * 10) / 10,
      duration_min: Math.round(dist * 15),
      difficulty: area > 50000 ? 'modéré' : 'facile',
      surface: spot.spot_type,
      start_lat: spot.latitude,
      start_lng: spot.longitude
    });
  }

  // Longue : 6-10 km (grande zone)
  if (area > 100000 || paths >= 6) {
    const dist = Math.max(6, Math.min(10, area / 20000 + paths * 0.6));
    circuits.push({
      label: `🥾 Grande randonnée`,
      distance_km: Math.round(dist * 10) / 10,
      duration_min: Math.round(dist * 14),
      difficulty: 'difficile',
      surface: spot.spot_type,
      start_lat: spot.latitude,
      start_lng: spot.longitude
    });
  }

  return circuits;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { lat, lng, radius_km = 10 } = await req.json();
    if (!lat || !lng) return Response.json({ error: 'lat/lng requis' }, { status: 400 });

    const radius_m = Math.min(radius_km, 10) * 1000;

    // ─── Requête Overpass (uniquement espaces verts + zones naturelles) ────────
    const overpassQuery = `
[out:json][timeout:15];
(
  way["leisure"="park"](around:${radius_m},${lat},${lng});
  way["leisure"="garden"](around:${radius_m},${lat},${lng});
  way["landuse"="forest"](around:${radius_m},${lat},${lng});
  way["landuse"="grass"](around:${radius_m},${lat},${lng});
  way["landuse"="meadow"](around:${radius_m},${lat},${lng});
  way["natural"="wood"](around:${radius_m},${lat},${lng});
  way["natural"="grassland"](around:${radius_m},${lat},${lng});
  way["natural"="heath"](around:${radius_m},${lat},${lng});
  way["amenity"="dog_park"](around:${radius_m},${lat},${lng});
  way["natural"="water"](around:${radius_m},${lat},${lng});
  way["waterway"="river"](around:${radius_m},${lat},${lng});
  way["waterway"="stream"](around:${radius_m},${lat},${lng});
  way["highway"="path"](around:${radius_m},${lat},${lng});
  way["highway"="footway"](around:${radius_m},${lat},${lng});
  way["highway"="track"](around:${radius_m},${lat},${lng});
  way["highway"="bridleway"](around:${radius_m},${lat},${lng});
);
out body;
>;
out skel qt;`;

    const osmResp = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(overpassQuery)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(18000),
    });

    if (!osmResp.ok) {
      return Response.json({ error: 'Overpass API error', spots: [] }, { status: 200 });
    }

    const osmData = await osmResp.json();
    const elements = osmData.elements || [];

    // ─── Indexer les nodes ────────────────────────────────────────────────────
    const nodeMap = {};
    elements.filter(e => e.type === 'node').forEach(n => { nodeMap[n.id] = n; });

    const ways = elements.filter(e => e.type === 'way' && e.tags);

    // ─── Séparer espaces naturels et chemins ──────────────────────────────────
    const naturalAreas = ways.filter(w => {
      const t = w.tags;
      return t.leisure || t.landuse || t.natural || t.amenity === 'dog_park';
    });

    const pathWays = ways.filter(w => {
      const t = w.tags;
      return ['path', 'footway', 'track', 'bridleway'].includes(t.highway);
    });

    const waterWays = ways.filter(w => {
      const t = w.tags;
      return t.natural === 'water' || t.natural === 'lake' || t.waterway;
    });

    // ─── Construire les spots ──────────────────────────────────────────────────
    const rawSpots = [];

    for (const area of naturalAreas) {
      const tags = area.tags;
      const spotType = getSpotType(tags);

      // Récupérer les nodes du way
      const nodes = (area.nodes || []).map(nid => nodeMap[nid]).filter(Boolean);
      if (nodes.length < 2) continue;

      const center = centroid(nodes);

      // Filtrer trop loin (sécurité)
      const dist = haversine(lat, lng, center.lat, center.lng);
      if (dist > radius_km) continue;

      const areaM2 = estimateArea(nodes);

      // Ne garder que les zones > 1000m² (exclure micro-jardins)
      if (areaM2 < 1000 && spotType !== 'dog_park') continue;

      // Chemins dans un rayon de 300m du centroïde
      const nearbyPaths = pathWays.filter(p => {
        const pNodes = (p.nodes || []).map(nid => nodeMap[nid]).filter(Boolean);
        if (pNodes.length === 0) return false;
        const pc = centroid(pNodes);
        return haversine(center.lat, center.lng, pc.lat, pc.lng) < 0.3;
      });

      // Eau à proximité
      const hasWater = waterWays.some(w => {
        const wNodes = (w.nodes || []).map(nid => nodeMap[nid]).filter(Boolean);
        if (wNodes.length === 0) return false;
        const wc = centroid(wNodes);
        return haversine(center.lat, center.lng, wc.lat, wc.lng) < 0.5;
      });

      // Critère Dog Walk Spot : (forêt ou parc) + quelques chemins + > 1ha
      const isGoodSpot = (
        spotType !== 'water' &&
        (areaM2 > 10000 || nearbyPaths.length >= 1 || spotType === 'dog_park')
      );
      if (!isGoodSpot) continue;

      rawSpots.push({
        osm_id: String(area.id),
        name: tags.name || `${typeEmoji(spotType)} ${spotType === 'dog_park' ? 'Parc à chiens' : spotType === 'forest' ? 'Zone forestière' : spotType === 'park' ? 'Parc' : 'Zone naturelle'}`,
        spot_type: spotType,
        latitude: center.lat,
        longitude: center.lng,
        area_m2: Math.round(areaM2),
        path_count: nearbyPaths.length,
        has_water: hasWater,
        activity_level: 'low',
        walk_count: 0,
      });
    }

    // ─── Dédoublonner (regrouper spots < 200m) ───────────────────────────────
    const merged = [];
    for (const spot of rawSpots) {
      const existing = merged.find(s => haversine(s.latitude, s.longitude, spot.latitude, spot.longitude) < 0.2);
      if (existing) {
        existing.area_m2 = Math.max(existing.area_m2, spot.area_m2);
        existing.path_count += spot.path_count;
        existing.has_water = existing.has_water || spot.has_water;
        if (spot.spot_type === 'dog_park') existing.spot_type = 'dog_park';
      } else {
        merged.push({ ...spot });
      }
    }

    // ─── Générer les circuits ─────────────────────────────────────────────────
    const finalSpots = merged.map(spot => ({
      ...spot,
      circuits: generateCircuits(spot),
    }));

    // ─── Sync avec BDD (upsert par osm_id) ───────────────────────────────────
    const existingSpots = await base44.asServiceRole.entities.WalkSpot.filter(
      { zoneTag: user.zoneTag || 'global' }, '-created_date', 200
    ).catch(() => []);

    const existingOsmIds = new Set(existingSpots.map(s => s.osm_id).filter(Boolean));

    let saved = 0;
    for (const spot of finalSpots.slice(0, 50)) {
      if (!existingOsmIds.has(spot.osm_id)) {
        await base44.asServiceRole.entities.WalkSpot.create({
          ...spot,
          zoneTag: 'global',
          last_osm_sync: new Date().toISOString(),
        }).catch(() => null);
        saved++;
      }
    }

    return Response.json({
      spots: finalSpots,
      total: finalSpots.length,
      saved_new: saved,
    });

  } catch (error) {
    return Response.json({ error: error.message, spots: [] }, { status: 500 });
  }
});