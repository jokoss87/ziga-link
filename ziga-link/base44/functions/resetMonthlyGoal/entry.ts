import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const configs = await base44.asServiceRole.entities.SupportConfig.list();
  if (configs.length === 0) {
    return Response.json({ message: "Aucun SupportConfig trouvé" });
  }

  const cfg = configs[0];
  const previous = cfg.monthly_goal_reached || 0;

  await base44.asServiceRole.entities.SupportConfig.update(cfg.id, {
    monthly_goal_reached: 0,
  });

  await base44.asServiceRole.entities.AppLog.create({
    category: "support",
    message: `Objectif mensuel réinitialisé (était: ${previous}€)`,
    level: "info",
  });

  console.log(`[resetMonthlyGoal] monthly_goal_reached réinitialisé (était ${previous}€)`);
  return Response.json({ success: true, previous_value: previous });
});