// Système de badges et XP centralisé

// Retourne { current, target } si le badge a un seuil numérique mesurable, sinon null
export function getBadgeProgress(badge, statsData) {
  if (!statsData) return null;
  const map = {
    sessions:           statsData.sessions,
    balades:            statsData.balades || 0,
    totalMinutes:       statsData.totalMinutes,
    sessionTypes:       statsData.sessionTypes,
    meetups:            statsData.meetups,
    dogs:               statsData.dogs,
    activitiesOrganized:statsData.activitiesOrganized,
    activitiesJoined:   statsData.activitiesJoined,
    friends:            statsData.friends || 0,
    sportSessions:      statsData.sportSessions || 0,
    obedienceSessions:  statsData.obedienceSessions || 0,
    dailyChallenges:    statsData.dailyChallenges || 0,
    paymentCount:       statsData.paymentCount || 0,
    totalPaid:          statsData.totalPaid || 0,
  };
  // Cherche le premier paramètre numérique dans la condition (d) => d.X >= N
  const src = badge.condition.toString();
  const match = src.match(/d\.(\w+)\s*>=\s*(\d+)/);
  if (!match) return null;
  const [, key, targetStr] = match;
  const target = parseInt(targetStr, 10);
  const current = map[key] ?? 0;
  return { current, target };
}

