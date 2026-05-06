import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { usePseudoCache } from "@/components/lib/PseudoCacheContext";
import { useActivityConfig } from "@/components/lib/useActivityConfig";
import { cacheInvalidate } from "@/components/lib/cache";
import { parseUTC } from "@/components/lib/dateUtils";
import { CAT, getCategoryFromType } from "@/components/lib/categoryColors";
// SPORT/OBEISSANCE types gérés via getCategoryFromType (centralisé dans activityTypeConstants)
import {
  ArrowLeft, Calendar, Clock, MapPin, Users, Trophy,
  FlagTriangleRight, Trash2, MessageCircle, Send, CheckCircle,
  Check, UserCircle, Play, Square, Timer, Navigation
} from "lucide-react";
import MeetingPlacePicker from "@/components/announcements/MeetingPlacePicker";
import ActivityMiniMap from "@/components/activities/ActivityMiniMap";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import StatusActivityBadge from "@/components/ui/StatusActivityBadge";
import { invalidateUserLevelCache } from "@/components/lib/userLevelCache";
import { computeXP, getLevelInfo } from "@/components/badges/BadgeSystem";
import StickyFooterAction from "@/components/ui/StickyFooterAction";
import PostWalkSupportCard from "@/components/support/PostWalkSupportCard";
import StartBanner from "@/components/announcements/StartBanner";
import { toast } from "sonner";

