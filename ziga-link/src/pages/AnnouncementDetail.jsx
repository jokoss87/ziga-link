import { useState, useEffect, useRef } from "react";
import { useUserProfile } from "@/components/useUserProfile";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { cacheInvalidate } from "@/components/lib/cache";
import { ArrowLeft, PawPrint, MapPin, Calendar, Clock, Send, CheckCircle, XCircle, MessageCircle, Trash2, Share2, Play, Square, Footprints, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import RequestCard from "@/components/announcements/RequestCard";
import AnnouncementMiniMap from "@/components/announcements/AnnouncementMiniMap";
import MeetingPlacePicker from "@/components/announcements/MeetingPlacePicker";
import { invalidateUserLevelCache } from "@/components/lib/userLevelCache";
import { parseUTC } from "@/components/lib/dateUtils";
import StickyFooterAction from "@/components/ui/StickyFooterAction";
import { computeXP, getLevelInfo } from "@/components/badges/BadgeSystem";
import StatusActivityBadge from "@/components/ui/StatusActivityBadge";
import PostWalkSupportCard from "@/components/support/PostWalkSupportCard";
import StartBanner from "@/components/announcements/StartBanner";
import { toast } from "sonner";

export default function AnnouncementDetail() {
  const [searchParams] = useSearchParams();
  const announcementId = searchParams.get("id");
  const startNow = searchParams.get("start") === "1";
  const [startBannerDismissed, setStartBannerDismissed] = useState(false);
  const navigate = useNavigate();

  const { user } = useUserProfile();
  const [announcement, setAnnouncement] = useState(null);
  const [requests, setRequests] = useState([]);
  const [myDogs, setMyDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({ dog_ids: [], message: "" });
  const [userProfile, setUserProfile] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [alreadyRequested, setAlreadyRequested] = useState(false);
  const [hasAcceptedRequest, setHasAcceptedRequest] = useState(false);
  const [myRequest, setMyRequest] = useState(null);
  const [highlightMap, setHighlightMap] = useState(false);
  const mapRef = useRef(null);

  // Walk tracker
  const [walkStatus, setWalkStatus] = useState("idle");
  const [walkSteps, setWalkSteps] = useState(0);
  const [walkElapsed, setWalkElapsed] = useState(0);
  const [walkSaved, setWalkSaved] = useState(false);
  const [showPostWalkSupport, setShowPostWalkSupport] = useState(false);
  const [showXPCelebration, setShowXPCelebration] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [newLevelInfo, setNewLevelInfo] = useState(null);
  const walkTimerRef = useRef(null);
  const walkStartRef = useRef(null);
  const motionListenerRef = useRef(null);
  const stepCooldownRef = useRef(false);
  const lastAccelRef = useRef({ x: 0, y: 0, z: 0 });

  const STEP_LENGTH_M = 0.75;

  useEffect(() => {
    return () => {
      if (walkTimerRef.current) clearInterval(walkTimerRef.current);
      if (motionListenerRef.current) window.removeEventListener("devicemotion", motionListenerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!announcementId) { navigate(createPageUrl("Home")); return; }
    loadData();
  }, [announcementId, user?.email]);

  // Auto-scroll vers la carte si scroll=map dans l'URL
  useEffect(() => {
    const scrollTo = searchParams.get("scroll");
    if (scrollTo !== "map" || !mapRef.current) return;
    const timer = setTimeout(() => {
      mapRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightMap(true);
      setTimeout(() => setHighlightMap(false), 2500);
    }, 600);
    return () => clearTimeout(timer);
  }, [loading, searchParams]);

  // Subscribe temps réel sur l'annonce pour synchroniser la balade + alerter si supprimée
  useEffect(() => {
    if (!announcementId) return;
    const unsub = base44.entities.MeetupAnnouncement.subscribe((event) => {
      if (event.id !== announcementId && event.data?.id !== announcementId) return;

      if (event.type === "delete") {
        // L'organisateur a supprimé l'annonce — alerter les participants
        toast.error("⚠️ L'organisateur a annulé cette rencontre.", { duration: 6000 });
        setTimeout(() => navigate(createPageUrl("Home")), 3000);
        return;
      }
      if (event.type !== "update") return;

      const data = event.data;
      setAnnouncement(prev => (prev ? { ...prev, ...data } : data));

      if (data.walk_started_at && !data.walk_ended_at) {
        setWalkStatus(prev => {
          if (prev === "idle") {
            const ref = new Date(data.walk_started_at).getTime();
            walkStartRef.current = ref;
            if (walkTimerRef.current) clearInterval(walkTimerRef.current);
            walkTimerRef.current = setInterval(() => {
              setWalkElapsed(Math.floor((Date.now() - ref) / 1000));
            }, 1000);
            return "running";
          }
          return prev;
        });
      }

      if (data.walk_ended_at) {
        setWalkStatus(prev => {
          if (prev === "running") {
            if (walkTimerRef.current) clearInterval(walkTimerRef.current);
            if (motionListenerRef.current) window.removeEventListener("devicemotion", motionListenerRef.current);
            return "done";
          }
          return prev;
        });
      }
    });
    return unsub;
  }, [announcementId]);

  // Subscribe temps réel sur les demandes
  useEffect(() => {
    if (!announcementId) return;
    const unsub = base44.entities.MeetupRequest.subscribe((event) => {
      if (event.data?.announcement_id !== announcementId) return;
      if (event.type === "create") {
        setRequests(prev => [event.data, ...prev.filter(r => r.id !== event.id)]);
      } else if (event.type === "update") {
        setRequests(prev => prev.map(r => r.id === event.id ? event.data : r));
        if (user && event.data?.created_by === user.email) {
          const newStatus = event.data.status;
          setHasAcceptedRequest(newStatus === "accepted");
          setMyRequest(event.data);
          if (newStatus === "accepted") {
            toast.success("🎉 Votre demande a été acceptée !");
            // Recharger l'annonce pour avoir conversation_id et meeting_place_* à jour
            base44.entities.MeetupAnnouncement.filter({ id: announcementId }).then(ann => {
              if (ann[0]) setAnnouncement(ann[0]);
            }).catch(() => {});
          } else if (newStatus === "declined") {
            toast.error("❌ Votre demande a été refusée.");
          }
        }
      } else if (event.type === "delete") {
        setRequests(prev => prev.filter(r => r.id !== event.id));
      }
    });
    return unsub;
  }, [announcementId, user?.email]);

  const loadData = async () => {
    setLoading(true);
    try {
      const ann = await base44.entities.MeetupAnnouncement.filter({ id: announcementId });
    if (ann.length === 0) {
      setLoading(false);
      setWalkStatus(prev => {
        if (prev === "running" || prev === "done") return prev;
        navigate(createPageUrl("Home"));
        return prev;
      });
      return;
    }
    const a = ann[0];
    setAnnouncement(a);
    setIsOwner(user?.email === a.created_by);

    const reqs = await base44.entities.MeetupRequest.filter({ announcement_id: announcementId }, "-created_date");
    setRequests(reqs);

    if (user) {
      const myDogsData = await base44.entities.DogProfile.filter({ created_by: user.email });
      setMyDogs(myDogsData);
      const myProfiles = await base44.entities.UserProfile.filter({ created_by: user.email });
      setUserProfile(myProfiles[0] || null);
      const alreadyReq = reqs.find((r) => r.created_by === user.email);
      setAlreadyRequested(!!alreadyReq);
      setMyRequest(alreadyReq || null);
      const acceptedReq = reqs.find((r) => r.created_by === user.email && r.status === "accepted");
      setHasAcceptedRequest(!!acceptedReq);
    }
      if (a.walk_started_at && !a.walk_ended_at) {
        const ref = new Date(a.walk_started_at).getTime();
        walkStartRef.current = ref;
        if (walkTimerRef.current) clearInterval(walkTimerRef.current);
        walkTimerRef.current = setInterval(() => {
          setWalkElapsed(Math.floor((Date.now() - ref) / 1000));
        }, 1000);
        setWalkStatus("running");
      }

      if (a.walk_ended_at) {
        if (walkTimerRef.current) clearInterval(walkTimerRef.current);
        setWalkStatus("done");
      }
    } catch (e) {
      console.warn("[AnnouncementDetail] loadData error:", e?.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleDog = (dogId) => {
    setRequestForm(f => ({
      ...f,
      dog_ids: f.dog_ids.includes(dogId)
        ? f.dog_ids.filter(id => id !== dogId)
        : [...f.dog_ids, dogId]
    }));
  };

  const handleSendRequest = async () => {
    if (requestForm.dog_ids.length === 0) return;
    setSending(true);
    const selectedDogs = myDogs.filter(d => requestForm.dog_ids.includes(d.id));
    const dogNames = selectedDogs.map(d => d.name).join(", ");
    await base44.entities.MeetupRequest.create({
      announcement_id: announcementId,
      requester_dog_id: requestForm.dog_ids[0],
      requester_dog_name: dogNames,
      requester_dog_photo: selectedDogs[0]?.photo_url || "",
      requester_name: userProfile?.pseudo || user?.email || "",
      requester_photo: userProfile?.photo_url || "",
      message: requestForm.message,
      status: "pending",
    });
    if (announcement.created_by && announcement.created_by !== user.email) {
      await base44.entities.Notification.create({
        user_email: announcement.created_by,
        type: "walk_request",
        title: `🐾 Nouvelle demande de balade !`,
        body: `${userProfile?.pseudo || "Quelqu'un"} avec ${dogNames} veut rejoindre "${announcement.title}"`,
        reference_id: announcementId,
        link_page: "AnnouncementDetail",
        link_param: `id=${announcementId}`,
        is_read: false,
      });
    }
    setSending(false);
    setShowRequestForm(false);
    setAlreadyRequested(true);
    // Rafraîchir uniquement les demandes sans recharger toute la page
    const updatedReqs = await base44.entities.MeetupRequest.filter({ announcement_id: announcementId }, "-created_date");
    setRequests(updatedReqs);
    const alreadyReq = updatedReqs.find(r => r.created_by === user.email);
    setMyRequest(alreadyReq || null);
  };

  const handleAccept = async (requestId) => {
    const req = requests.find(r => r.id === requestId);
    if (!req) return;
    await base44.entities.MeetupRequest.update(requestId, { status: "accepted" });

    let conversationId = announcement.conversation_id;
    if (!conversationId) {
      const existingConvs = await base44.entities.Conversation.filter({
        type: "group",
        reference_id: announcementId
      });

      if (existingConvs.length > 0) {
        conversationId = existingConvs[0].id;
      } else {
        const reqUserProfile = await base44.entities.UserProfile.filter({ created_by: req.created_by });
        const reqPseudo = reqUserProfile[0]?.pseudo || req.requester_name || req.created_by;
        const reqPhoto = reqUserProfile[0]?.photo_url || "";

        const newConv = await base44.entities.Conversation.create({
          type: "group",
          reference_id: announcementId,
          name: announcement.title,
          category: "balade",
          members: [user.email, req.created_by],
          member_pseudos: [userProfile?.pseudo || user?.email || "", reqPseudo],
          member_photos: [userProfile?.photo_url || "", reqPhoto],
        });
        conversationId = newConv.id;
      }

await base44.entities.MeetupAnnouncement.update(announcementId, {
        status: "matched",
        conversation_id: conversationId,
        meeting_place_lat: announcement.meeting_place_lat || announcement.latitude,
        meeting_place_lng: announcement.meeting_place_lng || announcement.longitude,
        meeting_place_name: announcement.meeting_place_name || announcement.city,
      });
    } else {
      const conv = await base44.entities.Conversation.filter({ id: conversationId });
      if (conv.length > 0 && !conv[0].members.includes(req.created_by)) {
        const reqUserProfile = await base44.entities.UserProfile.filter({ created_by: req.created_by });
        const reqPseudo = reqUserProfile[0]?.pseudo || req.requester_name || req.created_by;
        const reqPhoto = reqUserProfile[0]?.photo_url || "";

        await base44.entities.Conversation.update(conversationId, {
          members: [...(conv[0].members || []), req.created_by],
          member_pseudos: [...(conv[0].member_pseudos || []), reqPseudo],
          member_photos: [...(conv[0].member_photos || []), reqPhoto],
        });
      }
await base44.entities.MeetupAnnouncement.update(announcementId, {
        status: "matched",
        meeting_place_lat: announcement.meeting_place_lat || announcement.latitude,
        meeting_place_lng: announcement.meeting_place_lng || announcement.longitude,
        meeting_place_name: announcement.meeting_place_name || announcement.city,
      });
    }

    if (req?.created_by) {
      await base44.entities.Notification.create({
        user_email: req.created_by,
        type: "walk_accepted",
        title: `✅ Demande acceptée !`,
        body: `Votre demande pour "${announcement.title}" a été acceptée ! Voir le lieu de rendez-vous 📍`,
        reference_id: announcementId,
        link_page: "AnnouncementDetail",
        link_param: `id=${announcementId}&scroll=map`,
        is_read: false,
      });
    }
    // Mise à jour locale sans recharger toute la page
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: "accepted" } : r));
    setAnnouncement(prev => prev ? { ...prev, status: "matched", conversation_id: conversationId } : prev);
  };

  const handleDecline = async (requestId) => {
    const req = requests.find(r => r.id === requestId);
    await base44.entities.MeetupRequest.update(requestId, { status: "declined" });
    if (req?.created_by) {
      await base44.entities.Notification.create({
        user_email: req.created_by,
        type: "walk_declined",
        title: `❌ Demande refusée`,
        body: `Votre demande pour "${announcement.title}" a été refusée.`,
        reference_id: announcementId,
        link_page: "AnnouncementDetail",
        link_param: `id=${announcementId}`,
        is_read: false,
      });
    }
    // Mise à jour locale sans recharger toute la page
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: "declined" } : r));
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer cette annonce définitivement ?")) return;
    const acceptedReqs = requests.filter(r => r.status === "accepted");
    await Promise.all(
      acceptedReqs.map(r =>
        base44.entities.Notification.create({
          user_email: r.created_by,
          type: "activity_cancelled",
          title: "❌ Balade annulée",
          body: `La balade "${announcement?.title || "cette balade"}" a été annulée par l'organisateur.`,
          is_read: false,
        }).catch(() => {})
      )
    );
    await Promise.all(requests.map(r => base44.entities.MeetupRequest.delete(r.id)));
    await base44.entities.MeetupAnnouncement.delete(announcementId);
    cacheInvalidate("home_announcements");
    cacheInvalidate("home_activities");
    navigate(createPageUrl("Home"));
  };

  const isAdmin = user?.role === "admin";

  const requestMotionPermission = async () => {
    if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
      const perm = await DeviceMotionEvent.requestPermission();
      if (perm !== "granted") return false;
    }
    return true;
  };

  const startWalkLocal = (startTimestamp) => {
    const ref = startTimestamp || Date.now();
    walkStartRef.current = ref;
    if (walkTimerRef.current) clearInterval(walkTimerRef.current);
    walkTimerRef.current = setInterval(() => {
      setWalkElapsed(Math.floor((Date.now() - ref) / 1000));
    }, 1000);
    const handler = (event) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;
      const { x, y, z } = acc;
      const prev = lastAccelRef.current;
      const delta = Math.abs(x - prev.x) + Math.abs(y - prev.y) + Math.abs(z - prev.z);
      lastAccelRef.current = { x, y, z };
      if (delta > 12 && !stepCooldownRef.current) {
        setWalkSteps(s => s + 1);
        stepCooldownRef.current = true;
        setTimeout(() => { stepCooldownRef.current = false; }, 350);
      }
    };
    motionListenerRef.current = handler;
    window.addEventListener("devicemotion", handler);
    setWalkStatus("running");
  };

  const startWalk = async () => {
    const ok = await requestMotionPermission();
    if (!ok) return;
    setWalkSteps(0);
    setWalkElapsed(0);
    setWalkSaved(false);
    const now = new Date().toISOString();
    await base44.entities.MeetupAnnouncement.update(announcementId, { walk_started_at: now, walk_ended_at: null });
    startWalkLocal(new Date(now).getTime());
  };

  const stopWalk = async () => {
    if (walkTimerRef.current) clearInterval(walkTimerRef.current);
    if (motionListenerRef.current) window.removeEventListener("devicemotion", motionListenerRef.current);
    await base44.entities.MeetupAnnouncement.update(announcementId, { walk_ended_at: new Date().toISOString() });
    setWalkStatus("done");
  };

  const continuWalk = () => {
    const ref = Date.now();
    walkStartRef.current = ref;
    if (walkTimerRef.current) clearInterval(walkTimerRef.current);
    walkTimerRef.current = setInterval(() => {
      setWalkElapsed(prev => prev + 1);
    }, 1000);
    const handler = (event) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;
      const { x, y, z } = acc;
      const prev = lastAccelRef.current;
      const delta = Math.abs(x - prev.x) + Math.abs(y - prev.y) + Math.abs(z - prev.z);
      lastAccelRef.current = { x, y, z };
      if (delta > 12 && !stepCooldownRef.current) {
        setWalkSteps(s => s + 1);
        stepCooldownRef.current = true;
        setTimeout(() => { stepCooldownRef.current = false; }, 350);
      }
    };
    motionListenerRef.current = handler;
    window.addEventListener("devicemotion", handler);
    setWalkStatus("running");
  };

  const saveWalk = async () => {
    if (!user) return;

    const snapAnnouncement = { ...announcement };
    const snapAnnouncementId = announcementId;

    let liveRequests = requests;
    try {
      liveRequests = await base44.entities.MeetupRequest.filter({ announcement_id: snapAnnouncementId }, "-created_date", 50);
    } catch (_) {}
    const acceptedRequests = liveRequests.filter(r => r.status === "accepted");

    const distM = walkSteps * STEP_LENGTH_M;
    const distLabel = distM >= 1000 ? `${(distM / 1000).toFixed(2)} km` : `${Math.round(distM)} m`;
    const mins = Math.max(1, Math.round(walkElapsed / 60));
    const h = Math.floor(walkElapsed / 3600);
    const m = Math.floor((walkElapsed % 3600) / 60);
    const s = walkElapsed % 60;
    const timeLabel = h > 0 ? `${h}h ${m.toString().padStart(2,"0")}m` : `${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;

    const [prevSessions, prevDogs, prevAnnouncements, prevActivities] = await Promise.all([
      base44.entities.ProgressEntry.filter({ created_by: user.email }, "-created_date", 200),
      base44.entities.DogProfile.filter({ created_by: user.email }),
      base44.entities.MeetupAnnouncement.filter({ created_by: user.email }),
      base44.entities.Activity.filter({ created_by: user.email }),
    ]);
    const prevMeetups = prevAnnouncements.filter(a => a.status === "completed").length;
    const statsAvant = {
      sessions: prevSessions.length,
      totalMinutes: prevSessions.reduce((acc, e) => acc + (e.duration_minutes || 0), 0),
      sessionTypes: new Set(prevSessions.map(e => e.session_type)).size,
      meetups: prevMeetups,
      dogs: prevDogs.length,
      activitiesOrganized: prevActivities.length,
      activitiesJoined: 0,
      profileComplete: !!(userProfile?.pseudo && userProfile?.city && userProfile?.experience_level),
    };
    const statsApres = { ...statsAvant, sessions: statsAvant.sessions + 1, totalMinutes: statsAvant.totalMinutes + mins, meetups: prevMeetups + 1 };
    const xpAvant = computeXP(statsAvant);
    const xpApres = computeXP(statsApres);
    const delta = xpApres - xpAvant;
    const lvlAvant = getLevelInfo(xpAvant);
    const lvlApres = getLevelInfo(xpApres);
    const leveledUp = lvlApres.level > lvlAvant.level ? lvlApres : null;

    await base44.functions.invoke("saveWalkEntry", {
      announcementId: snapAnnouncementId,
      userEmail: user.email,
      durationMinutes: mins,
      steps: walkSteps,
      distanceLabel: distLabel,
      timeLabel,
      dogId: snapAnnouncement.dog_id || "",
      dogName: snapAnnouncement.dog_name || "",
      announcementTitle: snapAnnouncement.title || "",
      participantsCount: acceptedRequests.length + 1,
    });

    const isOrganizer = user.email === snapAnnouncement.created_by;
    if (isOrganizer) {
      await Promise.all(
        acceptedRequests
          .filter(r => r.created_by && r.created_by !== user.email)
          .map(r =>
            base44.functions.invoke("saveWalkEntry", {
              announcementId: snapAnnouncementId,
              userEmail: r.created_by,
              durationMinutes: mins,
              steps: walkSteps,
              distanceLabel: distLabel,
              timeLabel,
              dogId: r.requester_dog_id || "",
              dogName: r.requester_dog_name || "",
              announcementTitle: snapAnnouncement.title || "",
              participantsCount: acceptedRequests.length + 1,
            }).catch(() => {})
          )
      );
    }

    invalidateUserLevelCache(user?.email);
    setEarnedXP(delta > 0 ? delta : 0);
    setNewLevelInfo(leveledUp);
    if (leveledUp) {
      await base44.entities.Notification.create({
        user_email: user.email,
        type: "level_up",
        title: `🏆 Niveau supérieur atteint !`,
        body: `Tu es maintenant ${leveledUp.emoji} ${leveledUp.label}. Continue comme ça !`,
       link_page: "Badges",
        is_read: false,
      });
    }

// Notifications de notation différées
const ratingNotifs = [];
const organizerEmail = snapAnnouncement.created_by;
const organizerDogName = snapAnnouncement.dog_name || "";
const organizerDogId = snapAnnouncement.dog_id || "";
const organizerName = snapAnnouncement.owner_name || organizerEmail;

if (isOrganizer) {
  // L'organisateur envoie une notif de notation à chaque participant
  for (const r of acceptedRequests) {
    if (!r.created_by) continue;
    const participantEmail = r.created_by;
    const participantDogName = r.requester_dog_name || "";
    const participantDogId = r.requester_dog_id || "";
    const participantName = r.requester_name || participantEmail;

    // Organisateur évalue le participant
    ratingNotifs.push(
      base44.entities.Notification.create({
        user_email: organizerEmail,
        type: "encounter_rating",
        title: "🌟 Comment s'est passée la balade ?",
        body: `Prenez 30 secondes pour évaluer ${participantName} — ça aide la communauté 🐾`,
        reference_id: snapAnnouncementId,
        link_page: "EncounterRatingPage",
        link_param: `announcement_id=${snapAnnouncementId}&to_email=${encodeURIComponent(participantEmail)}&dog_name=${encodeURIComponent(participantDogName)}&dog_id=${encodeURIComponent(participantDogId)}`,
        is_read: false,
      }).catch(() => {})
    );

    // Participant évalue l'organisateur
    ratingNotifs.push(
      base44.entities.Notification.create({
        user_email: participantEmail,
        type: "encounter_rating",
        title: "🌟 Comment s'est passée la balade ?",
        body: `Prenez 30 secondes pour évaluer ${organizerName} — ça aide la communauté 🐾`,
        reference_id: snapAnnouncementId,
        link_page: "EncounterRatingPage",
        link_param: `announcement_id=${snapAnnouncementId}&to_email=${encodeURIComponent(organizerEmail)}&dog_name=${encodeURIComponent(organizerDogName)}&dog_id=${encodeURIComponent(organizerDogId)}`,
        is_read: false,
      }).catch(() => {})
    );
  }
} else {
  // Le participant envoie directement sa notif à l'organisateur
  // (les demandes peuvent être vides si l'organisateur a déjà sauvegardé)
  const myRequest = liveRequests.find(r => r.created_by === user.email) ||
    requests.find(r => r.created_by === user.email);
  const myDogName = myRequest?.requester_dog_name || "";
  const myDogId = myRequest?.requester_dog_id || "";
  const myName = myRequest?.requester_name || userProfile?.pseudo || user.email;

  // Organisateur évalue le participant (si pas déjà envoyé)
  ratingNotifs.push(
    base44.entities.Notification.create({
      user_email: organizerEmail,
      type: "encounter_rating",
      title: "🌟 Comment s'est passée la balade ?",
      body: `Prenez 30 secondes pour évaluer ${myName} — ça aide la communauté 🐾`,
      reference_id: snapAnnouncementId,
      link_page: "EncounterRatingPage",
      link_param: `announcement_id=${snapAnnouncementId}&to_email=${encodeURIComponent(user.email)}&dog_name=${encodeURIComponent(myDogName)}&dog_id=${encodeURIComponent(myDogId)}`,
      is_read: false,
    }).catch(() => {})
  );

  // Participant évalue l'organisateur
  ratingNotifs.push(
    base44.entities.Notification.create({
      user_email: user.email,
      type: "encounter_rating",
      title: "🌟 Comment s'est passée la balade ?",
      body: `Prenez 30 secondes pour évaluer ${organizerName} — ça aide la communauté 🐾`,
      reference_id: snapAnnouncementId,
      link_page: "EncounterRatingPage",
      link_param: `announcement_id=${snapAnnouncementId}&to_email=${encodeURIComponent(organizerEmail)}&dog_name=${encodeURIComponent(organizerDogName)}&dog_id=${encodeURIComponent(organizerDogId)}`,
      is_read: false,
    }).catch(() => {})
  );
}
await Promise.all(ratingNotifs);

    await Promise.all(liveRequests.map(r => base44.entities.MeetupRequest.delete(r.id).catch(() => {})));
    await base44.entities.MeetupAnnouncement.delete(snapAnnouncementId).catch(() => {});

    setWalkSaved(true);
    setShowXPCelebration(true);
    // CORRECTION : plus de setTimeout navigate — la navigation se fait via onClose du PostWalkSupportCard
    setShowPostWalkSupport(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  if (!announcement) return null;

  const showStartBanner = startNow && !startBannerDismissed && !walkSaved && walkStatus === "idle" && (isOwner || hasAcceptedRequest);

  return (
    <div className="min-h-screen bg-amber-50">
      {showStartBanner && (
        <StartBanner
          title={announcement?.title || ""}
          label="Démarrer la balade maintenant"
          onStart={startWalk}
          onDismiss={() => setStartBannerDismissed(true)}
        />
      )}
      <div className="bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 px-6 py-8 text-white">
        <div className="max-w-xl mx-auto">
          <Link to={createPageUrl("Home")} className="flex items-center gap-2 text-amber-100 hover:text-white mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">{announcement.title}</h1>
              <p className="text-amber-100 mt-1 flex items-center gap-1.5">
                <PawPrint className="w-4 h-4" /> {announcement.dog_name} · {announcement.owner_name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusActivityBadge status={announcement.status} />
              <button
                onClick={() => {
                  const url = window.location.href;
                  if (navigator.share) {
                    navigator.share({ title: announcement.title, text: `Rencontre chien : ${announcement.title}`, url });
                  } else {
                    navigator.clipboard.writeText(url);
                    alert("Lien copié !");
                  }
                }}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
                title="Partager l'annonce"
              >
                <Share2 className="w-4 h-4 text-white" />
              </button>
              {isOwner && (
                <Link
                  to={`${createPageUrl("EditAnnouncement")}?id=${announcementId}`}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
                  title="Modifier l'annonce"
                >
                  <Pencil className="w-4 h-4 text-white" />
                </Link>
              )}
              {(isOwner || isAdmin) && (
                <button
                  onClick={handleDelete}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-red-500 flex items-center justify-center transition-colors"
                  title="Supprimer l'annonce"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
        {/* Walk tracker */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-amber-100">
          <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
            <Footprints className="w-5 h-5" /> Suivi de balade
          </h3>
          {walkStatus !== "idle" && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center bg-teal-50 rounded-xl py-2">
                <div className="text-xl font-black text-teal-600">{walkSteps.toLocaleString()}</div>
                <div className="text-xs text-stone-400">Pas</div>
              </div>
              <div className="text-center bg-emerald-50 rounded-xl py-2">
                <div className="text-xl font-black text-emerald-600">
                  {walkSteps * STEP_LENGTH_M >= 1000
                    ? `${((walkSteps * STEP_LENGTH_M) / 1000).toFixed(2)}km`
                    : `${Math.round(walkSteps * STEP_LENGTH_M)}m`}
                </div>
                <div className="text-xs text-stone-400">Distance</div>
              </div>
              <div className="text-center bg-purple-50 rounded-xl py-2">
                <div className="text-xl font-black text-purple-600">
                  {Math.floor(walkElapsed / 60).toString().padStart(2,"0")}:{(walkElapsed % 60).toString().padStart(2,"0")}
                </div>
                <div className="text-xs text-stone-400">Durée</div>
              </div>
            </div>
          )}
          {walkStatus === "idle" && (
            isOwner || hasAcceptedRequest ? (
              <button onClick={startWalk} className="w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 text-sm" style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}>
                <Play className="w-4 h-4" /><span>Démarrer la balade</span>
              </button>
            ) : (
              <div className="w-full py-3 rounded-xl text-center text-sm font-medium text-stone-400 bg-stone-100">
                🔒 Réservé au créateur et aux participants acceptés
              </div>
            )
          )}
          {walkStatus === "running" && (
            <div className="flex items-center gap-2 justify-center text-teal-600 text-sm font-semibold">
              <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" /> Balade en cours...
            </div>
          )}
          {walkStatus === "done" && (
            <div className="text-center text-amber-700 text-sm font-semibold bg-amber-50 rounded-xl py-2">🎉 Balade terminée !</div>
          )}
        </div>

        {/* XP Celebration */}
        {showXPCelebration && (
          <div className={`rounded-2xl p-5 shadow-md text-white text-center ${newLevelInfo ? "bg-gradient-to-r from-purple-500 to-amber-500" : "bg-gradient-to-r from-amber-400 to-orange-400"}`}>
            <div className="text-3xl mb-1">{newLevelInfo ? "🏆" : "🎉"}</div>
            {newLevelInfo ? (
              <>
                <div className="text-lg font-black">Niveau supérieur atteint !</div>
                <div className="text-3xl font-black mt-1">{newLevelInfo.emoji} {newLevelInfo.label}</div>
                {earnedXP > 0 && <div className="text-xl font-bold mt-1 opacity-90">+{earnedXP} XP</div>}
                <div className="text-sm text-purple-100 mt-2">Tu progresses dans la communauté Ziga Link 🐾</div>
              </>
            ) : (
              <>
                <div className="text-lg font-black">Rencontre réussie !</div>
                {earnedXP > 0 && <div className="text-2xl font-black mt-1">+{earnedXP} XP</div>}
                <div className="text-sm text-amber-100 mt-1">Ta meute gagne en expérience. Niveau recalculé ! 🏆</div>
              </>
            )}
            <button onClick={() => setShowXPCelebration(false)} className="mt-3 text-xs text-white/70 underline">Fermer</button>
          </div>
        )}

        {/* Mini carte */}
        <div ref={mapRef} className={`rounded-2xl transition-all duration-500 ${highlightMap ? "ring-4 ring-amber-400 ring-offset-2 shadow-lg shadow-amber-200" : ""}`}>
          <AnnouncementMiniMap
            announcement={announcement}
            isOwner={isOwner}
            hasAcceptedRequest={hasAcceptedRequest}
          />
        </div>

        {/* Details */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-amber-100 space-y-3">
          {announcement.description && <p className="text-amber-900">{announcement.description}</p>}
          <div className="flex flex-wrap gap-4 text-sm text-amber-700">
            {announcement.date && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {parseUTC(announcement.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </span>
            )}
            {announcement.time && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> {announcement.time}
              </span>
            )}
            {announcement.city && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> {announcement.city}
              </span>
            )}
          </div>
        </div>

        {/* Request form */}
        {!isOwner && (announcement.status === "open" || announcement.status === "matched") && user && !alreadyRequested && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-amber-100">
            {!showRequestForm ? (
              <Button onClick={() => setShowRequestForm(true)} className="w-full bg-amber-400 hover:bg-amber-500 text-white">
                <span className="flex items-center gap-2 justify-center"><PawPrint className="w-4 h-4" /> Proposer une rencontre</span>
              </Button>
            ) : (
              <div className="space-y-3">
                <h3 className="font-semibold text-amber-900">Proposer une rencontre</h3>
                <div>
                  <p className="text-xs text-stone-500 mb-2">Sélectionnez votre/vos chien(s) :</p>
                  <div className="flex flex-col gap-2">
                    {myDogs.map((d) => {
                      const selected = requestForm.dog_ids.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleDog(d.id)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${selected ? "border-amber-400 bg-amber-50" : "border-stone-200 bg-white hover:border-amber-200"}`}
                        >
                          {d.photo_url
                            ? <img src={d.photo_url} alt={d.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                            : <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-lg flex-shrink-0">🐕</div>
                          }
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-stone-800 text-sm">{d.name}</p>
                            {d.breed && <p className="text-xs text-stone-400 truncate">{d.breed}</p>}
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? "border-amber-400 bg-amber-400" : "border-stone-300"}`}>
                            {selected && <span className="text-white text-xs font-bold">✓</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Textarea
                  value={requestForm.message}
                  onChange={(e) => setRequestForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Présentez vos chiens, dites bonjour ! 🐶"
                  className="border-amber-200"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button onClick={handleSendRequest} disabled={sending || requestForm.dog_ids.length === 0} className="bg-amber-400 hover:bg-amber-500 text-white flex-1">
                    <span className="flex items-center gap-2 justify-center"><Send className="w-4 h-4" /> {sending ? "Envoi..." : "Envoyer"}</span>
                  </Button>
                  <Button variant="outline" onClick={() => setShowRequestForm(false)} className="border-amber-200">Annuler</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Boutons walk sticky */}
        {walkStatus === "running" && (
          <StickyFooterAction>
            <button onClick={stopWalk} className="w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 text-sm bg-red-500 hover:bg-red-600">
              <Square className="w-4 h-4" /><span>Fin de la balade</span>
            </button>
          </StickyFooterAction>
        )}

        {walkStatus === "done" && !walkSaved && (
          <StickyFooterAction>
            <button onClick={saveWalk} className="w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 text-sm" style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}>
              <span>💾 Sauvegarder dans le carnet</span>
            </button>
            {announcement?.walk_ended_at && (
              <button onClick={continuWalk} className="w-full text-amber-600 text-xs font-semibold py-2 text-center block">
                Continuer la balade 🐾
              </button>
            )}
          </StickyFooterAction>
        )}

        {/* CORRECTION : PostWalkSupportCard navigue vers Home à la fermeture */}
        {showPostWalkSupport && (
          <PostWalkSupportCard onClose={() => {
            setShowPostWalkSupport(false);
            navigate(createPageUrl("Home"));
          }} />
        )}

        {walkStatus === "done" && walkSaved && (
          <StickyFooterAction>
            <div className="flex items-center justify-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl py-3 text-sm font-semibold">
              <CheckCircle className="w-4 h-4" /> Sauvegardé !
            </div>
          </StickyFooterAction>
        )}

        {alreadyRequested && !isOwner && (
          <div className="bg-green-50 rounded-2xl p-4 border border-green-200 text-green-700 text-sm font-medium flex items-center gap-2">
            <CheckCircle className="w-5 h-5" /> Votre demande a bien été envoyée !
          </div>
        )}



        {announcement.conversation_id && (isOwner || hasAcceptedRequest) && (
          <Link
            to={`${createPageUrl("GroupChat")}?id=${announcement.conversation_id}`}
            className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border-2 border-teal-200 hover:border-teal-400 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}>
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-stone-800 text-sm">Groupe de balade 🐾</p>
              <p className="text-xs text-stone-400">Ouvrir la conversation du groupe</p>
            </div>
            <div className="text-teal-500 font-bold text-xs">Rejoindre →</div>
          </Link>
        )}

        {isOwner && (
          <div>
            <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" /> Demandes reçues ({requests.length})
            </h3>
            {requests.length === 0 ? (
              <p className="text-amber-500 text-sm text-center py-6">Aucune demande pour l'instant</p>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <RequestCard
                    key={req.id}
                    request={req}
                    announcement={announcement}
                    onAccept={() => handleAccept(req.id)}
                    onDecline={() => handleDecline(req.id)}
                    onRefresh={loadData}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}