import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import HomeHero from "@/components/home/HomeHero";

import ExitFeedbackPopup from "@/components/home/ExitFeedbackPopup";
import HomeSectionsBlock from "@/components/home/HomeSectionsBlock";
import ChallengeWidget from "@/components/home/ChallengeWidget";
import DailyMatchTrigger from "@/components/home/DailyMatchTrigger";
import WelcomeSplash from "@/components/home/WelcomeSplash";
import { cachedFetch, cacheInvalidate } from "@/components/lib/cache";
import { HOME_SECTIONS as DEFAULT_SECTIONS } from "@/components/home/homeLayout.config";
import PullToRefresh from "@/components/ui/PullToRefresh";

const HOME_TTL = 30 * 1000; // 30s — réduit pour éviter les données obsolètes

const SECTION_MAP = (props) => ({
  nearby: <HomeSectionsBlock key="nearby" announcements={props.announcements} activities={props.activities} loading={props.loading} miniMap={props.announcements} currentUser={props.user} shadowEmails={props.shadowEmails} onRefresh={props.onRefresh} />,
  map: null,
  activities: null,
  suggestion: null,
  challenge: !props.loading ? <ChallengeWidget key="challenge" progressEntries={props.progressEntries} /> : null,
  feed: null,
});

export default function Home() {
  const { user, profile } = useUserProfile();
  const location = useLocation();

  // Scroll vers la section activités si section=activities dans l'URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("section") === "activities") {
      setTimeout(() => {
        document.getElementById("activities-section")?.scrollIntoView({ behavior: "smooth" });
        window.history.replaceState({}, "", "/");
      }, 600);
    }
  }, [location.search]);
  const [announcements, setAnnouncements] = useState([]);
  const [activities, setActivities] = useState([]);
  const [posts, setPosts] = useState([]);
  const [progressEntries, setProgressEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [homeSections, setHomeSections] = useState(DEFAULT_SECTIONS);
  const [featureFlags, setFeatureFlags] = useState({});
  const [shadowEmails, setShadowEmails] = useState(new Set());

  useEffect(() => {
    // Chargement initial
    loadData();

    if (profile?.zoneTag) {
      base44.entities.ZoneConfig.filter({ zoneTag: profile.zoneTag, is_active: true }, "-created_date", 1)
        .then(configs => {
          const cfg = configs[0];
          if (cfg?.home_sections?.length) setHomeSections(cfg.home_sections);
          if (cfg?.feature_flags) setFeatureFlags(cfg.feature_flags);
        }).catch(() => {});
    }

    // Rechargement automatique quand l'utilisateur revient sur l'onglet
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadData(); // recharge avec cache (qui sera invalide si CreateAnnouncement a été visité)
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Subscribe temps réel — nouvelle annonce ou activité → invalide cache + refresh immédiat
    const unsubAnn = base44.entities.MeetupAnnouncement.subscribe(() => {
      cacheInvalidate("home_announcements");
      loadFresh();
    });
    const unsubAct = base44.entities.Activity.subscribe(() => {
      cacheInvalidate("home_activities");
      loadFresh();
    });

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      unsubAnn?.();
      unsubAct?.();
    };
  }, [profile?.zoneTag]);

  useEffect(() => {
    if (user) {
      cachedFetch(
        `progress_${user.email}`,
        () => base44.entities.ProgressEntry.filter({ created_by: user.email }, "-created_date", 30),
        HOME_TTL
      ).then(setProgressEntries).catch(() => {});
    }
  }, [user]);

  // Chargement avec cache (premier chargement)
  const loadData = async () => {
    setLoading(true);
    try {
      const [annsOpen, annsMatched, acts, latestPosts, bannedProfiles] = await Promise.all([
        cachedFetch("home_announcements_open", () =>
          base44.entities.MeetupAnnouncement.filter({ status: "open" }, "-created_date", 8),
          HOME_TTL
        ),
        cachedFetch("home_announcements_matched", () =>
          base44.entities.MeetupAnnouncement.filter({ status: "matched" }, "-created_date", 4),
          HOME_TTL
        ),
        cachedFetch("home_activities", () =>
          base44.entities.Activity.filter({ status: "open" }, "-created_date", 20),
          HOME_TTL
        ),
        cachedFetch("home_posts", () =>
          base44.entities.Post.list("-created_date", 4),
          HOME_TTL
        ),
        cachedFetch("shadow_banned_emails", () =>
          base44.entities.UserProfile.filter({ is_shadow_banned: true }, "-created_date", 200),
          5 * 60 * 1000
        ).catch(() => []),
      ]);
      const anns = [...annsOpen, ...annsMatched].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 10);
      const banned = new Set(bannedProfiles.map(p => p.created_by).filter(Boolean));
      setShadowEmails(banned);
      setAnnouncements(anns.filter(a => !banned.has(a.created_by)));
      setActivities(acts.filter(a => !banned.has(a.created_by)));
      setPosts(latestPosts);
    } catch (e) {
      console.warn("[Home] loadData error:", e?.message);
      // Invalide le cache pour forcer un vrai fetch au prochain chargement
      cacheInvalidate("home_announcements_open");
      cacheInvalidate("home_announcements_matched");
      cacheInvalidate("home_activities");
      cacheInvalidate("home_posts");
      // Tentative de chargement direct sans cache en fallback
      try {
        const [annsOpen, annsMatched, acts] = await Promise.all([
          base44.entities.MeetupAnnouncement.filter({ status: "open" }, "-created_date", 8),
          base44.entities.MeetupAnnouncement.filter({ status: "matched" }, "-created_date", 4),
          base44.entities.Activity.filter({ status: "open" }, "-created_date", 20),
        ]);
        const anns = [...annsOpen, ...annsMatched].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 10);
        setAnnouncements(anns);
        setActivities(acts);
      } catch (_) {}
    } finally {
      setLoading(false);
    }
  };

  // Chargement sans cache — appelé par subscribe et visibilitychange
  // NOTE: on utilise une ref pour currentUserEmail pour éviter le bug de closure stale
  const loadFresh = async () => {
    try {
      const [annsOpen, annsMatched, acts, bannedProfiles] = await Promise.all([
        base44.entities.MeetupAnnouncement.filter({ status: "open" }, "-created_date", 8),
        base44.entities.MeetupAnnouncement.filter({ status: "matched" }, "-created_date", 4),
        base44.entities.Activity.filter({ status: "open" }, "-created_date", 20),
        cachedFetch("shadow_banned_emails", () =>
          base44.entities.UserProfile.filter({ is_shadow_banned: true }, "-created_date", 200),
          5 * 60 * 1000
        ).catch(() => []),
      ]);
      const anns = [...annsOpen, ...annsMatched].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 10);
      const banned = new Set(bannedProfiles.map(p => p.created_by).filter(Boolean));
      setShadowEmails(banned);
      // Pas de filtre sur l'email courant ici — on filtre uniquement les shadow-ban
      // Les propres annonces de l'utilisateur sont toujours visibles (non shadow-ban)
      setAnnouncements(anns.filter(a => !banned.has(a.created_by)));
      setActivities(acts.filter(a => !banned.has(a.created_by)));
    } catch (e) {
      // silent fail
    }
  };

  const displayName = profile?.pseudo || user?.full_name?.split(" ")[0] || "Toi";

  const ff = featureFlags;
  const SECTION_GATED = {
    challenge: ff.show_challenge === false ? null : undefined,
    feed: ff.show_feed === false ? null : undefined,
  };

  const sectionProps = { announcements, activities, posts, progressEntries, loading, profile, user, shadowEmails, onRefresh: loadFresh };
  const sections = homeSections
    .filter(key => SECTION_GATED[key] !== null)
    .map(key => SECTION_MAP(sectionProps)[key])
    .filter(Boolean);

  useEffect(() => {
    const sendWelcomeIfNeeded = async () => {
      if (!user?.email || !profile?.pseudo) return;
      if (user.email === "jotouillez@gmail.com") return;

      try {
        const dogs = await base44.entities.DogProfile.filter(
          { created_by: user.email },
          "-created_date",
          1
        );
        if (dogs.length === 0) return;

        const existingConvs = await base44.entities.Conversation.filter(
          { members: user.email },
          "-created_date",
          50
        );
        const alreadySent = existingConvs.some(
          c => c.members?.includes("jotouillez@gmail.com")
        );
        if (alreadySent) return;

        const conv = await base44.entities.Conversation.create({
          type: "private",
          category: "social",
          members: [user.email, "jotouillez@gmail.com"],
          member_pseudos: [profile.pseudo, "Admin"],
          last_message: "Message de l'équipe Ziga Link 🐾",
          last_message_at: new Date().toISOString(),
          last_message_by: "Admin",
          unread_counts: { [user.email]: 1 }
        });

        // Créer une notification physique pour que l'effacement soit fiable
        await base44.entities.Notification.create({
          user_email: user.email,
          type: "message",
          title: "💬 Message de bienvenue de l'équipe Ziga Link",
          body: "Bienvenue dans la communauté ! Lisez le message de l'équipe 🐾",
          reference_id: conv.id,
          link_page: "GroupChat",
          link_param: `id=${conv.id}`,
          is_read: false,
        });

        await base44.entities.ConversationMessage.create({
          conversation_id: conv.id,
          sender_email: "admin@zigalink.local",
          sender_pseudo: "Admin",
          content: `👋 Bonjour ${profile.pseudo} !\n\nJe suis le créateur de Ziga Link.\n\nMerci de rejoindre l'aventure dès ses premiers pas ! Ce projet est né ici, imaginé par des professionnels et des passionnés du monde canin. En nous rejoignant aujourd'hui, vous ne faites pas que tester une application : vous participez à la naissance d'une communauté canine forte et soudée.\n\nNous avons de grandes ambitions et des projets d'évolutions passionnants déjà en cours. Cette version que vous tenez entre vos mains est une exclusivité locale, encore en phase de test.\n\nVotre rôle est crucial : Comme tout projet qui démarre, vous rencontrerez peut-être quelques petits bugs. Voyez-les comme des opportunités de nous aider ! Vos retours sont l'énergie qui nous permet de corriger et d'améliorer l'application chaque jour.\n\nGrâce à votre soutien et vos partages, nous allons construire ensemble l'outil dont nous, propriétaires de chiens, avons toujours rêvé.\n\nRépondez directement ici pour toute idée ou bug — je vous lis personnellement.\n\nBonne balade avec votre compagnon ! 🐾\nL'équipe Ziga Link`
        });

      } catch (e) {
        console.warn("[WelcomeMsg] non bloquant:", e?.message);
      }
    };

    sendWelcomeIfNeeded();
  }, [user?.email, profile?.pseudo]);

  return (
    <PullToRefresh onRefresh={loadFresh}>
    <div className="pb-28 min-h-screen" style={{ background: "#f5f6f4" }}>
      {featureFlags.show_welcome_hero !== false && <WelcomeSplash />}
      <ExitFeedbackPopup />
      <DailyMatchTrigger userEmail={user?.email} />

      {featureFlags.show_welcome_hero !== false && (
        <HomeHero
          displayName={displayName}
          profile={profile}
          announcementsCount={announcements.length}
          activitiesCount={activities.length}
          userEmail={user?.email}
        />
      )}

      <div className="max-w-2xl mx-auto space-y-6 pt-5">
        {sections}
        <div className="h-2" />
      </div>
    </div>
    </PullToRefresh>
  );
}