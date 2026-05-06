import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Search, X, Loader2, MapPin, Users } from "lucide-react";

// Calcul distance Haversine en km
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function FindFriends({ currentUserEmail, onClose }) {
  const [search, setSearch] = useState("");
  const [allProfiles, setAllProfiles] = useState([]);
  const [dogsByOwner, setDogsByOwner] = useState({});
  const [dogPhotoByOwner, setDogPhotoByOwner] = useState({});
  const [loading, setLoading] = useState(false);
  const [friendList, setFriendList] = useState({ friends: [], friend_requests_sent: [] });
  const [addedEmails, setAddedEmails] = useState([]);
  const [myProfile, setMyProfile] = useState(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [profiles, lists, dogs] = await Promise.all([
          base44.entities.UserProfile.list("-created_date", 2000),
          base44.entities.FriendList.filter({ user_email: currentUserEmail }),
          base44.entities.DogProfile.list("-created_date", 1000),
        ]);

        if (lists[0]) {
          setFriendList({
            friends: lists[0].friends || [],
            friend_requests_sent: lists[0].friend_requests_sent || [],
          });
        }

        // Map email → noms de chiens + photo du premier chien
        const map = {};
        const photoMap = {};
        dogs.forEach(d => {
          if (d.created_by) {
            if (!map[d.created_by]) map[d.created_by] = [];
            map[d.created_by].push(d.name);
            if (!photoMap[d.created_by] && d.photo_url) {
              photoMap[d.created_by] = d.photo_url;
            }
          }
        });
        setDogsByOwner(map);
        setDogPhotoByOwner(photoMap);

        // Emails qui ont un UserProfile
        const profileEmails = new Set(profiles.map(p => p.created_by));

        // Créer des profils virtuels pour les propriétaires de chiens SANS UserProfile
        const virtualProfiles = [];
        Object.keys(map).forEach(email => {
          if (!profileEmails.has(email) && email !== currentUserEmail) {
            const dogNames = map[email];
            virtualProfiles.push({
              id: `virtual_${email}`,
              created_by: email,
              pseudo: email.split('@')[0], // pseudo = partie avant @ de l'email
              firstName: null,
              city: null,
              zoneTag: null,
              latitude: null,
              longitude: null,
              photo_url: null,
              _virtual: true, // marqueur pour l'affichage
              _dogNames: dogNames,
            });
          }
        });

        const allProfilesMerged = [...profiles, ...virtualProfiles];
        setAllProfiles(allProfilesMerged);
        setMyProfile(profiles.find(p => p.created_by === currentUserEmail) || null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [currentUserEmail]);

  // Filtre de base : exclure soi-même, amis existants, demandes envoyées, déjà ajoutés
  const eligibleProfiles = useMemo(() => {
    return allProfiles.filter(p => {
      const email = p.created_by;
      if (email === currentUserEmail) return false;
      if (friendList.friends.includes(email)) return false;
      if (friendList.friend_requests_sent.includes(email)) return false;
      if (addedEmails.includes(email)) return false;
      return true;
    });
  }, [allProfiles, friendList, currentUserEmail, addedEmails]);

  // Liste "autour de moi" : 15km si coordonnées dispo, sinon même zoneTag, sinon tous
  const nearbyProfiles = useMemo(() => {
    const myLat = myProfile?.latitude;
    const myLng = myProfile?.longitude;
    const myZone = myProfile?.zoneTag;

    const withDistance = eligibleProfiles.map(p => {
      let distance = null;
      let sameZone = myZone && p.zoneTag && p.zoneTag === myZone;

      if (myLat && myLng && p.latitude && p.longitude) {
        distance = haversineKm(myLat, myLng, p.latitude, p.longitude);
      }
      return { ...p, _distance: distance, _sameZone: sameZone };
    });

    // Priorité 1 : dans les 15km
    const nearby = withDistance.filter(p => p._distance !== null && p._distance <= 15);
    if (nearby.length > 0) {
      return nearby.sort((a, b) => a._distance - b._distance).slice(0, 20);
    }

    // Priorité 2 : même zone
    const sameZone = withDistance.filter(p => p._sameZone);
    if (sameZone.length > 0) {
      return sameZone.slice(0, 20);
    }

    // Fallback : tous les membres
    return withDistance.slice(0, 20);
  }, [eligibleProfiles, myProfile]);

  // Recherche locale
  const searchResults = useMemo(() => {
    if (!search || search.trim().length < 1) return null;
    const q = search.toLowerCase().trim();
    return eligibleProfiles
      .filter(p => {
        const dogs = dogsByOwner[p.created_by] || [];
        return (
          p.pseudo?.toLowerCase().includes(q) ||
          p.firstName?.toLowerCase().includes(q) ||
          p.created_by?.toLowerCase().includes(q) ||
          dogs.some(d => d?.toLowerCase().includes(q))
        );
      })
      .slice(0, 15);
  }, [search, eligibleProfiles, dogsByOwner]);

  // Ce qu'on affiche : résultats de recherche OU liste proche
  const displayList = searchResults !== null ? searchResults : nearbyProfiles;
  const isSearchMode = searchResults !== null;

  const sendFriendRequest = async (targetEmail) => {
    try {
      await base44.functions.invoke("friendActions", { action: "send", targetEmail });
      setAddedEmails(prev => [...prev, targetEmail]);
    } catch (err) {
      console.error(err);
    }
  };

  const getLabel = () => {
    if (isSearchMode) return `${displayList.length} résultat(s) pour « ${search} »`;
    const myLat = myProfile?.latitude;
    const myLng = myProfile?.longitude;
    const myZone = myProfile?.zoneTag;
    if (myLat && myLng) return "Membres à moins de 15 km";
    if (myZone) return `Membres de la zone ${myZone}`;
    return "Tous les membres";
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/40 flex flex-col">
      <div className="mt-auto bg-white rounded-t-3xl w-full max-h-[90vh] flex flex-col">

        {/* Header fixe */}
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-stone-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-black text-stone-800">Trouver des amis</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-stone-400" /></button>
        </div>

        {/* Barre de recherche */}
        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
            <input
              autoFocus
              type="text"
              placeholder="Pseudo, prénom, email ou chien..."
              className="w-full pl-9 pr-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search.length > 0 && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-3">
                <X className="w-4 h-4 text-stone-400" />
              </button>
            )}
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto flex-1 px-4 pb-6">

          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-teal-500" />
            </div>
          )}

          {!loading && (
            <>
              {/* Label contextuel */}
              <div className="flex items-center gap-2 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wide">
                {isSearchMode ? <Search className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                {getLabel()}
              </div>

              {/* Message si vide */}
              {displayList.length === 0 && (
                <div className="text-center py-10 text-stone-400 text-sm">
                  {isSearchMode
                    ? `Aucun résultat pour « ${search} »`
                    : "Aucun membre trouvé dans votre zone"}
                </div>
              )}

              {/* Liste */}
              <div className="space-y-2">
                {displayList.map(p => {
                  const dogs = dogsByOwner[p.created_by] || [];
                  const isAdded = addedEmails.includes(p.created_by);
                  const dist = p._distance != null ? `${Math.round(p._distance)} km` : p.zoneTag || p.city || null;

                  return (
                    <div key={p.id} className="flex items-center justify-between bg-stone-50 p-4 rounded-xl gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {(p.photo_url || dogPhotoByOwner[p.created_by])
                          ? <img src={p.photo_url || dogPhotoByOwner[p.created_by]} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
                          : <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-sm flex-shrink-0">
                              {p.pseudo?.[0]?.toUpperCase() || "?"}
                            </div>
                        }
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-stone-800 text-sm truncate">{p.pseudo}</p>
                            {p._virtual && (
                              <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full flex-shrink-0">Profil incomplet</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {dist && (
                              <span className="flex items-center gap-0.5 text-xs text-stone-400">
                                <MapPin className="w-3 h-3" />{dist}
                              </span>
                            )}
                            {dogs.length > 0 && (
                              <span className="text-xs text-teal-600">🐕 {dogs.join(", ")}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => !isAdded && sendFriendRequest(p.created_by)}
                        disabled={isAdded}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold flex-shrink-0 transition-colors ${
                          isAdded
                            ? "bg-green-100 text-green-600 cursor-default"
                            : "bg-teal-500 hover:bg-teal-600 text-white"
                        }`}
                      >
                        {isAdded ? "✓ Ajouté" : "+ Ajouter"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}