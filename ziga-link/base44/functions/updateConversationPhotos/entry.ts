import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const payload = await req.json();
  const { data, old_data, event } = payload;

  // Vérifier si la photo a réellement changé
  const newPhoto = data?.photo_url;
  const oldPhoto = old_data?.photo_url;

  if (!newPhoto || newPhoto === oldPhoto) {
    return Response.json({ skipped: true, reason: "photo_unchanged" });
  }

  const userEmail = data?.created_by;
  if (!userEmail) {
    return Response.json({ skipped: true, reason: "no_email" });
  }

  // Charger toutes les conversations où cet utilisateur est membre
  const conversations = await base44.asServiceRole.entities.Conversation.list("-created_date", 500);
  const userConversations = conversations.filter(c => c.members?.includes(userEmail));

  if (userConversations.length === 0) {
    return Response.json({ updated: 0 });
  }

  let updated = 0;
  for (const conv of userConversations) {
    const members = conv.members || [];
    const photos = [...(conv.member_photos || [])];

    // S'assurer que le tableau photos a la bonne taille
    while (photos.length < members.length) photos.push(null);

    const idx = members.indexOf(userEmail);
    if (idx === -1) continue;

    if (photos[idx] === newPhoto) continue; // déjà à jour

    photos[idx] = newPhoto;
    await base44.asServiceRole.entities.Conversation.update(conv.id, { member_photos: photos });
    updated++;
  }

  return Response.json({ updated, userEmail });
});