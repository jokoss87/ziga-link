import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ALL_TYPES = [
  { type_key: "canicross",         label: "Canicross",                    emoji: "🐕‍🦺", sort_order: 1,  is_active: true },
  { type_key: "cani_vtt",          label: "Cani VTT",                     emoji: "🚴",  sort_order: 2,  is_active: true },
  { type_key: "randonnee",         label: "Randonnée",                    emoji: "🥾",  sort_order: 3,  is_active: true },
  { type_key: "agility",           label: "Agility / Parcours",           emoji: "🏅",  sort_order: 4,  is_active: true },
  { type_key: "frisbee",           label: "Frisbee",                      emoji: "🥏",  sort_order: 5,  is_active: true },
  { type_key: "traction",          label: "Traction",                     emoji: "💪",  sort_order: 6,  is_active: true },
  { type_key: "parkour",           label: "Parkour",                      emoji: "🏙️", sort_order: 7,  is_active: true },
  { type_key: "pistage",           label: "Pistage",                      emoji: "👃",  sort_order: 8,  is_active: true },
  { type_key: "concours",          label: "Concours",                     emoji: "🏆",  sort_order: 9,  is_active: true },
  { type_key: "mantrailing",       label: "Mantrailing",                  emoji: "👃",  sort_order: 10, is_active: true },
  { type_key: "dog_dancing",       label: "Dog Dancing",                  emoji: "💃",  sort_order: 11, is_active: true },
  { type_key: "autre_sport",       label: "Autre sport",                  emoji: "✨",  sort_order: 12, is_active: true },
  { type_key: "obeissance",        label: "Obéissance",                   emoji: "🎓",  sort_order: 13, is_active: true },
  { type_key: "shaping",           label: "Shaping",                      emoji: "🧠",  sort_order: 14, is_active: true },
  { type_key: "socialisation",     label: "Socialisation",                emoji: "🐕",  sort_order: 15, is_active: true },
  { type_key: "marche_laisse",     label: "Marche en laisse",             emoji: "🦮",  sort_order: 16, is_active: true },
  { type_key: "gestion_emotions",  label: "Gestion des émotions",        emoji: "🧘",  sort_order: 17, is_active: true },
  { type_key: "renoncement",       label: "Renoncement / Auto-contrôle", emoji: "🛑",  sort_order: 18, is_active: true },
  { type_key: "nosework",          label: "Nose work / Recherche",        emoji: "🔍",  sort_order: 19, is_active: true },
  { type_key: "concours_dressage", label: "Entraînement concours",       emoji: "🏆",  sort_order: 20, is_active: true },
  { type_key: "libre",             label: "Libre",                        emoji: "🌿",  sort_order: 21, is_active: true },
  { type_key: "autre_dressage",    label: "Autre dressage",               emoji: "✨",  sort_order: 22, is_active: true },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await base44.asServiceRole.entities.ActivityConfig.list("sort_order", 100);
    const existingKeys = new Set(existing.map(c => c.type_key));

    const missing = ALL_TYPES.filter(t => !existingKeys.has(t.type_key));
    const created = [];

    for (const type of missing) {
      await base44.asServiceRole.entities.ActivityConfig.create(type);
      created.push(type.type_key);
    }

    console.log(`[seedActivityConfig] existing=${existing.length}, created=${created.length}`, created);

    return Response.json({
      success: true,
      existing: existing.length,
      created: created.length,
      created_keys: created,
      total: existing.length + created.length,
    });
  } catch (error) {
    console.error('[seedActivityConfig] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});