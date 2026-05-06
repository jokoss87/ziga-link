import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { announcementId, toEmail, ratingType, dogId, dogName, score, tags } = body;

    // Calculer internal_score
    let baseScore = score === 'green' ? 1 : score === 'red' ? -2 : 0;
    let internalScore = ratingType === 'owner'
      ? Math.round(baseScore * 1.5 * 10) / 10
      : baseScore;

    // Créer l'évaluation
    await base44.asServiceRole.entities.EncounterRating.create({
      announcement_id: announcementId || '',
      from_email: user.email,
      to_email: toEmail,
      dog_id: dogId || '',
      dog_name: dogName || '',
      rating_type: ratingType,
      score,
      tags: tags || [],
      internal_score: internalScore,
    });

    // Charger toutes les évaluations pour to_email
    const allRatings = await base44.asServiceRole.entities.EncounterRating.filter({ to_email: toEmail });
    const reputationScore = allRatings.reduce((sum, r) => sum + (r.internal_score || 0), 0);

    // Mettre à jour UserProfile
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ created_by: toEmail });
    if (profiles.length > 0) {
      await base44.asServiceRole.entities.UserProfile.update(profiles[0].id, { reputation_score: reputationScore });
    }

    // --- Modération propriétaires ---
    if (ratingType === 'owner') {
      const redOwnerRatings = allRatings.filter(r => r.rating_type === 'owner' && r.score === 'red');
      const redCount = redOwnerRatings.length;

      if (redCount >= 2) {
        // Vérifier doublon shadow_ban_owner
        const existing = await base44.asServiceRole.entities.ModerationAlert.filter({
          target_email: toEmail, alert_type: 'shadow_ban_owner', status: 'new'
        });
        if (existing.length === 0) {
          await base44.asServiceRole.entities.ModerationAlert.create({
            alert_type: 'shadow_ban_owner',
            target_email: toEmail,
            trigger_detail: `${redCount} évaluations rouge propriétaire reçues`,
            status: 'new',
            auto_action: 'shadow_ban',
          });
        }
        // Appliquer shadow ban automatiquement
        if (profiles.length > 0) {
          await base44.asServiceRole.entities.UserProfile.update(profiles[0].id, {
            trust_level: 'shadow_banned',
            is_shadow_banned: true,
          });
        }
      } else if (redCount === 1) {
        const existing = await base44.asServiceRole.entities.ModerationAlert.filter({
          target_email: toEmail, alert_type: 'warning_owner', status: 'new'
        });
        if (existing.length === 0) {
          await base44.asServiceRole.entities.ModerationAlert.create({
            alert_type: 'warning_owner',
            target_email: toEmail,
            trigger_detail: '1ère évaluation rouge propriétaire reçue',
            status: 'new',
            auto_action: '',
          });
        }
      }
    }

    // --- Modération chiens ---
    if (dogId) {
      const dogRatings = allRatings.filter(r => r.dog_id === dogId && r.rating_type === 'dog');
      const dogRedCount = dogRatings.filter(r => r.score === 'red').length;
      const dogYellowCount = dogRatings.filter(r => r.score === 'yellow').length;

      if (dogRedCount >= 1 || dogYellowCount >= 3) {
        const existing = await base44.asServiceRole.entities.ModerationAlert.filter({
          dog_id: dogId, alert_type: 'alert_dog', status: 'new'
        });
        if (existing.length === 0) {
          await base44.asServiceRole.entities.ModerationAlert.create({
            alert_type: 'alert_dog',
            target_email: toEmail,
            dog_id: dogId,
            dog_name: dogName || '',
            trigger_detail: `${dogRedCount} rouge(s) + ${dogYellowCount} jaune(s) sur ce chien`,
            status: 'new',
            auto_action: '',
          });
        }
      }
    }

    // --- Modération tags combinés ---
    const currentTags = tags || [];
    if (currentTags.includes('reactif_congeneres') && currentTags.includes('reactif_humains')) {
      const existing = await base44.asServiceRole.entities.ModerationAlert.filter({
        target_email: toEmail, alert_type: 'alert_tags', status: 'new'
      });
      if (existing.length === 0) {
        await base44.asServiceRole.entities.ModerationAlert.create({
          alert_type: 'alert_tags',
          target_email: toEmail,
          dog_id: dogId || '',
          dog_name: dogName || '',
          trigger_detail: 'Tags réactif congénères + réactif humains combinés',
          status: 'new',
          auto_action: '',
        });
      }
    }

    return Response.json({ success: true, reputation_score: reputationScore, internal_score: internalScore });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});