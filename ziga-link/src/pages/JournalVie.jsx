import { useState, useEffect, useMemo, useRef } from "react";
import { useAsync } from "@/hooks/useAsync";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, ChevronLeft, ChevronRight, X, Target, Map } from "lucide-react";
import QuickLogModal from "@/components/journal/QuickLogModal";
import ShareActivityModal from "@/components/journal/ShareActivityModal";
import WalkRouteGallery from "@/components/journal/WalkRouteGallery";
import ProgressCard from "@/components/carnet/ProgressCard";
import UpcomingEventsSection from "@/components/journal/UpcomingEventsSection";
// PageSwitchBanner supprimé — les deux pages sont fusionnées ici
import DailyChallenge from "@/components/obedience/DailyChallenge";
import UserJournal from "@/components/obedience/UserJournal";
import { computeProgress } from "@/components/obedience/obedienceCatalog";
import {
  format, isToday, isYesterday,
  isSameDay, isSameMonth, addDays, subDays, startOfWeek } from
"date-fns";
import { fr } from "date-fns/locale";
import { parseUTC } from "@/components/lib/dateUtils";

const TYPE_CONFIG = {
  balade: { label: "Balade", emoji: "🐾", color: "#14b8a6", dotColor: "#14b8a6" }, // teal comme CAT.balade
  obeissance: { label: "Entraînement", emoji: "🎯", color: "#8b5cf6", dotColor: "#8b5cf6" }, // violet comme CAT.obeissance
  randonnee: { label: "Sport", emoji: "🏅", color: "#f97316", dotColor: "#f97316" }, // regroupé sport
  sport: { label: "Sport", emoji: "🏅", color: "#f97316", dotColor: "#f97316" }, // orange comme CAT.sport
  jeu: { label: "Jeu", emoji: "🎾", color: "#eab308", dotColor: "#eab308" },
  soin: { label: "Soin", emoji: "💊", color: "#ec4899", dotColor: "#ec4899" },
  socialisation: { label: "Rencontre", emoji: "🐕", color: "#8b5cf6", dotColor: "#8b5cf6" }, // violet comme obeissance
  autre: { label: "Activité", emoji: "📝", color: "#a8a29e", dotColor: "#a8a29e" }
};

const ACTIVITY_TYPE_LABELS = {
  canicross: "Canicross", cani_vtt: "Cani-VTT", randonnee: "Randonnée",
  agility: "Agility", frisbee: "Frisbee", traction: "Traction",
  parkour: "Parkour", pistage: "Pistage", obeissance: "Obéissance",
  socialisation: "Socialisation", shaping: "Shaping", concours: "Concours",
  libre: "Libre", autre: "Autre"
};

const BADGES_CARNET = [
{ id: "first_session", label: "Première séance", emoji: "🌟", condition: (e) => e.length >= 1 },
{ id: "consistent", label: "Régulier", emoji: "🔥", condition: (e) => e.length >= 3 },
{ id: "5_sessions", label: "5 séances", emoji: "🏅", condition: (e) => e.length >= 5 },
{ id: "10_sessions", label: "10 séances", emoji: "🥇", condition: (e) => e.length >= 10 },
{ id: "variety", label: "Polyvalent", emoji: "🎯", condition: (e) => new Set(e.map((x) => x.session_type)).size >= 3 }];


const CONSEILS = [
{ name: "Assis", icon: "🐾", niveau: "Débutant", description: "Base de l'obéissance. Le chien s'assoit et maintient la position.", tips: ["Utilisez une friandise au-dessus du museau", "Récompensez immédiatement", "Ajoutez le mot 'Assis' une fois le geste acquis"] },
{ name: "Couché", icon: "😴", niveau: "Débutant", description: "Le chien se couche et reste en position. Exercice de calme.", tips: ["Partez de la position assise", "Guidez la friandise vers le bas", "Récompensez la position basse complète"] },
{ name: "Rappel", icon: "🏃", niveau: "Débutant", description: "Le chien revient immédiatement quand on l'appelle.", tips: ["Ne punissez jamais après un rappel", "Fêtez toujours le retour", "Pratiquez en environnement fermé d'abord"] },
{ name: "Marche en laisse", icon: "🦮", niveau: "Intermédiaire", description: "Le chien marche sans tirer.", tips: ["Changez de direction dès qu'il tire", "Récompensez la laisse détendue", "Soyez patient"] },
{ name: "Au pied", icon: "👣", niveau: "Intermédiaire", description: "Marche précise avec contact visuel maintenu.", tips: ["Travaillez en courtes sessions", "Récompensez le contact visuel", "Variez les rythmes"] },
{ name: "Rapport d'objet", icon: "🎾", niveau: "Avancé", description: "Récupère et rapporte proprement un objet.", tips: ["Apprenez d'abord 'prend' et 'donne'", "Ne forcez pas l'objet", "Récompensez chaque étape"] }];


const JOURNAL_FILTERS = [
{ key: "all", label: "Tous" },
{ key: "balade", label: "Balades" },
{ key: "obeissance", label: "Entraînement" },
{ key: "socialisation", label: "Social" }];


// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = parseUTC(dateStr);
    if (isToday(d)) return `Aujourd'hui · ${format(d, "HH:mm")}`;
    if (isYesterday(d)) return `Hier · ${format(d, "HH:mm")}`;
    return format(d, "d MMM · HH:mm", { locale: fr });
  } catch {return "";}
}