const LEVEL_LABEL = { all: "Tous niveaux", beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé" };

// CORRECTION : convertit le type d'activité en session_type pour le journal de vie
function getSessionType(activityType) {
  const map = {
    canicross: "sport", cani_vtt: "sport", randonnee: "sport",
    agility: "sport", frisbee: "sport", traction: "sport",
    parkour: "sport", pistage: "sport", concours: "sport",
    mantrailing: "sport", dog_dancing: "sport", autre_sport: "sport",
    obeissance: "obeissance", shaping: "obeissance",
    socialisation: "socialisation",
    marche_laisse: "obeissance", gestion_emotions: "obeissance", renoncement: "obeissance",
    nosework: "obeissance", concours_dressage: "obeissance", autre_dressage: "obeissance",
    libre: "jeu", jeu: "jeu",
  };
  return map[activityType] || "autre";
}

export default function ActivityDetail() {
  const [searchParams] = useSearchParams();
  const activityId = searchParams.get("id");
  const startNow = searchParams.get("start") === "1";
  const navigate = useNavigate();
  const { user } = useUserProfile();
  const [startBannerDismissed, setStartBannerDismissed] = useState(false);
  const { resolvePseudos } = usePseudoCache();
  const { getLabel, getImage, getEmoji } = useActivityConfig();

  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [myDogs, setMyDogs] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [organizerProfile, setOrganizerProfile] = useState(null);
  const [organizerDogs, setOrganizerDogs] = useState([]);
  const [resolvedPseudo, setResolvedPseudo] = useState(null);

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedDogIds, setSelectedDogIds] = useState([]);
  const [message, setMessage] = useState("");

  const toggleDog = (dogId) => {
    setSelectedDogIds(prev =>
      prev.includes(dogId) ? prev.filter(id => id !== dogId) : [...prev, dogId]
    );
  };
  const [sending, setSending] = useState(false);
  const [alreadyRequested, setAlreadyRequested] = useState(false);
  const [myRequest, setMyRequest] = useState(null);

  const [showPostWalkSupport, setShowPostWalkSupport] = useState(false);
  const [showSavedSuccess, setShowSavedSuccess] = useState(false);
  const [timerStatus, setTimerStatus] = useState("idle");
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const startRef = useRef(null);
  const [showPlacePicker, setShowPlacePicker] = useState(false);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Subscribe temps réel sur MeetupRequest — le participant voit son acceptation instantanément
  useEffect(() => {
    if (!activityId || !user?.email) return;
    const unsub = base44.entities.MeetupRequest.subscribe((event) => {
      if (event.data?.announcement_id !== activityId) return;
      if (event.type !== "update") return;
      const updatedReq = event.data;
      // Mettre à jour la liste des demandes (pour l'organisateur)
      setRequests(prev => prev.map(r => r.id === updatedReq.id ? { ...r, ...updatedReq } : r));
      // Si c'est MA demande et qu'elle vient d'être acceptée ou refusée
      if (updatedReq.created_by === user.email) {
        if (updatedReq.status === "accepted") {
          setMyRequest(updatedReq);
          setAlreadyRequested(true);
          toast.success("🎉 Votre demande a été acceptée !");
          // Recharger l'activité pour avoir conversation_id et meeting_place_* à jour
          base44.entities.Activity.filter({ id: activityId }).then(acts => {
            if (acts[0]) setActivity(acts[0]);
          }).catch(() => {});
        } else if (updatedReq.status === "declined") {
          setMyRequest(updatedReq);
          toast.error("❌ Votre demande a été refusée.");
        }
      }
    });
    return unsub;
  }, [activityId, user?.email]);

  // Subscribe temps réel sur l'activité (sync timer + lieu + suppression)
  useEffect(() => {
    if (!activityId) return;
    const unsub = base44.entities.Activity.subscribe((event) => {
      if (event.id !== activityId && event.data?.id !== activityId) return;
      // Suppression par l'organisateur → alerter les participants acceptés
      if (event.type === "delete") {
        toast.error("⚠️ L'organisateur a annulé cette activité.", { duration: 6000 });
        setTimeout(() => navigate(createPageUrl("Home")), 3000);
        return;
      }
      if (event.type !== "update") return;
      const data = event.data;
      setActivity(prev => prev ? { ...prev, ...data } : data);

      if (data.activity_started_at && !data.activity_ended_at) {
        setTimerStatus(prev => {
          if (prev === "idle") {
            const ref = new Date(data.activity_started_at).getTime();
            startRef.current = ref;
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
              setElapsed(Math.floor((Date.now() - ref) / 1000));
            }, 1000);
            return "running";
          }
          return prev;
        });
      }

      if (data.activity_ended_at) {
        setTimerStatus(prev => {
          if (timerRef.current) clearInterval(timerRef.current);
          const ref = startRef.current || (data.activity_started_at ? new Date(data.activity_started_at).getTime() : null);
          if (ref) setElapsed(Math.floor((new Date(data.activity_ended_at).getTime() - ref) / 1000));
          return "done";
        });
      }
    });
    return unsub;
  }, [activityId]);

  const startTimerLocal = (refMs) => {
    startRef.current = refMs;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - refMs) / 1000));
    }, 1000);
    setTimerStatus("running");
  };

  const startTimer = async () => {
    const now = new Date().toISOString();
    await base44.entities.Activity.update(activityId, { activity_started_at: now, activity_ended_at: null });
    startTimerLocal(new Date(now).getTime());

    // Notifier tous les participants acceptés
    const acceptedReqs = requests.filter(r => r.status === "accepted");
    await Promise.all(
      acceptedReqs
        .filter(r => r.created_by && r.created_by !== user?.email)
        .map(r =>
          base44.entities.Notification.create({
            user_email: r.created_by,
            type: "activity_started",
            title: "🚀 L'activité a démarré !",
            body: `"${activity?.title}" vient de commencer. Rejoignez le groupe !`,
            reference_id: activityId,
            link_page: "ActivityDetail",
            link_param: `id=${activityId}&start=1`,
            is_read: false,
          }).catch(() => {})
        )
    );
  };

  // Participant arrête son propre chrono localement (sans écrire en BDD)
  const stopTimerLocal = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerStatus("done");
  };

  const stopTimer = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerStatus("done");
    await base44.entities.Activity.update(activityId, { activity_ended_at: new Date().toISOString() });

    // Notifier tous les participants acceptés
    const acceptedReqs = requests.filter(r => r.status === "accepted");
    await Promise.all(
      acceptedReqs
        .filter(r => r.created_by && r.created_by !== user?.email)
        .map(r =>
          base44.entities.Notification.create({
            user_email: r.created_by,
            type: "activity_ended",
            title: "🏁 L'activité est terminée !",
            body: `"${activity?.title}" est terminée. Sauvegardez votre entrée dans le carnet.`,
            reference_id: activityId,
            link_page: "ActivityDetail",
            link_param: `id=${activityId}`,
            is_read: false,
          }).catch(() => {})
        )
    );
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}h ${m.toString().padStart(2,"0")}m`
      : `${m.toString().padStart(2,"0")}:${sec.toString().padStart(2,"0")}`;
  };

  useEffect(() => {
    if (!activityId) { navigate(createPageUrl("Home")); return; }
    loadData();
  }, [activityId, user?.email]);

  const loadData = async () => {
    setLoading(true);
    try {
      const acts = await base44.entities.Activity.filter({ id: activityId });
    if (acts.length === 0) { navigate(createPageUrl("Home")); return; }
    const act = acts[0];
    setActivity(act);

    const reqs = await base44.entities.MeetupRequest.filter({ announcement_id: activityId }, "-created_date");
    setRequests(reqs);

    if (act.created_by) {
      resolvePseudos([act.created_by]).then(map => setResolvedPseudo(map[act.created_by] || null));
      const [orgProfiles, orgDogs] = await Promise.all([
        base44.entities.UserProfile.filter({ created_by: act.created_by }),
        base44.entities.DogProfile.filter({ created_by: act.created_by }),
      ]);
      setOrganizerProfile(orgProfiles[0] || null);
      setOrganizerDogs(orgDogs);
    }

    if (user) {
      const [myDogsData, myProfiles] = await Promise.all([
        base44.entities.DogProfile.filter({ created_by: user.email }),
        base44.entities.UserProfile.filter({ created_by: user.email }),
      ]);
      setMyDogs(myDogsData);
      setUserProfile(myProfiles[0] || null);
      const myReq = reqs.find(r => r.created_by === user.email);
      setAlreadyRequested(!!myReq);
      setMyRequest(myReq || null);
    }

    // Synchronisation timer au chargement
    if (act.activity_started_at && !act.activity_ended_at) {
      const ref = new Date(act.activity_started_at).getTime();
      startTimerLocal(ref);
    } else if (act.activity_ended_at) {
      if (timerRef.current) clearInterval(timerRef.current);
      const ref = act.activity_started_at ? new Date(act.activity_started_at).getTime() : null;
      const endMs = new Date(act.activity_ended_at).getTime();
      if (ref) setElapsed(Math.floor((endMs - ref) / 1000));
      setTimerStatus("done");
    }

    } catch (e) {
      console.warn("[ActivityDetail] loadData error:", e?.message);
    } finally {
      setLoading(false);
    }
  };

const handleSendRequest = async () => {
    if (selectedDogIds.length === 0) return;
    if (activity?.created_by === user?.email) return;
    setSending(true);
    const selectedDogs = myDogs.filter(d => selectedDogIds.includes(d.id));
    const dogNames = selectedDogs.map(d => d.name).join(", ");
    const pseudo = userProfile?.pseudo || user?.full_name || user?.email || "";

    await base44.entities.MeetupRequest.create({
      announcement_id: activityId,
      requester_dog_id: selectedDogIds[0],
      requester_dog_name: dogNames,
      requester_name: pseudo,
      requester_photo: userProfile?.photo_url || "",
      message,
      status: "pending",
      type: "activity",
    });

    if (activity.created_by && activity.created_by !== user.email) {
      await base44.entities.Notification.create({
        user_email: activity.created_by,
        type: "activity_join",
        title: `🏅 Nouvelle demande pour votre activité !`,
        body: `${pseudo} avec ${dogNames} veut rejoindre "${activity.title}"`,
        reference_id: activityId,
        link_page: "ActivityDetail",
        link_param: `id=${activityId}`,
        is_read: false,
      });
    }

    setSending(false);
    setShowRequestForm(false);
    setAlreadyRequested(true);
    const newReq = { announcement_id: activityId, requester_dog_id: selectedDogIds[0], requester_dog_name: dogNames, requester_name: pseudo, requester_photo: userProfile?.photo_url || "", message, status: "pending" };
    setMyRequest(newReq);
    // Rafraîchir uniquement les demandes
    const updatedReqs = await base44.entities.MeetupRequest.filter({ announcement_id: activityId }, "-created_date");
    setRequests(updatedReqs);
    const myReq = updatedReqs.find(r => r.created_by === user.email);
    if (myReq) setMyRequest(myReq);
  };

  const handleAcceptRequest = async (requestId) => {
    const req = requests.find(r => r.id === requestId);
    await base44.entities.MeetupRequest.update(requestId, { status: "accepted" });

    const participants = activity.participants || [];
    // Copier latitude/longitude vers meeting_place si pas encore défini
    await base44.entities.Activity.update(activityId, {
      participants: [...participants, req.created_by],
      meeting_place_lat: activity.meeting_place_lat || activity.latitude,
      meeting_place_lng: activity.meeting_place_lng || activity.longitude,
      meeting_place_name: activity.meeting_place_name || activity.city,
    });
    setActivity(prev => ({
      ...prev,
      meeting_place_lat: prev.meeting_place_lat || prev.latitude,
      meeting_place_lng: prev.meeting_place_lng || prev.longitude,
      meeting_place_name: prev.meeting_place_name || prev.city,
    }));

    // Anti-duplication : recharger l'activité FRAÎCHE pour avoir le dernier conversation_id
    // (évite la race condition si 2 acceptations quasi-simultanées)
    const freshActivities = await base44.entities.Activity.filter({ id: activityId });
    const freshActivity = freshActivities[0] || activity;
    let conversationId = freshActivity.conversation_id;

    if (!conversationId) {
      // Double vérification via reference_id — source de vérité absolue
      const existingConvs = await base44.entities.Conversation.filter({ type: "group", reference_id: activityId });
      if (existingConvs.length > 0) {
        conversationId = existingConvs[0].id;
        // Synchroniser conversation_id sur l'activité si manquant
        await base44.entities.Activity.update(activityId, { conversation_id: conversationId });
      }
    }

    if (conversationId) {
      const convs = await base44.entities.Conversation.filter({ id: conversationId });
      const conv = convs[0];
      if (conv && !conv.members.includes(req.created_by)) {
        const reqProfile = await base44.entities.UserProfile.filter({ created_by: req.created_by });
        await base44.entities.Conversation.update(conversationId, {
          members: [...conv.members, req.created_by],
          member_pseudos: [...(conv.member_pseudos || []), reqProfile[0]?.pseudo || req.requester_name],
          member_photos: [...(conv.member_photos || []), reqProfile[0]?.photo_url || ""],
        });
      }
    } else {
      // Création unique : d'abord on met à jour l'activité avec un flag temporaire,
      // puis on crée la conversation — évite les créations parallèles
      const reqProfile = await base44.entities.UserProfile.filter({ created_by: req.created_by });
      const newConv = await base44.entities.Conversation.create({
        type: "group",
        reference_id: activityId,
        name: activity.title,
        category: getCategoryFromType(activity.type),
        members: [user.email, req.created_by],
        member_pseudos: [resolvedPseudo || activity.organizer_name || user.email, reqProfile[0]?.pseudo || req.requester_name],
        member_photos: [activity.organizer_photo || organizerProfile?.photo_url || "", reqProfile[0]?.photo_url || ""],
      });
      conversationId = newConv.id;
      await base44.entities.Activity.update(activityId, { conversation_id: conversationId });
    }

    if (req?.created_by) {
      await base44.entities.Notification.create({
        user_email: req.created_by,
        type: "activity_join",
        title: `✅ Demande acceptée !`,
        body: `Votre demande pour "${activity.title}" a été acceptée !`,
        reference_id: activityId,
        link_page: "ActivityDetail",
        link_param: `id=${activityId}`,
        is_read: false,
      });
    }

    // Mise à jour locale sans recharger
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: "accepted" } : r));
    setActivity(prev => prev ? { ...prev, participants: [...(prev.participants || []), req.created_by], conversation_id: conversationId } : prev);
  };

  const handleDeclineRequest = async (requestId) => {
    const req = requests.find(r => r.id === requestId);
    await base44.entities.MeetupRequest.update(requestId, { status: "declined" });
    if (req?.created_by) {
      await base44.entities.Notification.create({
        user_email: req.created_by,
        type: "activity_join",
        title: `❌ Demande refusée`,
        body: `Votre demande pour "${activity.title}" a été refusée.`,
        reference_id: activityId,
        link_page: "ActivityDetail",
        link_param: `id=${activityId}`,
        is_read: false,
      });
    }
    // Mise à jour locale sans recharger
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: "declined" } : r));
  };

  const handleFinish = async () => {
    if (!confirm("Terminer cette activité ? Une entrée sera ajoutée dans votre journal.")) return;

    // Vérifier idempotence : déjà sauvegardé ?
    const alreadyEnded = (activity?.participants_ended || []).includes(user?.email);
    if (alreadyEnded) {
      alert("Vous avez déjà sauvegardé cette activité dans votre carnet.");
      return;
    }

    // isOrganizer recalculé localement car handleFinish est défini avant le render
    const isOrganizerLocal = !!(user && activity?.created_by === user.email);

    const mins = timerStatus === "done" && elapsed > 0
      ? Math.max(1, Math.round(elapsed / 60))
      : (activity.duration_minutes || 60);
    const sessionType = getSessionType(activity.type);

    // Chaque participant crée uniquement SA propre ProgressEntry
    if (isOrganizerLocal) {
      // Organisateur : utilise son premier chien si dog_ids est vide
      const dogIdToUse = activity.dog_ids?.[0] || myDogs[0]?.id || "";
      const dogNameToUse = activity.dog_names?.[0] || myDogs[0]?.name || "";
      await base44.entities.ProgressEntry.create({
        dog_id: dogIdToUse,
        dog_name: dogNameToUse,
        session_type: sessionType,
        title: `Activité terminée — ${activity.title}`,
        notes: `Type : ${activity.type} | Ville : ${activity.city || "?"}`,
        duration_minutes: mins,
        owner_email: user.email,
      });
    } else {
      // Participant : crée uniquement sa propre entrée
      const myDog = myDogs[0];
      await base44.entities.ProgressEntry.create({
        dog_id: myRequest?.requester_dog_id || myDog?.id || "",
        dog_name: myRequest?.requester_dog_name || myDog?.name || "",
        session_type: sessionType,
        title: `Activité — ${activity.title}`,
        notes: `Type : ${activity.type} | Organisateur : ${activity.organizer_name || ""}`,
        duration_minutes: mins,
        owner_email: user.email,
      });
    }

    // Calcul XP et notification level_up
    try {
      const [prevSessions, prevDogs, prevAnnouncements, prevActivities] = await Promise.all([
        base44.entities.ProgressEntry.filter({ created_by: user.email }, "-created_date", 200).catch(() => []),
        base44.entities.DogProfile.filter({ created_by: user.email }).catch(() => []),
        base44.entities.MeetupAnnouncement.filter({ created_by: user.email }).catch(() => []),
        base44.entities.Activity.filter({ created_by: user.email }).catch(() => []),
      ]);

      const makeStats = (sessions) => ({
        sessions: sessions.length,
        totalMinutes: sessions.reduce((s, e) => s + (e.duration_minutes || 0), 0),
        sessionTypes: new Set(sessions.map(e => e.session_type)).size,
        meetups: prevAnnouncements.filter(a => a.status === "completed").length,
        dogs: prevDogs.length,
        activitiesOrganized: prevActivities.length,
        activitiesJoined: 0,
        profileComplete: !!(userProfile?.pseudo && userProfile?.city),
        balades: sessions.filter(s => s.session_type === "balade").length,
        sportSessions: sessions.filter(s => s.session_type === "sport").length,
        obedienceSessions: sessions.filter(s => s.session_type === "obeissance").length,
        friends: 0,
        dailyChallenges: 0,
        paymentCount: 0,
        totalPaid: 0,
        isMonthlySupport: false,
      });

      const statsAvant = makeStats(prevSessions.slice(1));
      const statsApres = makeStats(prevSessions);
      const xpAvant = computeXP(statsAvant);
      const xpApres = computeXP(statsApres);
      const lvlAvant = getLevelInfo(xpAvant);
      const lvlApres = getLevelInfo(xpApres);
      const leveledUp = lvlApres.level > lvlAvant.level ? lvlApres : null;

      if (leveledUp) {
        await base44.entities.Notification.create({
          user_email: user.email,
          type: "level_up",
          title: "🏆 Niveau supérieur atteint !",
          body: `Tu es maintenant ${leveledUp.emoji} ${leveledUp.label}. Continue comme ça !`,
          link_page: "Badges",
          is_read: false,
        }).catch(() => {});
      }
    } catch (e) {
      console.warn("[handleFinish] XP calc error:", e?.message);
    }

    // Seul l'organisateur supprime l'activité et les demandes
    if (isOrganizerLocal) {
      await Promise.all(requests.map(r => base44.entities.MeetupRequest.delete(r.id).catch(() => {})));
      try {
        await base44.entities.Activity.delete(activityId);
      } catch (e) {
        // Déjà supprimée ou introuvable — on continue quand même
        console.warn("[handleFinish] Activity already deleted or not found:", e?.message);
      }
    }

    // Marquer cet utilisateur comme ayant sauvegardé (idempotence)
    const ended = activity?.participants_ended || [];
    if (!ended.includes(user.email)) {
      await base44.entities.Activity.update(activityId, {
        participants_ended: [...ended, user.email],
      }).catch(() => {});
      setActivity(prev => prev ? { ...prev, participants_ended: [...ended, user.email] } : prev);
    }

    invalidateUserLevelCache(user?.email);
    cacheInvalidate("home_announcements");
    cacheInvalidate("home_activities");

    if (isOrganizerLocal) {
      setShowPostWalkSupport(true);
    } else {
      // Participant : écran de succès puis retour accueil
      setShowSavedSuccess(true);
      setTimeout(() => navigate(createPageUrl("Home")), 2500);
    }
  };

  const handlePlaceSelected = async (place) => {
    setShowPlacePicker(false);
    await base44.entities.Activity.update(activityId, {
      meeting_place_name: place.name,
      meeting_place_lat: place.lat,
      meeting_place_lng: place.lng,
    });
    setActivity(prev => ({ ...prev, meeting_place_name: place.name, meeting_place_lat: place.lat, meeting_place_lng: place.lng }));

    // Notifier les participants acceptés
    const accepted = requests.filter(r => r.status === "accepted" && r.created_by && r.created_by !== user?.email);
    await Promise.all(accepted.map(r =>
      base44.entities.Notification.create({
        user_email: r.created_by,
        type: "place_updated",
        title: "📍 Lieu de rendez-vous mis à jour",
        body: `Le lieu de rendez-vous pour "${activity.title}" est : ${place.name}`,
        reference_id: activityId,
        link_page: "ActivityDetail",
        link_param: `id=${activityId}`,
        is_read: false,
      })
    ));
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer cette activité définitivement ?")) return;
    const acceptedReqs = requests.filter(r => r.status === "accepted");
    await Promise.all(
      acceptedReqs.map(r =>
        base44.entities.Notification.create({
          user_email: r.created_by,
          type: "activity_cancelled",
          title: "❌ Activité annulée",
          body: `L'activité "${activity?.title || "cette activité"}" a été annulée par l'organisateur.`,
          is_read: false,
        }).catch(() => {})
      )
    );
    await Promise.all(requests.map(r => base44.entities.MeetupRequest.delete(r.id).catch(() => {})));
    try { await base44.entities.Activity.delete(activityId); } catch (e) { console.warn("[handleDelete]", e?.message); }
    invalidateUserLevelCache(user?.email);
    cacheInvalidate("home_announcements");
    cacheInvalidate("home_activities");
    navigate(createPageUrl("Home"));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-400 border-t-transparent" />
      </div>
    );
  }

  if (!activity) return null;

  const cat = CAT[getCategoryFromType(activity.type)] || CAT.sport;
  const participants = activity.participants || [];
  const effectiveMax = activity.max_participants || 5;
  const isFull = participants.length >= effectiveMax;
  const isOrganizer = user && activity.created_by === user.email;
  const isJoined = user && participants.includes(user.email);
  const isParticipant = isOrganizer || (myRequest?.status === "accepted");
  const organizerDisplay = resolvedPseudo || activity.organizer_name || "Organisateur";
  const pendingRequests = requests.filter(r => r.status === "pending");
  const acceptedRequests = requests.filter(r => r.status === "accepted");

  const statusColors = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    accepted: "bg-green-100 text-green-700 border-green-200",
    declined: "bg-red-100 text-red-600 border-red-200",
  };
  const statusLabels = { pending: "⏳ En attente", accepted: "✅ Acceptée", declined: "❌ Refusée" };

  const showStartBanner = startNow && !startBannerDismissed && timerStatus === "idle" && (isOrganizer || (myRequest?.status === "accepted"));

  return (
    <div className="min-h-screen bg-stone-50 pb-28">
      {showStartBanner && activity && (
        <StartBanner
          title={activity.title}
          label="Démarrer l'activité maintenant"
          onStart={startTimer}
          onDismiss={() => setStartBannerDismissed(true)}
        />
      )}
      {showPostWalkSupport && (
        <PostWalkSupportCard onClose={() => {
          setShowPostWalkSupport(false);
          navigate(createPageUrl("ActivitesSport"));
        }} />
      )}
      {showSavedSuccess && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center gap-6 px-8">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-5xl animate-bounce">
            📓
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black text-stone-800 mb-2">Activité enregistrée !</h2>
            <p className="text-stone-500 text-sm">L'activité a bien été ajoutée dans votre journal de vie.</p>
          </div>
          <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
            <CheckCircle className="w-4 h-4" /> Retour à l'accueil...
          </div>
        </div>
      )}
      {/* Header */}
      <div className="px-5 pt-6 pb-8 text-white" style={{ background: cat.gradient }}>
        <div className="max-w-xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden">
              {getImage(activity.type)
                ? <img src={getImage(activity.type)} alt="" className="w-full h-full object-cover rounded-2xl" />
                : <span>{getEmoji(activity.type)}</span>
              }
            </div>
            <div className="flex-1">
              <p className="text-white/70 text-xs font-semibold uppercase tracking-wide mb-1">{getLabel(activity.type)}</p>
              <h1 className="text-xl font-bold leading-tight">{activity.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <StatusActivityBadge status={activity.status} />
                <span className="text-white/70 text-xs">{LEVEL_LABEL[activity.level_required] || "Tous niveaux"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 -mt-4 space-y-4">
        {/* Profil organisateur */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4">
          <p className="text-xs text-stone-400 font-semibold uppercase tracking-wide mb-3">Organisateur</p>
          <div className="flex items-center gap-3">
            {organizerProfile?.photo_url ? (
              <img src={organizerProfile.photo_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-stone-100" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center">
                <UserCircle className="w-7 h-7 text-stone-400" />
              </div>
            )}
            <div>
              <p className="font-bold text-stone-800">@{organizerDisplay}</p>
              {organizerProfile?.city && <p className="text-xs text-stone-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{organizerProfile.city}</p>}
            </div>
          </div>
          {organizerDogs.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-stone-50">
              {organizerDogs.map(dog => (
                <div key={dog.id} className="flex items-center gap-1.5 bg-stone-50 rounded-full px-3 py-1">
                  {dog.photo_url
                    ? <img src={dog.photo_url} alt={dog.name} className="w-5 h-5 rounded-full object-cover" />
                    : <span className="text-sm">🐕</span>
                  }
                  <span className="text-xs font-medium text-stone-700">{dog.name}</span>
                  <span className="text-xs text-stone-400">{dog.breed || ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Carte de localisation — même expérience que la balade */}
        <ActivityMiniMap
          activity={activity}
          isOrganizer={isOrganizer}
          isParticipant={isParticipant}
        />

        {/* Organisateur — affiner le lieu de rendez-vous */}
        {isOrganizer && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 px-4 py-3 -mt-2">
            <button
              onClick={() => setShowPlacePicker(true)}
              className="w-full py-2 rounded-xl border border-dashed border-stone-300 text-stone-500 text-sm hover:bg-stone-50 transition-colors"
            >
              📍 {activity.meeting_place_name ? "Modifier le lieu de rendez-vous" : "Affiner le lieu de rendez-vous"}
            </button>
          </div>
        )}

        {showPlacePicker && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
            <div className="bg-white w-full rounded-t-3xl p-4 max-h-[90vh] overflow-y-auto pb-28">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-stone-800">📍 Lieu de rendez-vous</h3>
                <button onClick={() => setShowPlacePicker(false)} className="text-stone-400 text-sm">✕</button>
              </div>
              <MeetingPlacePicker
                onSelect={handlePlaceSelected}
                onCancel={() => setShowPlacePicker(false)}
              />
            </div>
          </div>
        )}

        {/* Chronomètre */}
        {isParticipant && activity.status !== "completed" && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4">
            <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
              <Timer className="w-5 h-5" /> Suivi de l'activité
            </h3>
            {timerStatus !== "idle" && (
              <div className="text-center bg-stone-50 rounded-xl py-3 mb-3">
                <div className="text-3xl font-black text-stone-800">{formatTime(elapsed)}</div>
                {timerStatus === "running" && (
                  <div className="flex items-center justify-center gap-1.5 mt-1 text-xs text-emerald-600 font-semibold">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> En cours...
                  </div>
                )}
                {timerStatus === "done" && (
                  <div className="text-xs text-stone-500 mt-1">Durée enregistrée : {formatTime(elapsed)}</div>
                )}
              </div>
            )}
            {timerStatus === "idle" && (
              <button
                onClick={startTimer}
                className="w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 text-sm"
                style={{ background: cat.gradient }}
              >
                <Play className="w-4 h-4" /> Démarrer l'activité
              </button>
            )}
          </div>
        )}

        {/* Infos activité */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4 space-y-3">
          {activity.description && (
            <p className="text-stone-700 text-sm leading-relaxed">{activity.description}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-stone-600">
            {activity.date && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-stone-400" />
                {parseUTC(activity.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </span>
            )}
            {activity.time && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-stone-400" /> {activity.time}
              </span>
            )}
            {activity.city && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-stone-400" /> {activity.city}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-stone-400" />
              {participants.length}/{effectiveMax} participants
            </span>
          </div>
        </div>

        {/* Participants confirmés */}
        {acceptedRequests.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4">
            <p className="text-xs text-stone-400 font-semibold uppercase tracking-wide mb-3">Participants confirmés</p>
            <div className="space-y-2">
              {acceptedRequests.map(req => (
                <div key={req.id} className="flex items-center gap-3">
                  {req.requester_photo ? (
                    <img src={req.requester_photo} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm">🐾</div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-800">@{req.requester_name}</p>
                    {req.requester_dog_name && <p className="text-xs text-stone-400">avec {req.requester_dog_name}</p>}
                  </div>
                  {(activity?.participants_ended || []).includes(req.created_by)
                    ? <span className="text-xs text-emerald-600 font-semibold ml-auto">✓ Sauvegardé</span>
                    : <Check className="w-4 h-4 text-green-500 ml-auto" />
                  }
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mon statut si déjà demandé */}
        {alreadyRequested && myRequest && !isOrganizer && (
          <div className={`rounded-2xl p-4 border ${statusColors[myRequest.status] || statusColors.pending} text-sm font-semibold flex items-center gap-2`}>
            {statusLabels[myRequest.status] || "⏳ En attente"}
            {myRequest.status === "accepted" && activity?.conversation_id && (
              <Link
                to={`${createPageUrl("GroupChat")}?id=${activity.conversation_id}`}
                className="ml-auto underline text-xs"
              >
                Ouvrir le groupe →
              </Link>
            )}
          </div>
        )}



        {/* Formulaire de demande */}
        {!isOrganizer && !isJoined && !alreadyRequested && activity.status === "open" && !isFull && user && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4">
            {!showRequestForm ? (
              <Button
                onClick={() => setShowRequestForm(true)}
                className="w-full text-white font-bold rounded-xl"
                style={{ background: cat.gradient }}
              >
                <Trophy className="w-4 h-4 mr-2" /> Rejoindre cette activité
              </Button>
            ) : (
              <div className="space-y-3">
                <h3 className="font-semibold text-stone-800">Rejoindre l'activité</h3>
                {myDogs.length === 0 ? (
                  <p className="text-sm text-stone-500">Vous devez avoir au moins un chien enregistré pour rejoindre une activité.</p>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-stone-500 mb-2">Sélectionnez votre/vos chien(s) :</p>
                      <div className="flex flex-col gap-2">
                        {myDogs.map(d => {
                          const selected = selectedDogIds.includes(d.id);
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => toggleDog(d.id)}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${selected ? "border-purple-400 bg-purple-50" : "border-stone-200 bg-white hover:border-purple-200"}`}
                            >
                              {d.photo_url
                                ? <img src={d.photo_url} alt={d.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                                : <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-lg flex-shrink-0">🐕</div>
                              }
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-stone-800 text-sm">{d.name}</p>
                                {d.breed && <p className="text-xs text-stone-400 truncate">{d.breed}</p>}
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? "border-purple-400 bg-purple-400" : "border-stone-300"}`}>
                                {selected && <span className="text-white text-xs font-bold">✓</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <Textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Présentez vos chiens, vos attentes... (optionnel)"
                      className="border-stone-200"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSendRequest}
                        disabled={sending || selectedDogIds.length === 0}
                        className="flex-1 text-white rounded-xl"
                        style={{ background: cat.gradient }}
                      >
                        <Send className="w-4 h-4 mr-2" /> {sending ? "Envoi..." : "Envoyer la demande"}
                      </Button>
                      <Button variant="outline" onClick={() => setShowRequestForm(false)} className="border-stone-200">
                        Annuler
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {isFull && !isOrganizer && !isJoined && (
          <div className="bg-stone-100 rounded-2xl p-4 text-center text-stone-500 text-sm font-medium">
            Cette activité est complète.
          </div>
        )}

        {isJoined && !isOrganizer && (
          <div className="bg-green-50 rounded-2xl p-4 border border-green-200 text-green-700 text-sm font-semibold flex items-center gap-2">
            <CheckCircle className="w-5 h-5" /> Vous participez à cette activité !
          </div>
        )}

        {/* Boutons sticky chrono — même logique que balade */}
        {timerStatus === "running" && isParticipant && (
          <StickyFooterAction>
            <button
              onClick={isOrganizer ? stopTimer : stopTimerLocal}
              className="w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 text-sm bg-red-500 hover:bg-red-600"
            >
              <Square className="w-4 h-4" /> Terminer l'activité
            </button>
          </StickyFooterAction>
        )}
        {timerStatus === "done" && isParticipant && (
          <StickyFooterAction>
            {(activity?.participants_ended || []).includes(user?.email) ? (
              <div className="w-full py-3 rounded-xl bg-stone-100 text-stone-400 font-bold flex items-center justify-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Déjà sauvegardé ✓
              </div>
            ) : (
              <button
                onClick={handleFinish}
                className="w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 text-sm bg-emerald-500 hover:bg-emerald-600"
              >
                <CheckCircle className="w-4 h-4" /> 💾 Sauvegarder dans mon carnet
              </button>
            )}
            <button
              onClick={() => { startTimerLocal(Date.now()); }}
              className="w-full text-stone-400 text-xs underline py-2 text-center block"
            >
              Continuer l'activité 🐾
            </button>
          </StickyFooterAction>
        )}


        {/* Groupe de discussion — visible pour organisateur ET participants acceptés */}
        {(isOrganizer || isParticipant) && (
          activity.conversation_id ? (
            <Link
              to={`${createPageUrl("GroupChat")}?id=${activity.conversation_id}`}
              className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border-2 hover:opacity-90 transition-opacity"
              style={{ borderColor: cat.hex }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cat.gradient }}>
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-stone-800 text-sm">Groupe {getLabel(activity.type)} 🐾</p>
                <p className="text-xs text-stone-400">Ouvrir la conversation du groupe</p>
              </div>
              <div className="font-bold text-xs" style={{ color: cat.hex }}>Rejoindre →</div>
            </Link>
          ) : (
            <button
              onClick={async () => {
                const category = getCategoryFromType(activity.type);
                const allMembers = [user.email, ...acceptedRequests.map(r => r.created_by).filter(Boolean)];
                const uniqueMembers = [...new Set(allMembers)];
                const profiles = await Promise.all(
                  uniqueMembers.map(email => base44.entities.UserProfile.filter({ created_by: email }).then(r => r[0] || null))
                );
                const pseudos = uniqueMembers.map((email, i) => profiles[i]?.pseudo || email);
                const photos = uniqueMembers.map((email, i) => profiles[i]?.photo_url || "");
                const newConv = await base44.entities.Conversation.create({
                  type: "group",
                  reference_id: activityId,
                  name: activity.title,
                  category,
                  members: uniqueMembers,
                  member_pseudos: pseudos,
                  member_photos: photos,
                });
                await base44.entities.Activity.update(activityId, { conversation_id: newConv.id });
                setActivity(prev => ({ ...prev, conversation_id: newConv.id }));
              }}
              className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border-2 border-dashed hover:opacity-90 transition-opacity w-full text-left"
              style={{ borderColor: cat.hex }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cat.gradient }}>
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-stone-800 text-sm">Créer le groupe de discussion 🐾</p>
                <p className="text-xs text-stone-400">Démarrer une conversation avec les participants</p>
              </div>
              <div className="font-bold text-xs" style={{ color: cat.hex }}>Créer →</div>
            </button>
          )
        )}

        {/* Section organisateur : demandes */}
        {isOrganizer && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-800 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" /> Demandes reçues
                {pendingRequests.length > 0 && (
                  <span className="bg-amber-500 text-white text-xs font-bold rounded-full px-2 py-0.5">{pendingRequests.length}</span>
                )}
              </h3>
            </div>

            {requests.length === 0 ? (
              <div className="bg-white rounded-2xl p-5 text-center text-stone-400 text-sm border border-stone-100">
                Aucune demande pour l'instant
              </div>
            ) : (
              requests.map(req => (
                <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {req.requester_photo ? (
                      <img src={req.requester_photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-lg">🐾</div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-stone-800">@{req.requester_name}</p>
                      {req.requester_dog_name && <p className="text-xs text-stone-500">avec {req.requester_dog_name}</p>}
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${statusColors[req.status] || statusColors.pending}`}>
                      {req.status === "pending" ? "En attente" : req.status === "accepted" ? "Accepté" : "Refusé"}
                    </span>
                  </div>
                  {req.message && (
                    <p className="text-sm text-stone-600 bg-stone-50 rounded-xl p-3 mb-3 italic">"{req.message}"</p>
                  )}
                  {req.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAcceptRequest(req.id)}
                        size="sm"
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Accepter
                      </Button>
                      <Button
                        onClick={() => handleDeclineRequest(req.id)}
                        size="sm"
                        variant="outline"
                        className="flex-1 border-red-200 text-red-500 hover:bg-red-50 rounded-xl"
                      >
                        Refuser
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={handleDelete}
                variant="outline"
                className="w-full rounded-xl border-red-200 text-red-500 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Supprimer l'activité
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}