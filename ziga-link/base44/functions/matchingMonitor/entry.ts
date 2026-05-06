import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Scheduled function — à appeler toutes les heures
 * Vérifie si le matching crée assez de matchs et alerte si le taux chute
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now - 48 * 60 * 60 * 1000);

    // Récupérer les matchs des 48h
    const allMatches = await base44.asServiceRole.entities.Match.list("-created_date", 500);
    
    const matchesLast24h = allMatches.filter(m => m.created_date && new Date(m.created_date) >= oneDayAgo).length;
    const matchesPrev24h = allMatches.filter(m => {
      const d = m.created_date ? new Date(m.created_date) : null;
      return d && d >= twoDaysAgo && d < oneDayAgo;
    }).length;

    // Calcul taux de chute
    const drop = matchesPrev24h > 0
      ? Math.round(((matchesPrev24h - matchesLast24h) / matchesPrev24h) * 100)
      : 0;

    const logs = [];

    // Alerte si moins de 1 match créé aujourd'hui
    if (matchesLast24h === 0) {
      logs.push(await base44.asServiceRole.entities.AppLog.create({
        level: "critical",
        category: "matching",
        message: "Aucun match créé dans les dernières 24h",
        details: `Matchs J-1: ${matchesPrev24h} | Matchs J0: ${matchesLast24h}`,
        resolved: false,
      }));
    } else if (drop >= 50) {
      logs.push(await base44.asServiceRole.entities.AppLog.create({
        level: "error",
        category: "matching",
        message: `Chute du taux de matching : -${drop}%`,
        details: `Matchs J-1: ${matchesPrev24h} | Matchs J0: ${matchesLast24h} | Chute: ${drop}%`,
        resolved: false,
      }));
    } else if (drop >= 25) {
      logs.push(await base44.asServiceRole.entities.AppLog.create({
        level: "warn",
        category: "matching",
        message: `Légère baisse du matching : -${drop}%`,
        details: `Matchs J-1: ${matchesPrev24h} | Matchs J0: ${matchesLast24h}`,
        resolved: false,
      }));
    }

    // Log info quotidien
    await base44.asServiceRole.entities.AppLog.create({
      level: "info",
      category: "matching",
      message: `Rapport matching quotidien`,
      details: `Matchs dernières 24h: ${matchesLast24h} | Matchs 24h précédentes: ${matchesPrev24h} | Évolution: ${drop > 0 ? "-" : "+"}${Math.abs(drop)}%`,
      resolved: false,
    });

    return Response.json({
      ok: true,
      matchesLast24h,
      matchesPrev24h,
      drop,
      alertsCreated: logs.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});