// ─── WeekStrip ───────────────────────────────────────────────────────────────
function WeekStrip({ entries, selectedDay, onSelectDay }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
  const touchStartX = useRef(null);

  const handleTouchStart = (e) => {touchStartX.current = e.touches[0].clientX;};
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > 50) setWeekStart((d) => subDays(d, 7));else
    if (delta < -50) setWeekStart((d) => addDays(d, 7));
    touchStartX.current = null;
  };

  const getEntries = (day) =>
  entries.filter((e) => {
    const dateToUse = e.session_date ? parseUTC(e.session_date) : e.created_date ? parseUTC(e.created_date) : null;
    return dateToUse && isSameDay(dateToUse, day);
  });

  return (
    <div
      className="bg-white border-b border-stone-100"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}>
      
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <button onClick={() => setWeekStart((d) => subDays(d, 7))} className="p-1 rounded-full hover:bg-stone-100">
          <ChevronLeft className="w-4 h-4 text-stone-400" />
        </button>
        <span className="text-xs font-bold text-stone-500 capitalize">
          {format(weekStart, "MMMM yyyy", { locale: fr })}
        </span>
        <button onClick={() => setWeekStart((d) => addDays(d, 7))} className="p-1 rounded-full hover:bg-stone-100">
          <ChevronRight className="w-4 h-4 text-stone-400" />
        </button>
      </div>
      <div className="grid grid-cols-7 px-3 pb-3 gap-1">
        {days.map((day, i) => {
          const dayEntries = getEntries(day);
          const today = isToday(day);
          const selected = selectedDay && isSameDay(day, selectedDay);
          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDay(selected ? null : day)}
              className="flex flex-col items-center gap-1">
              
              <span className={`text-[10px] font-semibold ${today ? "text-[#4CAF87]" : "text-stone-400"}`}>
                {DAY_LABELS[i]}
              </span>
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                selected ? "shadow-md" : today ? "border-2 border-[#4CAF87]" : "hover:bg-stone-50"}`
                }
                style={selected ? { backgroundColor: "#4CAF87" } : {}}>
                
                <span className={`text-sm font-bold ${selected ? "text-white" : today ? "text-[#4CAF87]" : "text-stone-800"}`}>
                  {format(day, "d")}
                </span>
              </div>
              <div className="h-1.5 flex items-center justify-center">
                {dayEntries.length > 0 &&
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: selected ? "#4CAF87" : TYPE_CONFIG[dayEntries[0].session_type]?.dotColor || "#a8a29e" }} />

                }
              </div>
            </button>);

        })}
      </div>
    </div>);

}

// ─── EntryCard ────────────────────────────────────────────────────────────────
function EntryCard({ entry, onSelect }) {
  const cfg = TYPE_CONFIG[entry.session_type] || TYPE_CONFIG.autre;
  const moodConfig = {
    excellent: { label: "Réussi", color: "#f59e0b" },
    bien: { label: "Bien", color: "#22c55e" },
    moyen: { label: "Moyen", color: "#f97316" },
    difficile: { label: "Difficile", color: "#ef4444" }
  };
  const mood = entry.mood ? moodConfig[entry.mood] : null;
  const moodEmoji = { excellent: "⭐", bien: "🙂", moyen: "😐", difficile: "😓" };

  return (
    <div
      className="bg-white rounded-2xl shadow-sm mx-4 mb-2.5 overflow-hidden cursor-pointer active:scale-95 transition-all"
      onClick={() => onSelect?.(entry)}>
      
      <div className="flex items-stretch">
        <div className="w-1 flex-shrink-0 rounded-l-2xl" style={{ backgroundColor: cfg.color }} />
        <div className="flex-1 px-3.5 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: cfg.color + "20" }}>
                {cfg.emoji}
              </div>
              <div>
                <p className="text-sm font-bold text-stone-800 leading-tight">{cfg.label}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {entry.duration_minutes > 0 && <span className="text-xs text-stone-400">⏱ {entry.duration_minutes} min</span>}
                  {entry.distance_km > 0 && <span className="text-xs text-stone-400">📍 {entry.distance_km.toFixed(1)} km</span>}
                </div>
              </div>
            </div>
            {entry.route_points?.length > 1 &&
            <a href={`/CarteFullscreen?route=${encodeURIComponent(JSON.stringify(entry.route_points))}`} className="flex-shrink-0 text-[#4CAF87] mt-0.5">
                <Map className="w-4 h-4" />
              </a>
            }
          </div>
          {entry.exercises?.length > 0 &&
          <p className="text-xs text-stone-500 mt-1.5">Exercice : {entry.exercises.join(", ")}</p>
          }
          {!entry.exercises?.length && entry.notes &&
          <p className="text-xs text-stone-400 mt-1.5 line-clamp-2">{entry.notes}</p>
          }
          {mood &&
          <p className="text-xs font-semibold mt-1.5" style={{ color: mood.color }}>
              {moodEmoji[entry.mood]} {mood.label}
            </p>
          }
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-50">
            <span className="text-xs text-stone-400">🐕 {entry.dog_name || "—"}</span>
            <span className="text-[11px] text-stone-300">{formatDate(entry.session_date || entry.created_date)}</span>
          </div>
        </div>
      </div>
      {entry.media_url && <img src={entry.media_url} alt="" className="w-full h-36 object-cover" />}
    </div>);

}

// ─── MonthlyGoalSection ───────────────────────────────────────────────────────
function MonthlyGoalSection({ entries, onSaveGoal, savedGoal }) {
  const [editing, setEditing] = useState(false);
  const [goalValue, setGoalValue] = useState(savedGoal || "");
  const [weekOffset, setWeekOffset] = useState(0); // 0 = semaine courante, -1 = semaine passée, etc.

  const now = new Date();
  const weekStart = addDays(startOfWeek(now, { weekStartsOn: 1 }), weekOffset * 7);
  const weekEnd = addDays(weekStart, 7);
  const isCurrentWeek = weekOffset === 0;
  const weekEntries = entries.filter((e) => {
    const d = e.session_date ? parseUTC(e.session_date) : e.created_date ? parseUTC(e.created_date) : null;
    return d && d >= weekStart && d < weekEnd;
  });
  const balades = weekEntries.filter((e) => e.session_type === "balade").length;
  const trainings = weekEntries.filter((e) => e.session_type === "obeissance").length;
  const totalMin = weekEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0);
  const rencontres = weekEntries.filter((e) => e.session_type === "socialisation").length;
  const totalActivities = weekEntries.length;
  const goal = parseInt(savedGoal) || 0;
  const progress = goal > 0 ? Math.min(100, Math.round(totalActivities / goal * 100)) : 0;
  const totalHours = totalMin >= 60 ?
  `${Math.floor(totalMin / 60)}h${totalMin % 60 > 0 ? String(totalMin % 60).padStart(2, "0") : ""}` :
  `${totalMin}min`;

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setWeekOffset((o) => o - 1)} className="p-1 rounded-full hover:bg-stone-100 transition-colors">
            <ChevronLeft className="w-4 h-4 text-stone-400" />
          </button>
          <div>
            <p className="text-sm font-black text-stone-800">
              {isCurrentWeek ? "Cette semaine" : format(weekStart, "d", { locale: fr }) + "–" + format(addDays(weekStart, 6), "d MMM", { locale: fr })}
            </p>
            {!isCurrentWeek &&
            <p className="text-[10px] text-stone-400">{format(weekStart, "MMMM yyyy", { locale: fr })}</p>
            }
          </div>
          <button
            onClick={() => setWeekOffset((o) => Math.min(0, o + 1))}
            className={`p-1 rounded-full transition-colors ${isCurrentWeek ? "opacity-30 cursor-not-allowed" : "hover:bg-stone-100"}`}
            disabled={isCurrentWeek}>
            
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </button>
        </div>
        <button onClick={() => setEditing((v) => !v)} className="text-xs text-[#4CAF87] font-semibold flex items-center gap-1">
          <Target className="w-3.5 h-3.5" /> Objectif
        </button>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
        <span className="text-sm text-stone-700">🐾 <strong>{balades}</strong> balades</span>
        <span className="text-sm text-stone-700">🎯 <strong>{trainings}</strong> entraînements</span>
        <span className="text-sm text-stone-700">⏱ <strong>{totalHours}</strong></span>
        {rencontres > 0 && <span className="text-sm text-stone-700">🐕 <strong>{rencontres}</strong> rencontres</span>}
      </div>
      {goal > 0 &&
      <div>
          <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden mb-1.5">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: "#4CAF87" }} />
          </div>
          <p className="text-xs text-center text-stone-500 font-semibold">
            <span style={{ color: "#4CAF87" }}>{progress}%</span> de l'objectif
            <span className="text-stone-400 font-normal"> ({totalActivities}/{goal} activités)</span>
          </p>
        </div>
      }
      {editing &&
      <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-2">
          <div className="flex-1">
            <p className="text-xs text-stone-500 mb-1">Objectif hebdomadaire (nombre d'activités)</p>
            <input
            type="number"
            value={goalValue}
            onChange={(e) => setGoalValue(e.target.value)}
            placeholder="Ex: 20"
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
            min="1" max="100" />
          
          </div>
          <button onClick={() => {onSaveGoal(goalValue);setEditing(false);}} className="bg-[#4CAF87] text-white font-bold px-4 py-2 rounded-xl text-sm mt-5">
            OK
          </button>
        </div>
      }
    </div>);

}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function JournalVie() {
  const [activeTab, setActiveTab] = useState("suivi"); // "suivi" | "obeissance"
  const [userProfile, setUserProfile] = useState(null);
  const [dogs, setDogs] = useState([]);
  const [selectedDog, setSelectedDog] = useState(null);
  const [entries, setEntries] = useState([]);
  const [activities, setActivities] = useState([]);
  const [journal, setJournal] = useState(null);
  const [obedienceLoaded, setObedienceLoaded] = useState(false);
  const [obedienceLoading, setObedienceLoading] = useState(false);

  // Suivi tab state
  const [selectedDay, setSelectedDay] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [monthlyGoal, setMonthlyGoal] = useState("");
  const [visibleCount, setVisibleCount] = useState(15);
  const [showRoutes, setShowRoutes] = useState(false);

  // Obéissance tab state
  const [obTab, setObTab] = useState("challenge"); // "challenge" | "carnet" | "conseils"
  const [carnetFilter, setCarnetFilter] = useState("all");

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [showAddType, setShowAddType] = useState(null); // null | "obeissance"
  const [showAddDate, setShowAddDate] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [shareEntry, setShareEntry] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  const { user } = useUserProfile();
  const { status, run } = useAsync();
  const { status: saveStatus, run: runSave } = useAsync();

  // Lire les paramètres URL pour ouvrir directement l'onglet Obéissance (depuis notification)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "challenge") {
      setActiveTab("obeissance");
      setObTab("challenge");
    } else if (params.has("obeissance")) {
      setActiveTab("obeissance");
    }
  }, []);

  useEffect(() => {if (user) {loadData();if (activeTab === "obeissance") loadObedienceData(user, dogs);}}, [user?.email]);

  // Chargement initial : onglet Suivi uniquement (rapide)
  const loadData = () => run(async () => {
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];

    const [myDogs, myEntriesByOwner, myEntriesByOwnerEmail, profiles, myAnnouncements, acceptedRequests, myActivities] = await Promise.all([
    base44.entities.DogProfile.filter({ created_by: user.email }),
    base44.entities.ProgressEntry.filter({ created_by: user.email }, "-created_date", 100),
    base44.entities.ProgressEntry.filter({ owner_email: user.email }, "-created_date", 100).catch(() => []),
    base44.entities.UserProfile.filter({ created_by: user.email }).catch(() => []),
    base44.entities.MeetupAnnouncement.filter({ created_by: user.email }, "-date", 30).catch(() => []),
    base44.entities.MeetupRequest.filter({ created_by: user.email, status: "accepted" }, "-created_date", 20).catch(() => []),
    base44.entities.Activity.filter({ created_by: user.email, status: "open" }, "-date", 20).catch(() => [])]
    );

    // Construire la liste des événements à venir (date >= aujourd'hui)
    const upcoming = [];

    // Mes annonces ouvertes ou matchées
    for (const ann of myAnnouncements) {
      if (["open", "matched"].includes(ann.status) && ann.date >= today) {
        upcoming.push({ ...ann, _type: "meetup" });
      }
    }

    // Balades où je suis accepté (1 seule requête groupée, filtrage côté client)
    const announcementIds = new Set(acceptedRequests.map((r) => r.announcement_id).filter(Boolean));
    if (announcementIds.size > 0) {
      const allAcceptedAnns = await base44.entities.MeetupAnnouncement.filter(
        { created_by: { $exists: true } }, "-date", 50
      ).catch(() => []);
      for (const ann of allAcceptedAnns) {
        if (
        announcementIds.has(ann.id) &&
        ["open", "matched"].includes(ann.status) &&
        ann.date >= today &&
        ann.created_by !== user.email)
        {
          upcoming.push({ ...ann, _type: "meetup" });
        }
      }
    }

    // Mes activités ouvertes
    for (const act of myActivities) {
      if (act.date >= today) {
        upcoming.push({ ...act, _type: "activity" });
      }
    }

    // Activités où je suis participant (pas organisateur)
    const allOpenActivities = await base44.entities.Activity.filter({ status: "open" }, "-date", 50).catch(() => []);
    for (const act of allOpenActivities) {
      if (act.created_by !== user.email && Array.isArray(act.participants) && act.participants.includes(user.email) && act.date >= today) {
        if (!upcoming.find((e) => e.id === act.id)) {
          upcoming.push({ ...act, _type: "activity" });
        }
      }
    }

    // Dédupliquer et trier
    const seen = new Set();
    const deduped = upcoming.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
    setUpcomingEvents(deduped);

    // Fusionner les entrées : par created_by + par owner_email (balades partagées) + par dog_id
    let myEntries = myEntriesByOwner;
    {
      const seen = new Set(myEntriesByOwner.map((e) => e.id));
      const extra = myEntriesByOwnerEmail.filter((e) => !seen.has(e.id));
      myEntries = [...myEntriesByOwner, ...extra];
      seen.forEach((_, k) => seen.delete(k)); // reset
      myEntries.forEach((e) => seen.add(e.id));

      if (myDogs.length > 0) {
        const dogIds = myDogs.map((d) => d.id);
        const entriesByDog = await Promise.all(
          dogIds.map((dogId) =>
          base44.entities.ProgressEntry.filter({ dog_id: dogId }, "-created_date", 50).catch(() => [])
          )
        );
        const byDogExtra = entriesByDog.flat().filter((e) => !seen.has(e.id));
        myEntries = [...myEntries, ...byDogExtra];
      }
      myEntries.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }

    setDogs(myDogs);
    setEntries(myEntries);
    window._obedienceEmail = user.email;
    window._obedienceJournals = window._obedienceJournals || {};

    const profile = profiles[0] || null;
    setUserProfile(profile);
    if (profile?.monthly_goal) setMonthlyGoal(String(profile.monthly_goal));

    if (myDogs.length > 0) {
      setSelectedDog((prev) => prev || myDogs[0]);
    }

    // Si l'onglet Obéissance était déjà ouvert, rafraîchir aussi
    if (obedienceLoaded) {
      setObedienceLoaded(false);
      loadObedienceData(user, myDogs);
    }
  });

  // Chargement différé : onglet Obéissance (au premier clic)
  const loadObedienceData = async (me, dogs) => {
    if (obedienceLoaded || obedienceLoading) return;
    setObedienceLoading(true);
    const [journals, myActivities] = await Promise.all([
    base44.entities.ObedienceJournal.filter({ owner_id: me.email }),
    base44.entities.Activity.filter({ created_by: me.email }, "-date", 30).catch(() => [])]
    );
    const journalMap = {};
    journals.forEach((j) => {journalMap[j.dog_id] = j;});
    window._obedienceJournals = journalMap;

    setActivities(myActivities);
    if (dogs.length > 0) {
      setJournal(journalMap[dogs[0].id] || null);
    }
    setObedienceLoaded(true);
    setObedienceLoading(false);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "obeissance" && !obedienceLoaded && user) {
      loadObedienceData(user, dogs);
    }
  };

  const handleSelectDog = (dog) => {
    setSelectedDog(dog);
    setSelectedDay(null);
    const cached = window._obedienceJournals?.[dog.id];
    if (cached !== undefined) {
      setJournal(cached || null);
    } else if (obedienceLoaded) {
      base44.entities.ObedienceJournal.filter({ dog_id: dog.id, owner_id: window._obedienceEmail }).
      then((r) => setJournal(r[0] || null));
    }
  };

  const handleSetLevel = (orderId, level, dailyKey) => runSave(async () => {
    if (!user) return;
    const newProgress = { ...(journal?.progress || {}), [orderId]: level };
    if (dailyKey) newProgress[dailyKey] = true;
    const { xpTotal, badges, dogLevel } = computeProgress({ progress: newProgress });
    const data = {
      dog_id: selectedDog.id, dog_name: selectedDog?.name || "", owner_id: user.email,
      progress: newProgress, xp_total: xpTotal, dog_level: dogLevel.level,
      badges, last_updated: new Date().toISOString()
    };
    const updated = journal?.id ?
    await base44.entities.ObedienceJournal.update(journal.id, data) :
    await base44.entities.ObedienceJournal.create(data);
    setJournal(updated);
    if (window._obedienceJournals) window._obedienceJournals[selectedDog.id] = updated;
  });

  const handleSaveGoal = async (val) => {
    setMonthlyGoal(val);
    if (!userProfile?.id) return;
    await base44.entities.UserProfile.update(userProfile.id, { monthly_goal: parseInt(val) || 0 }).catch(() => {});
  };

  const dogEntries = useMemo(() =>
  selectedDog ? entries.filter((e) => e.dog_id === selectedDog.id) : entries,
  [entries, selectedDog]
  );

  const filteredEntries = useMemo(() => {
    let list = selectedDay ?
    dogEntries.filter((e) => {
      const dateToUse = e.session_date ? parseUTC(e.session_date) : e.created_date ? parseUTC(e.created_date) : null;
      return dateToUse && isSameDay(dateToUse, selectedDay);
    }) :
    dogEntries;
    if (activeFilter !== "all") list = list.filter((e) => e.session_type === activeFilter);
    return list;
  }, [dogEntries, selectedDay, activeFilter]);

  const earnedBadges = BADGES_CARNET.filter((b) => b.condition(entries));
  const totalMinutes = entries.reduce((s, e) => s + (e.duration_minutes || 0), 0);

  if (status === "loading") return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#4CAF87] border-t-transparent" />
    </div>);


  return (
    <div className="min-h-screen bg-stone-50 pb-28">

      {/* ── Header sticky ── */}
      <div className="bg-white sticky top-0 z-10 shadow-sm">

        {/* Titre + actions */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div>
            <h1 className="text-base font-black text-stone-800">Journal de vie</h1>
            {activeTab === "suivi" && selectedDay &&
            <p className="text-xs text-[#4CAF87] font-semibold capitalize">
                {format(selectedDay, "EEEE d MMMM", { locale: fr })}
              </p>
            }
          </div>
          <div className="flex items-center gap-2">
            {activeTab === "suivi" && selectedDay &&
            <button onClick={() => setSelectedDay(null)} className="text-xs text-stone-400 flex items-center gap-1">
                <X className="w-3 h-3" /> Tout
              </button>
            }
            

            
          </div>
        </div>

        {/* Sélecteur chien */}
        {dogs.length === 0 ?
        <div className="px-4 pb-2">
            <Link to={createPageUrl("MyDogs")} className="flex items-center gap-2 text-sm text-[#4CAF87] font-semibold">
              <span className="text-xl">🐕</span> Ajouter mon chien
            </Link>
          </div> :

        <div className="flex gap-2 overflow-x-auto px-4 pb-2">
            {dogs.map((d) =>
          <button key={d.id} onClick={() => handleSelectDog(d)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
          selectedDog?.id === d.id ? "text-white border-[#4CAF87]" : "bg-white text-stone-600 border-stone-200"}`
          }
          style={selectedDog?.id === d.id ? { backgroundColor: "#4CAF87" } : {}}>
            
                {d.photo_url ? <img src={d.photo_url} className="w-4 h-4 rounded-full object-cover" alt="" /> : <span>🐕</span>}
                {d.name}
              </button>
          )}
          </div>
        }

        {/* ── Onglets principaux ── */}
        <div className="flex border-b border-stone-100">
          <button
            onClick={() => handleTabChange("suivi")}
            className={`flex-1 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === "suivi" ? "border-[#4CAF87] text-[#4CAF87]" : "border-transparent text-stone-400"}`
            }>
            
            🐾 Suivi & Activité
          </button>
          <button
            onClick={() => handleTabChange("obeissance")}
            onMouseEnter={() => {if (!obedienceLoaded && user) loadObedienceData(user, dogs);}}
            onFocus={() => {if (!obedienceLoaded && user) loadObedienceData(user, dogs);}}
            onTouchStart={() => {if (!obedienceLoaded && user) loadObedienceData(user, dogs);}}
            className={`flex-1 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === "obeissance" ? "border-indigo-500 text-indigo-600" : "border-transparent text-stone-400"}`
            }>
            
            📚 Obéissance
          </button>
        </div>

        {/* WeekStrip — uniquement sur l'onglet Suivi */}
        {activeTab === "suivi" &&
        <WeekStrip
          entries={dogEntries}
          selectedDay={selectedDay}
          onSelectDay={(day) => {
            setSelectedDay(day);
            setVisibleCount(15);
          }} />

        }
      </div>

      {/* ══════════════════════════════════════════════
              ONGLET : SUIVI & ACTIVITÉ
           ══════════════════════════════════════════════ */}
      {activeTab === "suivi" &&
      <>
          <div className="mt-3">
            <UpcomingEventsSection events={upcomingEvents} />
          </div>

          <div className="px-4 mt-1">
            <MonthlyGoalSection entries={dogEntries} savedGoal={monthlyGoal} onSaveGoal={handleSaveGoal} />
          </div>

          {(!selectedDay || filteredEntries.length > 0) && <div className="px-4 mt-3">
            <button
            onClick={() => {setShowAddDate(selectedDay || null);setShowAddType(null);setShowAdd(true);}}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-bold text-sm shadow-md transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}>
            
              <Plus className="w-5 h-5" /> + Ajouter une activité
            </button>
          </div>}

          <div className="flex gap-2 overflow-x-auto px-4 mt-3 pb-1">
            {JOURNAL_FILTERS.map((f) =>
          <button
            key={f.key}
            onClick={() => {setActiveFilter(f.key);setVisibleCount(15);}}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
            activeFilter === f.key ? "text-white border-[#4CAF87]" : "bg-white text-stone-600 border-stone-200"}`
            }
            style={activeFilter === f.key ? { backgroundColor: "#4CAF87" } : {}}>
            
                {f.label}
              </button>
          )}
          </div>

          <div className="mt-3">
            {filteredEntries.length === 0 ?
          <div className="mx-4 bg-white rounded-2xl border border-stone-100 p-8 text-center">
                <div className="text-3xl mb-2">📓</div>
                <p className="text-sm font-semibold text-stone-600 mb-1">
                  {selectedDay ? "Aucune activité ce jour" : "Aucune activité encore"}
                </p>
                <p className="text-xs text-stone-400 mb-4">Enregistrez vos balades et séances pour suivre votre progression.</p>
                <button onClick={() => {setShowAddDate(selectedDay || null);setShowAddType(null);setShowAdd(true);}} className="text-white font-bold px-5 py-2 rounded-xl text-sm" style={{ backgroundColor: "#4CAF87" }}>
                  + Ajouter une activité
                </button>
              </div> :

          <div>
                {filteredEntries.slice(0, visibleCount).map((entry) =>
            <EntryCard key={entry.id} entry={entry} onSelect={setSelectedEntry} />
            )}
                {filteredEntries.length > visibleCount &&
            <button onClick={() => setVisibleCount((v) => v + 15)} className="w-full py-3 text-sm font-semibold text-[#4CAF87] bg-white mt-1">
                    Charger plus ({filteredEntries.length - visibleCount} restantes)
                  </button>
            }
              </div>
          }
          </div>

          {selectedDog &&
        <div className="px-4 mt-4">
              <button onClick={() => setShowRoutes((v) => !v)} className="flex items-center justify-between w-full mb-2">
                <h2 className="text-sm font-black text-stone-700">🗺️ Mes Trajets GPS</h2>
                <span className="text-xs text-[#4CAF87] font-semibold">{showRoutes ? "Masquer ▲" : "Voir ▼"}</span>
              </button>
              {showRoutes && <WalkRouteGallery dogId={selectedDog?.id} />}
            </div>
        }
        </>
      }

      {/* ══════════════════════════════════════════════
              ONGLET : OBÉISSANCE
           ══════════════════════════════════════════════ */}
      {activeTab === "obeissance" &&
      <div className="max-w-2xl mx-auto px-4">

          {obedienceLoading &&
        <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-7 w-7 border-4 border-indigo-400 border-t-transparent" />
            </div>
        }

          {!obedienceLoading && dogs.length === 0 &&
        <div className="mt-6 bg-white rounded-2xl border border-indigo-100 p-8 text-center">
              <div className="text-4xl mb-3">🐕</div>
              <div className="font-bold text-stone-700 mb-1">Aucun chien enregistré</div>
              <div className="text-stone-400 text-sm">Ajoutez votre chien dans "Mes chiens" pour commencer.</div>
            </div>
        }

          {!obedienceLoading && selectedDog &&
        <>
              {/* Bouton + Séance */}
              <div className="flex justify-end pt-3">
                




            
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2 mt-3">
                {[
            { label: "XP", value: journal?.xp_total || 0, emoji: "⚡", color: "text-violet-600" },
            { label: "Niveau", value: journal?.dog_level || 1, emoji: "🎖️", color: "text-indigo-600" },
            { label: "Séances", value: entries.length, emoji: "📓", color: "text-teal-600" },
            { label: "Temps", value: totalMinutes >= 60 ? `${Math.round(totalMinutes / 60)}h` : `${totalMinutes}m`, emoji: "⏱", color: "text-orange-500" }].
            map((s) =>
            <div key={s.label} className="bg-white rounded-xl p-2.5 text-center border border-slate-100 shadow-sm">
                    <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
                    <div className="text-[10px] text-stone-400 leading-tight">{s.label}</div>
                  </div>
            )}
              </div>

              {/* Badges */}
              {earnedBadges.length > 0 &&
          <div className="flex gap-1.5 flex-wrap mt-2.5">
                  {earnedBadges.map((b) =>
            <span key={b.id} className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                      {b.emoji} {b.label}
                    </span>
            )}
                </div>
          }

              {/* Onglets Obéissance */}
              <div className="flex gap-1 bg-white rounded-2xl border border-slate-100 p-1 mt-4 shadow-sm">
                {[
            { id: "challenge", label: "Défi du jour", icon: "⚡" },
            { id: "carnet", label: "Carnet", icon: "📓" },
            { id: "conseils", label: "Conseils", icon: "💡" }].
            map((t) =>
            <button
              key={t.id}
              onClick={() => setObTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              obTab === t.id ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow" : "text-stone-500"}`
              }>
              
                    <span>{t.icon}</span> {t.label}
                  </button>
            )}
              </div>

              {/* Contenu onglet Défi */}
              {obTab === "challenge" &&
          <div className="mt-4">
                  <DailyChallenge progress={journal?.progress || {}} onValidate={handleSetLevel} saving={saveStatus === "loading"} />
                  <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-2xl p-3 text-center">
                    <p className="text-xs text-indigo-700 font-semibold">💡 Sessions courtes (5-10 min), positives et régulières.</p>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Compétences acquises</p>
                    <UserJournal journal={journal} onSetLevel={handleSetLevel} saving={saveStatus === "loading"} />
                  </div>
                </div>
          }

              {/* Contenu onglet Carnet */}
              {obTab === "carnet" &&
          <div className="mt-4 space-y-3">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                            {[
              { key: "all", label: "Tout" },
              { key: "sessions", label: `📓 Séances (${dogEntries.length})` },
              { key: "activities", label: `🏅 Autres activités (${activities.length})` }].
              map((t) =>
              <button key={t.key} onClick={() => setCarnetFilter(t.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              carnetFilter === t.key ? "bg-teal-500 text-white border-teal-500" : "bg-white text-stone-600 border-stone-200"}`
              }>
                        {t.label}
                      </button>
              )}
                  </div>

                  {(carnetFilter === "all" || carnetFilter === "sessions") &&
            <>
                      {carnetFilter === "all" && dogEntries.length > 0 &&
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mt-2">Séances enregistrées</p>
              }
                      {dogEntries.length === 0 ?
              <div className="text-center py-8 bg-white rounded-2xl border border-stone-100">
                          <div className="text-3xl mb-2">📓</div>
                          <p className="text-sm font-semibold text-stone-600">Aucune séance</p>
                          <button onClick={() => {setShowAddDate(selectedDay || null);setShowAddType("obeissance");setShowAdd(true);}} className="mt-3 bg-teal-500 text-white rounded-xl text-xs px-4 py-1.5 font-semibold">
                            + Ajouter
                          </button>
                        </div> :

              <div className="space-y-2">
                          {dogEntries.map((entry) => <ProgressCard key={entry.id} entry={entry} onDelete={loadData} />)}
                        </div>
              }
                    </>
            }

                  {(carnetFilter === "all" || carnetFilter === "activities") &&
            <>
                      {carnetFilter === "all" && activities.length > 0 &&
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mt-3">Activités canines</p>
              }
                      {activities.length === 0 && carnetFilter === "activities" ?
              <div className="text-center py-8 bg-white rounded-2xl border border-stone-100">
                          <div className="text-3xl mb-2">🏅</div>
                          <p className="text-sm font-semibold text-stone-600">Aucune activité</p>
                          <p className="text-xs text-stone-400 mt-1">Participez à des activités dans Sports Canins</p>
                        </div> :

              <div className="space-y-2">
                          {activities.map((act) =>
                <div key={act.id} className="bg-white rounded-2xl p-3.5 shadow-sm border border-stone-100 flex items-center gap-3">
                              <div className="text-xl flex-shrink-0">🏅</div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-stone-800 text-sm truncate">{act.title}</p>
                                <p className="text-xs text-stone-400 mt-0.5">
                                  {ACTIVITY_TYPE_LABELS[act.type] || act.type}
                                  {act.date && <> · {parseUTC(act.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</>}
                                  {act.duration_minutes && <> · {act.duration_minutes} min</>}
                                  {act.city && <> · 📍{act.city}</>}
                                </p>
                              </div>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  act.status === "completed" ? "bg-green-100 text-green-700" :
                  act.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`
                  }>
                                {act.status === "completed" ? "✓ Terminée" : act.status === "cancelled" ? "Annulée" : "À venir"}
                              </span>
                            </div>
                )}
                        </div>
              }
                    </>
            }
                </div>
          }

              {/* Contenu onglet Conseils */}
              {obTab === "conseils" &&
          <div className="space-y-3 mt-4">
                  {CONSEILS.map((ex) =>
            <div key={ex.name} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-xl flex-shrink-0">{ex.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-stone-800 text-sm">{ex.name}</span>
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{ex.niveau}</span>
                          </div>
                          <p className="text-xs text-stone-500 mb-2">{ex.description}</p>
                          <div className="space-y-1">
                            {ex.tips.map((tip, i) =>
                    <div key={i} className="flex items-start gap-1.5">
                                <span className="text-indigo-400 text-xs mt-0.5">•</span>
                                <p className="text-xs text-stone-600">{tip}</p>
                              </div>
                    )}
                          </div>
                        </div>
                      </div>
                    </div>
            )}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3 items-start mb-4">
                    <span className="text-xl">⭐</span>
                    <div>
                      <p className="font-semibold text-indigo-800 text-sm">La clé du succès</p>
                      <p className="text-xs text-indigo-600 mt-1">Sessions courtes (5-10 min), positives et régulières. Terminez toujours sur un succès !</p>
                    </div>
                  </div>
                </div>
          }
            </>
        }
        </div>
      }

      {/* ── Drawer détail entrée ── */}
      {selectedEntry &&
      <div
        className="fixed inset-0 z-50 flex items-end justify-center"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={() => setSelectedEntry(null)}>
        
          <div
          className="bg-white rounded-t-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto pb-24"
          onClick={(e) => e.stopPropagation()}>
          
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                style={{ backgroundColor: (TYPE_CONFIG[selectedEntry.session_type] || TYPE_CONFIG.autre).color + "20" }}>
                
                  {(TYPE_CONFIG[selectedEntry.session_type] || TYPE_CONFIG.autre).emoji}
                </div>
                <div>
                  <p className="font-black text-stone-800">
                    {(TYPE_CONFIG[selectedEntry.session_type] || TYPE_CONFIG.autre).label}
                  </p>
                  <p className="text-xs text-stone-400">
                    {selectedEntry.session_date ?
                  new Date(selectedEntry.session_date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) :
                  formatDate(selectedEntry.created_date)
                  }
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedEntry(null)} className="p-2 rounded-full bg-stone-100">
                <X className="w-4 h-4 text-stone-500" />
              </button>
            </div>

            {/* Contenu */}
            <div className="px-6 py-4 space-y-4">
              {/* Stats */}
              <div className="flex gap-3">
                {selectedEntry.duration_minutes > 0 &&
              <div className="flex-1 bg-stone-50 rounded-2xl p-3 text-center">
                    <p className="text-lg font-black text-stone-800">{selectedEntry.duration_minutes}</p>
                    <p className="text-xs text-stone-400">minutes</p>
                  </div>
              }

              </div>

              {/* Chien */}
              <div className="flex items-center gap-2">
                <span className="text-lg">🐕</span>
                <span className="text-sm font-semibold text-stone-700">{selectedEntry.dog_name || "—"}</span>
              </div>

              {/* Humeur */}
              {selectedEntry.mood &&
            <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {{ excellent: "⭐", bien: "🙂", moyen: "😐", difficile: "😓" }[selectedEntry.mood]}
                  </span>
                  <span className="text-sm font-semibold text-stone-700 capitalize">{selectedEntry.mood}</span>
                </div>
            }

              {/* Exercices */}
              {selectedEntry.exercises?.length > 0 &&
            <div>
                  <p className="text-xs font-semibold text-stone-500 mb-1.5">Exercices</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEntry.exercises.map((ex, i) =>
                <span key={i} className="px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium">{ex}</span>
                )}
                  </div>
                </div>
            }

              {/* Notes */}
              {selectedEntry.notes &&
            <div>
                  <p className="text-xs font-semibold text-stone-500 mb-1.5">Notes</p>
                  <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">{selectedEntry.notes}</p>
                </div>
            }

              {/* Photo */}
              {selectedEntry.media_url &&
            <img src={selectedEntry.media_url} alt="" className="w-full rounded-2xl object-cover max-h-48" />
            }

              {/* Objectif */}
              {selectedEntry.objective &&
            <div>
                  <p className="text-xs font-semibold text-stone-500 mb-1">Objectif</p>
                  <p className="text-sm text-stone-600">{selectedEntry.objective}</p>
                </div>
            }
            </div>

            {/* Footer suppression */}
            <div className="px-6 pb-8 pt-2 border-t border-stone-100">
              <button
              onClick={async () => {
                if (!confirm("Supprimer cette entrée définitivement ?")) return;
                await base44.entities.ProgressEntry.delete(selectedEntry.id);
                setSelectedEntry(null);
                loadData();
              }}
              className="w-full py-3 rounded-2xl border-2 border-red-200 text-red-500 text-sm font-bold hover:bg-red-50 transition-colors">
              
                🗑 Supprimer cette entrée
              </button>
            </div>
          </div>
        </div>
      }

      {/* ── Modals ── */}
      {showAdd && dogs.length > 0 &&
      <QuickLogModal
        dogs={dogs}
        defaultType={showAddType}
        defaultDate={showAddDate}
        onClose={() => {setShowAdd(false);setShowAddType(null);setShowAddDate(null);loadData();}} />

      }
      {shareEntry &&
      <ShareActivityModal
        entry={shareEntry}
        user={user}
        userProfile={userProfile}
        onClose={() => setShareEntry(null)} />

      }
    </div>);

}