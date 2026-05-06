import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Search, UserPlus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import BottomFixedModal from "@/components/ui/BottomFixedModal";

// ── Tolérance aux fautes — distance de Levenshtein ───────────────────────────
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function matchesFuzzy(text, query) {
  if (!text || !query) return false;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t.includes(q)) return true;
  const tolerance = q.length < 5 ? 1 : 2;
  for (let i = 0; i <= t.length - q.length; i++) {
    if (levenshtein(t.slice(i, i + q.length), q) <= tolerance) return true;
  }
  return false;
}
// ─────────────────────────────────────────────────────────────────────────────

export default function SearchUserModal({ currentUser, currentPseudo, onClose, onSelectUser }) {
  const [query, setQuery] = useState("");
  const [allProfiles, setAllProfiles] = useState([]);
  const [dogsByOwner, setDogsByOwner] = useState({});
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [profiles, dogs] = await Promise.all([
          base44.entities.UserProfile.list("-created_date", 500).catch(() => []),
          base44.entities.DogProfile.list("-created_date", 1000).catch(() => []),
        ]);
        const map = {};
        dogs.forEach(d => {
          if (!d.created_by) return;
          if (!map[d.created_by]) map[d.created_by] = [];
          map[d.created_by].push(d.name);
        });
        setDogsByOwner(map);
        setAllProfiles(profiles.filter(p => p.created_by !== currentUser?.email));
      } catch (err) {
        console.warn("[SearchUserModal] Erreur chargement:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser?.email]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(() => {
      const q = query.trim();
      const filtered = allProfiles
        .filter(p => {
          const dogs = dogsByOwner[p.created_by] || [];
          return matchesFuzzy(p.pseudo, q) || matchesFuzzy(p.city, q) || dogs.some(d => matchesFuzzy(d, q));
        })
        .sort((a, b) => {
          const aExact = a.pseudo?.toLowerCase().includes(q.toLowerCase()) ? 0 : 1;
          const bExact = b.pseudo?.toLowerCase().includes(q.toLowerCase()) ? 0 : 1;
          return aExact - bExact;
        })
        .slice(0, 10);
      setResults(filtered);
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query, allProfiles, dogsByOwner]);

  return (
    <BottomFixedModal
      title="Trouver un utilisateur"
      onClose={onClose}
      zIndex="z-[60]"
    >
      <div className="px-5 py-4 space-y-4">
        {/* Barre de recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Pseudo, ville ou nom du chien..."
            className="pl-9 border-stone-200"
            autoFocus
          />
          {query.length > 0 && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-stone-400" />
            </button>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-6 text-stone-400 text-sm justify-center">
            <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
            Chargement...
          </div>
        )}

        {!loading && query.trim().length < 2 && (
          <div className="text-center py-8 text-stone-400 text-sm space-y-1">
            <div className="text-3xl mb-2">🔍</div>
            <p className="font-medium text-stone-500">Tapez au moins 2 caractères</p>
            <p className="text-xs">Recherchez par pseudo, ville ou nom du chien</p>
          </div>
        )}

        {!loading && query.trim().length >= 2 && results.length === 0 && (
          <div className="text-center py-8 text-stone-400 text-sm space-y-1">
            <div className="text-3xl mb-2">😕</div>
            <p className="font-medium text-stone-500">Aucun résultat pour "{query}"</p>
            <p className="text-xs">Essayez avec le nom du chien ou la ville</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-stone-400 font-medium">
              {results.length} résultat{results.length > 1 ? "s" : ""}
            </p>
            {results.map(profile => {
              const dogs = dogsByOwner[profile.created_by] || [];
              return (
                <button
                  key={profile.id}
                  onClick={() => onSelectUser(profile)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-teal-50 active:bg-teal-100 transition-colors text-left border border-transparent hover:border-teal-100"
                >
                  {profile.photo_url ? (
                    <img src={profile.photo_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center font-bold text-teal-600 flex-shrink-0 text-sm">
                      {profile.pseudo?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-800 text-sm truncate">{profile.pseudo}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      {profile.city && <span className="text-xs text-stone-400 truncate">📍 {profile.city}</span>}
                      {dogs.length > 0 && <span className="text-xs text-teal-600 truncate">🐕 {dogs.join(", ")}</span>}
                    </div>
                  </div>
                  <UserPlus className="w-4 h-4 text-teal-400 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}

        <div className="h-2" />
      </div>
    </BottomFixedModal>
  );
}