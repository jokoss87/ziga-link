import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Play, Square, Plus, MapPin, Clock, Footprints, CheckCircle, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEP_LENGTH_M = 0.75; // ~75cm par pas

export default function Balade() {
  const [status, setStatus] = useState("idle"); // idle | running | paused | done
  const [steps, setSteps] = useState(0);
  const [distanceM, setDistanceM] = useState(0);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [dogs, setDogs] = useState([]);
  const [selectedDogs, setSelectedDogs] = useState([]);

  const { user } = useUserProfile();
  const toggleDogSelection = (id) => {
    setSelectedDogs(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };
  const [saved, setSaved] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [friends, setFriends] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  const [trackRoute, setTrackRoute] = useState(false);
  const [routePoints, setRoutePoints] = useState([]);

  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const motionListenerRef = useRef(null);
  const lastAccelRef = useRef({ x: 0, y: 0, z: 0 });
  const stepCooldownRef = useRef(false);
  const gpsWatchRef = useRef(null);

  useEffect(() => {
    if (user) {
      base44.entities.DogProfile.filter({ created_by: user.email }).then(d => {
        setDogs(d);
        if (d.length > 0) setSelectedDogs([d[0].id]);
      });
      base44.entities.FriendList.filter({ user_email: user.email }, "-created_date", 1).then(([fl]) => {
        if (fl?.friends?.length > 0) {
Promise.all(
            fl.friends.slice(0, 20).map(email =>
              base44.entities.UserProfile.filter({ created_by: email }, "-created_date", 1)
                .then(r => r[0] || null).catch(() => null)
            )
          ).then(results => setFriends(results.filter(Boolean)));
        }
      }).catch(() => {});
    }
    return () => stopAll();
  }, [user?.email]);

  const stopAll = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (motionListenerRef.current) {
      window.removeEventListener("devicemotion", motionListenerRef.current);
      motionListenerRef.current = null;
    }
    if (gpsWatchRef.current) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
    }
  };

  const requestMotionPermission = async () => {
    if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
      const permission = await DeviceMotionEvent.requestPermission();
      if (permission !== "granted") {
        setPermissionError(true);
        return false;
      }
    }
    return true;
  };

  const detectStep = (event) => {
    const acc = event.accelerationIncludingGravity;
    if (!acc) return;
    const { x, y, z } = acc;
    const prev = lastAccelRef.current;
    const delta = Math.abs(x - prev.x) + Math.abs(y - prev.y) + Math.abs(z - prev.z);
    lastAccelRef.current = { x, y, z };

    if (delta > 12 && !stepCooldownRef.current) {
      setSteps(s => {
        const newSteps = s + 1;
        setDistanceM(newSteps * STEP_LENGTH_M);
        return newSteps;
      });
      stepCooldownRef.current = true;
      setTimeout(() => { stepCooldownRef.current = false; }, 350);
    }
  };

  const startWalk = async () => {
    const ok = await requestMotionPermission();
    if (!ok) return;

    setStatus("running");
    setSaved(false);
    startTimeRef.current = Date.now() - elapsed * 1000;

    // Timer
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    // Pedometer
    motionListenerRef.current = detectStep;
    window.addEventListener("devicemotion", motionListenerRef.current);

    // GPS Tracking si activé
    if (trackRoute && navigator.geolocation) {
      gpsWatchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setRoutePoints(prev => [...prev, [pos.coords.latitude, pos.coords.longitude]]);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    }
  };

  const stopWalk = () => {
    stopAll();
    setStatus("done");
  };

  const addMoreSteps = () => {
    // Continue walking
    startWalk();
    setStatus("running");
  };

  const saveToCarnet = async () => {
    if (!user) return;
    const durationMinutes = Math.max(1, Math.round(elapsed / 60));
    const now = new Date().toISOString();
    const startAt = new Date(Date.now() - elapsed * 1000).toISOString();
    const activeDogs = selectedDogs.length > 0 ? dogs.filter(d => selectedDogs.includes(d.id)) : [dogs[0]].filter(Boolean);
    const dogNames = activeDogs.map(d => d.name).join(", ");

    for (const dog of activeDogs) {
      const entry = await base44.entities.ProgressEntry.create({
        dog_id: dog.id,
        dog_name: dog.name,
        session_type: "balade",
        title: `Balade — ${steps} pas (${formatDistance(distanceM)})${activeDogs.length > 1 ? ` · ${dogNames}` : ""}`,
        notes: `Durée : ${formatTime(elapsed)} | Pas : ${steps} | Distance : ${formatDistance(distanceM)}`,
        duration_minutes: durationMinutes,
        steps: steps,
        distance_km: parseFloat((distanceM / 1000).toFixed(3)),
      });

      if (routePoints.length > 1) {
        await base44.entities.WalkRoute.create({
          entry_id: entry.id,
          dog_id: dog.id,
          dog_name: dog.name,
          points: routePoints,
          distance_km: parseFloat((distanceM / 1000).toFixed(3)),
          steps: steps,
          duration_minutes: durationMinutes,
          start_at: startAt,
          end_at: now,
        });
      }
    }

    setSaved(true);
  };

  const inviteFriendToWalk = async (friendEmail, friendPseudo) => {
    await base44.entities.Notification.create({
      user_email: friendEmail,
      type: "walk_request",
      title: `${user?.full_name || "Un ami"} vous invite à une balade 🐾`,
      body: `Rejoignez la balade maintenant !`,
      link_page: "Balade",
      is_read: false,
    });
    setInviteSent(true);
    setTimeout(() => { setInviteSent(false); setShowInviteModal(false); }, 2000);
  };

  const resetWalk = () => {
    setSteps(0);
    setDistanceM(0);
    setElapsed(0);
    setStatus("idle");
    setSaved(false);
    setRoutePoints([]);
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const formatDistance = (m) => {
    if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
    return `${Math.round(m)} m`;
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-500 via-emerald-500 to-green-600 px-6 pt-10 pb-8 text-white">
        <div className="max-w-md mx-auto">
          <Link to={createPageUrl("Home")} className="flex items-center gap-2 text-teal-100 hover:text-white mb-5 text-sm">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black flex items-center gap-2">🐾 Compteur de balade</h1>
            {friends.length > 0 && (
              <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-2 rounded-xl">
                <Users className="w-4 h-4" /> Inviter
              </button>
            )}
          </div>
          <p className="text-teal-100 text-sm mt-1">Suivez vos pas et votre distance automatiquement</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-5">

        {/* Option tracé GPS */}
        {status === "idle" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-stone-700">🗺️ Tracer l'itinéraire sur la carte</p>
                <p className="text-xs text-stone-400 mt-0.5">Utilise votre GPS en temps réel</p>
              </div>
              <button
                onClick={() => setTrackRoute(v => !v)}
                className={`relative w-12 h-6 rounded-full transition-colors ${trackRoute ? "bg-teal-500" : "bg-stone-200"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${trackRoute ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>
            {trackRoute && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-3 border border-amber-200">
                ⚠️ Le GPS sera actif pendant toute la balade. Une demande de localisation va apparaître.
              </p>
            )}
          </div>
        )}

        {/* Afficher lien carte si tracé disponible */}
        {status === "done" && routePoints.length > 1 && (
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-teal-800">🗺️ Itinéraire enregistré</p>
              <p className="text-xs text-teal-600">{routePoints.length} points GPS capturés</p>
            </div>
            <a
              href={`${window.location.origin}/CarteFullscreen?route=${encodeURIComponent(JSON.stringify(routePoints))}`}
              className="text-xs font-bold bg-teal-500 text-white px-3 py-2 rounded-xl"
            >
              Voir →
            </a>
          </div>
        )}

        {/* Chiens selector — multi-sélection */}
        {status !== "running" && dogs.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
            <label className="text-sm font-semibold text-stone-600 block mb-2">Quel(s) chien(s) vous accompagne(nt) ?</label>
            <div className="flex gap-2 flex-wrap">
              {dogs.map(d => (
                <button key={d.id} onClick={() => toggleDogSelection(d.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${selectedDogs.includes(d.id) ? "bg-teal-500 text-white border-teal-500" : "bg-white border-stone-200 text-stone-600"}`}>
                  🐕 {d.name}
                </button>
              ))}
            </div>
            {selectedDogs.length === 0 && <p className="text-xs text-red-400 mt-1">Sélectionnez au moins un chien</p>}
          </div>
        )}

        {/* Compteurs */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-black text-teal-600">{steps.toLocaleString()}</div>
              <div className="text-xs text-stone-400 mt-1 flex items-center justify-center gap-1">
                <Footprints className="w-3 h-3" /> Pas
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-emerald-600">{formatDistance(distanceM)}</div>
              <div className="text-xs text-stone-400 mt-1 flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3" /> Distance
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-purple-600">{formatTime(elapsed)}</div>
              <div className="text-xs text-stone-400 mt-1 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" /> Durée
              </div>
            </div>
          </div>

          {/* Indicateur live */}
          {status === "running" && (
            <div className="flex items-center justify-center gap-2 bg-teal-50 rounded-xl py-2 mb-4">
              <span className="w-2.5 h-2.5 bg-teal-500 rounded-full animate-pulse" />
              <span className="text-teal-700 text-sm font-semibold">Balade en cours...</span>
            </div>
          )}

          {/* Boutons */}
          {status === "idle" && (
            <Button onClick={startWalk} className="w-full bg-teal-500 hover:bg-teal-600 text-white text-lg py-6 rounded-2xl gap-3 font-bold shadow-lg">
              <Play className="w-6 h-6" /> GO — Démarrer la balade
            </Button>
          )}

          {status === "running" && (
            <Button onClick={stopWalk} className="w-full bg-red-500 hover:bg-red-600 text-white text-lg py-6 rounded-2xl gap-3 font-bold shadow-lg">
              <Square className="w-6 h-6" /> Terminer la balade
            </Button>
          )}

          {status === "done" && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center text-amber-700 text-sm font-medium">
                🎉 Balade terminée ! Super effort !
              </div>
              <Button onClick={addMoreSteps} variant="outline" className="w-full gap-2 border-teal-200 text-teal-700 hover:bg-teal-50 rounded-xl py-5">
                <Plus className="w-5 h-5" /> Continuer à marcher
              </Button>
              {!saved ? (
                <Button onClick={saveToCarnet} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-5 gap-2 font-bold">
                  💾 Sauvegarder dans le carnet
                </Button>
              ) : (
                <div className="flex items-center justify-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl py-4 font-semibold">
                  <CheckCircle className="w-5 h-5" /> Sauvegardé dans le carnet !
                </div>
              )}
              <button onClick={resetWalk} className="w-full text-stone-400 text-sm underline py-1">
                Nouvelle balade
              </button>
            </div>
          )}
        </div>

        {/* Permission error */}
        {permissionError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
            ⚠️ L'accès au capteur de mouvement a été refusé. Activez-le dans les réglages de votre navigateur pour utiliser le compteur de pas.
          </div>
        )}

        {/* Info */}
        {status === "idle" && (
          <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 text-teal-700 text-sm space-y-1">
            <p className="font-semibold">💡 Comment ça marche</p>
            <p>• Le compteur démarre automatiquement dès que vous appuyez sur GO</p>
            <p>• Il détecte vos pas grâce au capteur de mouvement de votre téléphone</p>
            <p>• La distance est calculée à ~75 cm par pas</p>
            <p>• La balade est sauvegardée dans votre carnet d'entraînement</p>
          </div>
        )}
      </div>

      {/* Modal invitation amis */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-stone-800">🐾 Inviter un ami en balade</h2>
              <button onClick={() => setShowInviteModal(false)}><X className="w-5 h-5 text-stone-400" /></button>
            </div>
            {inviteSent ? (
              <div className="flex items-center justify-center gap-2 bg-teal-50 border border-teal-200 text-teal-700 rounded-xl py-4 font-semibold">
                <CheckCircle className="w-5 h-5" /> Invitation envoyée !
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map(f => (
                  <div key={f.id} className="flex items-center justify-between bg-stone-50 rounded-xl p-3 border border-stone-100">
                    <div className="flex items-center gap-2">
                      {f.photo_url ? <img src={f.photo_url} className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-sm">{f.pseudo?.[0]}</div>}
                      <div>
                        <p className="text-sm font-semibold text-stone-800">{f.pseudo}</p>
                        <p className="text-xs text-stone-400">{f.city}</p>
                      </div>
                    </div>
                    <button onClick={() => inviteFriendToWalk(f.created_by, f.pseudo)} className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                      Inviter
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}