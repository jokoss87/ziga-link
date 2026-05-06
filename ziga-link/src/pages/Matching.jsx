import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLocation } from "@/components/location/LocationContext";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { ArrowLeft, MapPin, Zap, Heart, Navigation, RefreshCw, PawPrint, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import MatchCard from "@/components/matching/MatchCard.jsx";

const CACHE_KEY = "zigalink_matching_dogs";
const CACHE_TTL = 5 * 60 * 1000;

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceScore(km) {
  if (km <= 3) return 100;
  if (km <= 7) return 80;
  if (km <= 15) return 55;
  if (km <= 25) return 30;
  return 5;
}

const SIZE_COMPAT = {
  small: { small: 100, medium: 70, large: 40 },
  medium: { small: 70, medium: 100, large: 70 },
  large: { small: 40, medium: 70, large: 100 },
};

const ENERGY_COMPAT = {
  low: { low: 100, medium: 60, high: 20 },
  medium: { low: 60, medium: 100, high: 60 },
  high: { low: 20, medium: 60, high: 100 },
};

function compatScore(myDog, otherDog) {
  let score = 0;
  let count = 0;
  if (myDog.size && otherDog.size) {
    score += SIZE_COMPAT[myDog.size]?.[otherDog.size] ?? 50;
    count++;
  }
  if (myDog.energy_level && otherDog.energy_level) {
    score += ENERGY_COMPAT[myDog.energy_level]?.[otherDog.energy_level] ?? 50;
    count++;
  }
  if (myDog.age_years != null && otherDog.age_years != null) {
    const diff = Math.abs(myDog.age_years - otherDog.age_years);
    score += diff <= 1 ? 100 : diff <= 3 ? 70 : diff <= 6 ? 40 : 20;
    count++;
  }
  if (myDog.good_with_dogs && otherDog.good_with_dogs) {
    const soc = { yes: 100, sometimes: 60, no: 10 };
    score += Math.min(soc[myDog.good_with_dogs] ?? 50, soc[otherDog.good_with_dogs] ?? 50);
    count++;
  }
  return count > 0 ? score / count : 50;
}

function globalScore(distKm, myDog, otherDog, hasCommonActivity) {
  const d = distanceScore(distKm) * 0.4;
  const c = compatScore(myDog, otherDog) * 0.3;
  const a = (hasCommonActivity ? 100 : 30) * 0.2;
  const avail = 50 * 0.1;
  return Math.round(d + c + a + avail);
}

export default function Matching() {
  const { user } = useUserProfile();
  const [myDogs, setMyDogs] = useState([]);
  const [selectedDog, setSelectedDog] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const navigate = useNavigate();
  const { userLocation: userPos, requestLocation, permissionStatus } = useLocation();

  useEffect(() => {
    if (user) init();
  }, [user?.email]);

  const init = async () => {
    if (!user) return;
    setLoading(true);
    // Requêtes séquentielles pour éviter le rate limit
    const dogs = await base44.entities.DogProfile.filter({ created_by: user.email });
    const anns = await base44.entities.MeetupAnnouncement.filter({ status: "open" }, "-created_date", 30);
    setMyDogs(dogs);
    setAnnouncements(anns);
    if (dogs.length > 0) setSelectedDog(dogs[0]);
    if (permissionStatus !== "granted") requestLocation();
    setLoading(false);
  };

  useEffect(() => {
    if (selectedDog) computeMatches();
  }, [selectedDog, userPos]);

  const computeMatches = async () => {
    if (!selectedDog) return;
    setComputing(true);

    let allDogs;
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) allDogs = data;
      }
    } catch {}
    if (!allDogs) {
      allDogs = await base44.entities.DogProfile.list("-created_date", 50);
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: allDogs, ts: Date.now() }));
      } catch {}
    }

    const otherDogs = allDogs.filter((d) => d.created_by !== user?.email);
    const openAnns = announcements;
    const myAnns = openAnns.filter((a) => a.created_by === user?.email);
    const myActivityTypes = new Set(myAnns.map((a) => a.type).filter(Boolean));

    const annsByOwner = {};
    openAnns.forEach((a) => {
      if (!annsByOwner[a.created_by]) annsByOwner[a.created_by] = [];
      annsByOwner[a.created_by].push(a);
    });

    const results = otherDogs
      .map((dog) => {
        let distKm = null;
        let dogLat = dog.latitude;
        let dogLng = dog.longitude;

        const ownerAnns = annsByOwner[dog.created_by] || [];
        const annWithPos = ownerAnns.find((a) => a.latitude && a.longitude);
        if (annWithPos) {
          dogLat = annWithPos.latitude;
          dogLng = annWithPos.longitude;
        }

        if (userPos && dogLat && dogLng) {
          distKm = haversine(userPos.lat, userPos.lng, dogLat, dogLng);
        }

        const ownerActivityTypes = new Set(ownerAnns.map((a) => a.type).filter(Boolean));
        const hasCommonActivity = [...myActivityTypes].some((t) => ownerActivityTypes.has(t));

        const score = globalScore(
          distKm != null ? distKm : 20,
          selectedDog,
          dog,
          hasCommonActivity
        );

        const badges = [];
        if (distKm != null && distKm <= 3) badges.push({ label: "Très proche", color: "bg-green-100 text-green-700", icon: "📍" });
        else if (distKm != null && distKm <= 7) badges.push({ label: "Proche", color: "bg-teal-100 text-teal-700", icon: "📍" });
        if (compatScore(selectedDog, dog) >= 75) badges.push({ label: "Compatible", color: "bg-purple-100 text-purple-700", icon: "💜" });
        if (hasCommonActivity) badges.push({ label: "Activité commune", color: "bg-amber-100 text-amber-700", icon: "🏃" });
        if (ownerAnns.length > 0) badges.push({ label: "Disponible", color: "bg-blue-100 text-blue-700", icon: "✅" });

        return { dog, score, distKm, badges, announcement: ownerAnns[0] || null, ownerAnns };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => {
        if (a.distKm !== null && b.distKm !== null) return a.distKm - b.distKm;
        if (a.distKm !== null) return -1;
        if (b.distKm !== null) return 1;
        return b.score - a.score;
      })
      .slice(0, 20);

    setSuggestions(results);
    setComputing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-rose-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rose-50 pb-24">
      <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-600 px-6 py-8 text-white">
        <div className="max-w-2xl mx-auto">
          <Link to={createPageUrl("Home")} className="flex items-center gap-2 text-rose-200 hover:text-white mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black flex items-center gap-2">
                <Heart className="w-7 h-7" /> Matching canin
              </h1>
              <p className="text-rose-200 mt-1">Du plus proche au plus loin</p>
            </div>
            <button
              onClick={computeMatches}
              disabled={computing}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-white ${computing ? "animate-spin" : ""}`} />
            </button>
          </div>

          {userPos ? (
            <div className="mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-full w-fit bg-green-400/30 text-green-100">
              <Navigation className="w-3.5 h-3.5" />
              Position GPS activée — tri par distance précis
            </div>
          ) : (
            <div
              onClick={requestLocation}
              className="mt-3 flex items-center gap-3 bg-white/20 rounded-2xl px-4 py-3 cursor-pointer hover:bg-white/30 transition-colors"
            >
              <div className="text-2xl">📍</div>
              <div>
                <p className="text-sm font-bold text-white">Active ta localisation</p>
                <p className="text-xs text-rose-200">
                  Sans GPS, les chiens sans coordonnées GPS apparaissent en fin de liste. Active ta position pour un tri précis du plus proche au plus loin.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {myDogs.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-rose-100">
            <div className="text-5xl mb-4">🐾</div>
            <p className="font-bold text-stone-700">Ajoutez d'abord un chien</p>
            <p className="text-sm text-stone-400 mt-1 mb-5">Le matching nécessite un profil chien complet</p>
            <Link to={createPageUrl("MyDogs")}>
              <Button className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl gap-2">
                <PawPrint className="w-4 h-4" /> Ajouter mon chien
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {myDogs.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                {myDogs.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDog(d)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${
                      selectedDog?.id === d.id ? "bg-rose-500 text-white border-rose-500" : "bg-white text-stone-600 border-stone-200"
                    }`}
                  >
                    🐶 {d.name}
                  </button>
                ))}
              </div>
            )}

            {computing ? (
              <div className="flex flex-col items-center py-16 gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-rose-400 border-t-transparent" />
                <p className="text-rose-400 font-medium">Calcul des matchs en cours...</p>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-rose-100">
                <div className="text-5xl mb-4">🔍</div>
                <p className="font-bold text-stone-700">Aucun profil trouvé</p>
                <p className="text-sm text-stone-400 mt-1">La communauté grandit, revenez bientôt !</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-stone-500 font-medium">{suggestions.length} suggestions</p>
                {suggestions.map((s, i) => (
                  <MatchCard key={s.dog.id} match={s} rank={i + 1} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}