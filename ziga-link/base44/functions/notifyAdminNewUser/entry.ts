import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL");

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json();

        const { event, data } = payload;

        if (event?.type !== "create") {
            return Response.json({ skipped: true });
        }

        const pseudo = data?.pseudo || "Nouvel utilisateur";
        const userEmail = data?.created_by || "";
        const profileId = event?.entity_id || "";

        await base44.asServiceRole.entities.Notification.create({
            user_email: ADMIN_EMAIL,
            type: "message",
            title: `🐾 Nouvel utilisateur : ${pseudo}`,
            body: `${pseudo} (${userEmail}) vient de rejoindre Paw Spot !`,
            reference_id: profileId,
            link_page: "Profil",
            link_param: `userId=${userEmail}`,
            is_read: false,
        });

        return Response.json({ success: true, notified: ADMIN_EMAIL });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});