export const BADGES = [
  // ── Séances ──────────────────────────────────────────────────────────────
  { id: "first_session",  label: "Première séance", emoji: "🌟", desc: "Enregistrez votre 1ère séance",    xp: 50,   condition: (d) => d.sessions >= 1,   category: "séances" },
  { id: "sessions_3",     label: "En route !",       emoji: "🚀", desc: "3 séances enregistrées",           xp: 75,   condition: (d) => d.sessions >= 3,   category: "séances" },
  { id: "sessions_5",     label: "Régulier",         emoji: "🔥", desc: "5 séances enregistrées",           xp: 100,  condition: (d) => d.sessions >= 5,   category: "séances" },
  { id: "sessions_10",    label: "Assidu",           emoji: "💪", desc: "10 séances enregistrées",          xp: 200,  condition: (d) => d.sessions >= 10,  category: "séances" },
  { id: "sessions_25",    label: "Marathonien",      emoji: "🏃", desc: "25 séances enregistrées",          xp: 400,  condition: (d) => d.sessions >= 25,  category: "séances" },
  { id: "sessions_50",    label: "Centurion",        emoji: "👑", desc: "50 séances enregistrées",          xp: 750,  condition: (d) => d.sessions >= 50,  category: "séances" },
  { id: "sessions_100",   label: "Inarrêtable",      emoji: "🌋", desc: "100 séances enregistrées",         xp: 1200, condition: (d) => d.sessions >= 100, category: "séances" },

  // ── Balades ───────────────────────────────────────────────────────────────
  { id: "balade_1",  label: "Premier pas",    emoji: "🐾", desc: "1ère balade enregistrée",       xp: 50,  condition: (d) => (d.balades || 0) >= 1,  category: "balades" },
  { id: "balade_3",  label: "Matinal",        emoji: "🌅", desc: "3 balades enregistrées",         xp: 75,  condition: (d) => (d.balades || 0) >= 3,  category: "balades" },
  { id: "balade_10", label: "Randonneur",     emoji: "🌿", desc: "10 balades enregistrées",        xp: 150, condition: (d) => (d.balades || 0) >= 10, category: "balades" },
  { id: "balade_25", label: "Grand marcheur", emoji: "🗺️", desc: "25 balades enregistrées",        xp: 300, condition: (d) => (d.balades || 0) >= 25, category: "balades" },
  { id: "balade_50", label: "Explorateur",   emoji: "🏔️", desc: "50 balades enregistrées",        xp: 500, condition: (d) => (d.balades || 0) >= 50, category: "balades" },

  // ── Temps ─────────────────────────────────────────────────────────────────
  { id: "time_60",   label: "1 heure",   emoji: "⏱️", desc: "1h d'entraînement cumulé",  xp: 60,  condition: (d) => d.totalMinutes >= 60,   category: "temps" },
  { id: "time_300",  label: "5 heures",  emoji: "⌚",  desc: "5h d'entraînement cumulé",  xp: 150, condition: (d) => d.totalMinutes >= 300,  category: "temps" },
  { id: "time_600",  label: "10 heures", emoji: "🕐", desc: "10h d'entraînement cumulé", xp: 300, condition: (d) => d.totalMinutes >= 600,  category: "temps" },
  { id: "time_1440", label: "24 heures", emoji: "🌙", desc: "24h d'entraînement cumulé", xp: 600, condition: (d) => d.totalMinutes >= 1440, category: "temps" },

  // ── Variété ───────────────────────────────────────────────────────────────
  { id: "variety_2", label: "Curieux",       emoji: "🔍", desc: "2 types de séances différentes", xp: 75,  condition: (d) => d.sessionTypes >= 2, category: "variété" },
  { id: "variety_3", label: "Polyvalent",    emoji: "🎯", desc: "3 types de séances différentes", xp: 120, condition: (d) => d.sessionTypes >= 3, category: "variété" },
  { id: "variety_5", label: "Touche à tout", emoji: "🌈", desc: "5 types de séances différentes", xp: 250, condition: (d) => d.sessionTypes >= 5, category: "variété" },
  { id: "variety_7", label: "Complet",       emoji: "🦄", desc: "7 types de séances différentes", xp: 400, condition: (d) => d.sessionTypes >= 7, category: "variété" },

  // ── Social ────────────────────────────────────────────────────────────────
  { id: "first_meetup",    label: "Première rencontre", emoji: "👋", desc: "1ère rencontre réalisée",       xp: 100, condition: (d) => d.meetups >= 1,              category: "social" },
  { id: "meetups_3",       label: "Sociable",            emoji: "🐕", desc: "3 rencontres réalisées",        xp: 150, condition: (d) => d.meetups >= 3,              category: "social" },
  { id: "meetups_5",       label: "Populaire",           emoji: "😊", desc: "5 rencontres réalisées",        xp: 200, condition: (d) => d.meetups >= 5,              category: "social" },
  { id: "meetups_10",      label: "Figure locale",       emoji: "🌐", desc: "10 rencontres réalisées",       xp: 350, condition: (d) => d.meetups >= 10,             category: "social" },
  { id: "meetups_20",      label: "Pilier communauté",   emoji: "🏘️", desc: "20 rencontres réalisées",       xp: 500, condition: (d) => d.meetups >= 20,             category: "social" },
  { id: "friend_1",        label: "Premier ami",         emoji: "🤝", desc: "1er ami ajouté",                xp: 75,  condition: (d) => (d.friends || 0) >= 1,       category: "social" },
  { id: "friend_3",        label: "Clan naissant",       emoji: "👨‍👩‍👧", desc: "3 amis ajoutés",              xp: 100, condition: (d) => (d.friends || 0) >= 3,       category: "social" },
  { id: "friend_5",        label: "Belle bande",         emoji: "🫂", desc: "5 amis ajoutés",                xp: 150, condition: (d) => (d.friends || 0) >= 5,       category: "social" },
  { id: "friend_10",       label: "Communautaire",       emoji: "🌳", desc: "10 amis ajoutés",               xp: 300, condition: (d) => (d.friends || 0) >= 10,      category: "social" },

  // ── Organisation ──────────────────────────────────────────────────────────
  { id: "first_activity",      label: "Organisateur",    emoji: "📣", desc: "1ère activité créée",       xp: 100, condition: (d) => d.activitiesOrganized >= 1,  category: "organisation" },
  { id: "activities_org_3",    label: "Planificateur",   emoji: "🗓️", desc: "3 activités créées",        xp: 150, condition: (d) => d.activitiesOrganized >= 3,  category: "organisation" },
  { id: "activities_org_5",    label: "Animateur",       emoji: "🎪", desc: "5 activités créées",        xp: 250, condition: (d) => d.activitiesOrganized >= 5,  category: "organisation" },
  { id: "activities_org_10",   label: "Leader canin",    emoji: "🎯", desc: "10 activités créées",       xp: 400, condition: (d) => d.activitiesOrganized >= 10, category: "organisation" },
  { id: "activities_joined_1", label: "Premier inscrit", emoji: "🏕️", desc: "1ère activité rejointe",   xp: 75,  condition: (d) => d.activitiesJoined >= 1,     category: "organisation" },
  { id: "activities_joined_3", label: "Participant actif",emoji: "🙋", desc: "3 activités rejointes",    xp: 150, condition: (d) => d.activitiesJoined >= 3,     category: "organisation" },
  { id: "activities_joined_5", label: "Fidèle",          emoji: "🎗️", desc: "5 activités rejointes",    xp: 250, condition: (d) => d.activitiesJoined >= 5,     category: "organisation" },

  // ── Profil ────────────────────────────────────────────────────────────────
  { id: "first_dog",       label: "Maître chien",   emoji: "🐕", desc: "Ajoutez votre 1er chien",  xp: 50,  condition: (d) => d.dogs >= 1,      category: "profil" },
  { id: "dogs_2",          label: "Famille canine", emoji: "🐾", desc: "2 chiens ajoutés",          xp: 100, condition: (d) => d.dogs >= 2,      category: "profil" },
  { id: "dogs_3",          label: "Meute",          emoji: "🐩", desc: "3 chiens ajoutés",          xp: 150, condition: (d) => d.dogs >= 3,      category: "profil" },
  { id: "profile_complete",label: "Profil complet", emoji: "✅", desc: "Complétez votre profil",   xp: 80,  condition: (d) => d.profileComplete, category: "profil" },

  // ── Sport ─────────────────────────────────────────────────────────────────
  { id: "sport_1",  label: "Sportif",  emoji: "🏅", desc: "1ère séance sport",   xp: 75,  condition: (d) => (d.sportSessions || 0) >= 1,  category: "sport" },
  { id: "sport_3",  label: "En forme", emoji: "🚀", desc: "3 séances sport",     xp: 100, condition: (d) => (d.sportSessions || 0) >= 3,  category: "sport" },
  { id: "sport_5",  label: "Athlète",  emoji: "💪", desc: "5 séances sport",     xp: 150, condition: (d) => (d.sportSessions || 0) >= 5,  category: "sport" },
  { id: "sport_10", label: "Champion", emoji: "🏆", desc: "10 séances sport",    xp: 250, condition: (d) => (d.sportSessions || 0) >= 10, category: "sport" },

  // ── Obéissance ────────────────────────────────────────────────────────────
  { id: "obedience_1",  label: "Première leçon", emoji: "🎓", desc: "1ère séance obéissance",   xp: 75,  condition: (d) => (d.obedienceSessions || 0) >= 1,  category: "obéissance" },
  { id: "obedience_5",  label: "Élève sérieux",  emoji: "📚", desc: "5 séances obéissance",     xp: 150, condition: (d) => (d.obedienceSessions || 0) >= 5,  category: "obéissance" },
  { id: "obedience_10", label: "Bon élève",      emoji: "🧑‍🏫", desc: "10 séances obéissance",  xp: 250, condition: (d) => (d.obedienceSessions || 0) >= 10, category: "obéissance" },
  { id: "obedience_20", label: "Maître & chien", emoji: "🌟", desc: "20 séances obéissance",    xp: 400, condition: (d) => (d.obedienceSessions || 0) >= 20, category: "obéissance" },

  // ── Défis ─────────────────────────────────────────────────────────────────
  { id: "defi_1",   label: "Premier défi",        emoji: "⚡", desc: "1er défi du jour complété",  xp: 50,   condition: (d) => (d.dailyChallenges || 0) >= 1,   category: "défis" },
  { id: "defi_3",   label: "En rythme",           emoji: "🔥", desc: "3 défis complétés",          xp: 100,  condition: (d) => (d.dailyChallenges || 0) >= 3,   category: "défis" },
  { id: "defi_7",   label: "Discipliné",          emoji: "💪", desc: "7 défis complétés",          xp: 150,  condition: (d) => (d.dailyChallenges || 0) >= 7,   category: "défis" },
  { id: "defi_14",  label: "Régulier",            emoji: "🌟", desc: "14 défis complétés",         xp: 250,  condition: (d) => (d.dailyChallenges || 0) >= 14,  category: "défis" },
  { id: "defi_30",  label: "Sérieux",             emoji: "🏅", desc: "30 défis complétés",         xp: 400,  condition: (d) => (d.dailyChallenges || 0) >= 30,  category: "défis" },
  { id: "defi_50",  label: "Maître des défis",    emoji: "🏆", desc: "50 défis complétés",         xp: 600,  condition: (d) => (d.dailyChallenges || 0) >= 50,  category: "défis" },
  { id: "defi_100", label: "Légende des défis",   emoji: "👑", desc: "100 défis complétés",        xp: 1000, condition: (d) => (d.dailyChallenges || 0) >= 100, category: "défis" },

  // ── Soutien ───────────────────────────────────────────────────────────────
  { id: "support_first",   label: "Généreux",   emoji: "💚", desc: "Premier soutien à Ziga Link",     xp: 300, condition: (d) => (d.paymentCount || 0) >= 1,                                           category: "soutien" },
  { id: "support_monthly", label: "Créateur",   emoji: "⭐", desc: "Soutien mensuel actif",           xp: 500, condition: (d) => d.isMonthlySupport === true,                                          category: "soutien" },
  { id: "support_3",       label: "Bienfaiteur",emoji: "💛", desc: "3 paiements de soutien",          xp: 600, condition: (d) => (d.paymentCount || 0) >= 3,                                           category: "soutien" },
  { id: "support_20eur",   label: "Mécène",     emoji: "💜", desc: "20€ de soutien cumulé",           xp: 800, condition: (d) => (d.totalPaid || 0) >= 20,                                             category: "soutien" },
];

