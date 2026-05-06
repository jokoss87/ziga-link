import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const UserProfileContext = createContext(null);

export function UserProfileProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const me = await base44.auth.me().catch(() => null);
      setUser(me);
      if (!me) { setLoading(false); return; }

      const profiles = await base44.entities.UserProfile.filter({ created_by: me.email });

      if (profiles.length > 0) {
        // Profil existant — on l'utilise directement
        setProfile(profiles[0]);
      } else {
        // CORRECTION : créer automatiquement un UserProfile minimal
        // pour que 100% des utilisateurs soient modérables dès la connexion
        const pseudoFromEmail = me.email.split("@")[0];
        try {
          const created = await base44.entities.UserProfile.create({
            pseudo: me.full_name || pseudoFromEmail,
            city: "",
            bio: "",
            photo_url: "",
            latitude: 0,
            longitude: 0,
            postalCode: "",
            zoneTag: "general",
            user_status: "disponible",
            experience_level: "",
            preferred_activities: [],
            is_shadow_banned: false,
            reputation_score: 0,
            cgu_accepted: false,
            onboarding_step: 0,
          });
          setProfile(created);
        } catch (createErr) {
          console.warn("[UserProfileContext] Création profil minimal échouée:", createErr);
          // Ne pas bloquer — l'utilisateur peut quand même utiliser l'app
          setProfile(null);
        }
      }
    } catch (err) {
      console.error("Erreur rechargement profil:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, []);

  useEffect(() => {
    const unsub = base44.entities.UserProfile.subscribe((event) => {
      if (event.type === "update" && event.data) {
        setProfile(prev =>
          prev && prev.id === event.data.id ? { ...prev, ...event.data } : prev
        );
      }
    });
    return unsub;
  }, []);

  const updateStatus = useCallback(async (status) => {
    if (!profile?.id) return;
    setProfile(prev => ({ ...prev, user_status: status }));
    await base44.entities.UserProfile.update(profile.id, { user_status: status }).catch(() => {
      setProfile(prev => ({ ...prev, user_status: profile.user_status }));
    });
  }, [profile]);

  const updateProfile = useCallback((newProfile) => {
    setProfile(newProfile);
  }, []);

  return (
    <UserProfileContext.Provider value={{ user, profile, loading, reload, updateStatus, setProfile, updateProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfileContext() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error("useUserProfileContext must be used inside UserProfileProvider");
  return ctx;
}