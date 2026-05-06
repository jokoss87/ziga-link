import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Callable manuellement par un admin ou via automation (pas d'auth user requise)
  // On se connecte en service role pour accéder aux données
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0]; // YYYY-MM-DD

  // Vérifier si déjà agrégé pour cette date
  const existing = await base44.asServiceRole.entities.DailyAnalytics.filter({ date: dateStr });
  if (existing.length > 0) {
    return Response.json({ message: `DailyAnalytics pour ${dateStr} déjà calculé.`, date: dateStr });
  }

  // Récupérer toutes les sessions de la veille
  const allSessions = await base44.asServiceRole.entities.UserSession.list("-session_start", 1000);
  const sessions = allSessions.filter(s => {
    if (!s.session_start) return false;
    return s.session_start.startsWith(dateStr);
  });

  if (sessions.length === 0) {
    // Enregistrer quand même un record vide pour la date
    await base44.asServiceRole.entities.DailyAnalytics.create({
      date: dateStr,
      total_sessions: 0,
      unique_users: 0,
      avg_duration_seconds: 0,
      avg_active_seconds: 0,
      section_times: {},
      sessions_per_user: 0,
    });
    return Response.json({ message: `Aucune session le ${dateStr}`, date: dateStr });
  }

  const uniqueUsers = new Set(sessions.map(s => s.user_email).filter(Boolean)).size;
  const totalDuration = sessions.reduce((a, s) => a + (s.duration_seconds || 0), 0);
  const totalActive = sessions.reduce((a, s) => a + (s.active_seconds || 0), 0);

  // Agréger les temps par section
  const sectionTotals = {};
  sessions.forEach(s => {
    if (!s.section_times) return;
    Object.entries(s.section_times).forEach(([section, sec]) => {
      sectionTotals[section] = (sectionTotals[section] || 0) + sec;
    });
  });

  const analytics = {
    date: dateStr,
    total_sessions: sessions.length,
    unique_users: uniqueUsers,
    avg_duration_seconds: Math.round(totalDuration / sessions.length),
    avg_active_seconds: Math.round(totalActive / sessions.length),
    section_times: sectionTotals,
    sessions_per_user: uniqueUsers > 0 ? Math.round((sessions.length / uniqueUsers) * 10) / 10 : 0,
  };

  await base44.asServiceRole.entities.DailyAnalytics.create(analytics);

  return Response.json({ success: true, date: dateStr, summary: analytics });
});