export const LEVELS = [
  { level: 1, label: "Novice", minXp: 0, maxXp: 200, color: "text-stone-500", bg: "bg-stone-100", emoji: "🐾" },
  { level: 2, label: "Débutant", minXp: 200, maxXp: 500, color: "text-green-600", bg: "bg-green-100", emoji: "🌱" },
  { level: 3, label: "Passionné", minXp: 500, maxXp: 1000, color: "text-teal-600", bg: "bg-teal-100", emoji: "⭐" },
  { level: 4, label: "Confirmé", minXp: 1000, maxXp: 2000, color: "text-blue-600", bg: "bg-blue-100", emoji: "💫" },
  { level: 5, label: "Expert", minXp: 2000, maxXp: 3500, color: "text-purple-600", bg: "bg-purple-100", emoji: "🔮" },
  { level: 6, label: "Maître", minXp: 3500, maxXp: 6000, color: "text-amber-600", bg: "bg-amber-100", emoji: "👑" },
  { level: 7, label: "Légende", minXp: 6000, maxXp: Infinity, color: "text-rose-600", bg: "bg-rose-100", emoji: "🏆" },
];

export function getLevelInfo(xp) {
  const lvl = LEVELS.slice().reverse().find(l => xp >= l.minXp) || LEVELS[0];
  const next = LEVELS.find(l => l.level === lvl.level + 1);
  const progress = next ? Math.round(((xp - lvl.minXp) / (next.minXp - lvl.minXp)) * 100) : 100;
  return { ...lvl, xp, next, progress };
}

export function computeXP(data) {
  let xp = 0;
  for (const badge of BADGES) {
    if (badge.condition(data)) xp += badge.xp;
  }
  return xp;
}

export function getEarnedBadges(data) {
  return BADGES.filter(b => b.condition(data));
}