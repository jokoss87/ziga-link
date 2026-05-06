import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Search, UserCircle, CheckCircle2, Users, X, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BottomFixedModal from "@/components/ui/BottomFixedModal";

export default function NewConversationModal({ currentUser, currentPseudo, currentPhoto, onClose, onCreated }) {
  const [type, setType] = useState("private");
  const [groupName, setGroupName] = useState("");
  const [pseudoInput, setPseudoInput] = useState("");
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [friendProfiles, setFriendProfiles] = useState([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [allProfiles, setAllProfiles] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!currentUser?.email) return;
    const load = async () => {
      setLoadingFriends(true);
      try {
        const [lists, profiles] = await Promise.all([
          base44.entities.FriendList.filter({ user_email: currentUser.email }).catch(() => []),
          base44.entities.UserProfile.list("-created_date", 500).catch(() => []),
        ]);
        const others = profiles.filter(p => p.created_by !== currentUser.email);
        setAllProfiles(others);
        const friendEmails = lists[0]?.friends || [];
        if (friendEmails.length > 0) {
          const friendMap = {};
          others.forEach(p => { if (p.created_by) friendMap[p.created_by] = p; });
          setFriendProfiles(friendEmails.map(e => friendMap[e]).filter(Boolean));
        } else {
          setFriendProfiles([]);
        }
      } catch (err) {
        console.warn("[NewConversationModal] Erreur:", err);
        setFriendProfiles([]);
      } finally {
        setLoadingFriends(false);
      }
    };
    load();
  }, [currentUser?.email]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = pseudoInput.trim().toLowerCase().replace(/^@/, "");
    if (q.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(() => {
      const filtered = allProfiles
        .filter(p =>
          !members.some(m => m.email === p.created_by) &&
          p.created_by !== currentUser?.email &&
          (p.pseudo?.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q))
        )
        .slice(0, 6);
      setSuggestions(filtered);
      setShowSuggestions(true);
    }, 150);
    return () => clearTimeout(debounceRef.current);
  }, [pseudoInput, allProfiles, members, currentUser?.email]);

  const addMember = (profile) => {
    if (members.some(m => m.email === profile.created_by)) return;
    setMembers(m => [...m, { email: profile.created_by, pseudo: profile.pseudo, photo: profile.photo_url || "" }]);
  };

  const removeMember = (email) => setMembers(prev => prev.filter(m => m.email !== email));

  const selectSuggestion = (profile) => {
    addMember(profile);
    setPseudoInput("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleCreate = async () => {
    if (members.length === 0 || !currentUser?.email) return;
    setSaving(true);
    setErrorMsg("");
    try {
      // Vérification doublons côté client — plus fiable que filter()
      const allConvs = await base44.entities.Conversation.list("-last_message_at", 200).catch(() => []);

      if (type === "private" && members.length === 1) {
        const existing = allConvs.find(c =>
          c.type === "private" &&
          c.members?.includes(currentUser.email) &&
          c.members?.includes(members[0].email)
        );
        if (existing) {
          onCreated(existing.id);
          setSaving(false);
          return;
        }
      }

      const conv = await base44.entities.Conversation.create({
        name: type === "group" ? groupName : "",
        type,
        members: [currentUser.email, ...members.map(m => m.email)],
        member_pseudos: [currentPseudo || "", ...members.map(m => m.pseudo)],
        member_photos: [currentPhoto || "", ...members.map(m => m.photo)],
        created_by_pseudo: currentPseudo || "",
        last_message_at: new Date().toISOString(),
      });

      // Vérification explicite avant d'appeler onCreated
      if (!conv?.id) throw new Error("Conversation créée sans ID");
      onCreated(conv.id);

    } catch (err) {
      console.error("[NewConversationModal] Erreur création:", err);
      setErrorMsg("Impossible de créer la conversation. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  const filteredFriends = friendProfiles.filter(p =>
    !friendSearch || p.pseudo?.toLowerCase().includes(friendSearch.toLowerCase())
  );

  const canCreate = members.length > 0 && (type !== "group" || groupName.trim());

  if (!currentUser) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-400 border-t-transparent mx-auto" />
        </div>
      </div>
    );
  }

  const footerContent = members.length > 0 ? (
    <div className="space-y-2">
      {type === "group" && !groupName.trim() && (
        <p className="text-xs text-amber-600 text-center">⚠️ Donnez un nom à votre groupe</p>
      )}
      <div className="flex flex-wrap gap-2 mb-1">
        {members.map(m => (
          <span key={m.email} className="flex items-center gap-1.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-full pl-2 pr-1 py-1 text-xs font-medium">
            {m.photo ? <img src={m.photo} className="w-4 h-4 rounded-full object-cover" alt="" /> : <UserCircle className="w-4 h-4 text-teal-400" />}
            {m.pseudo}
            <button onClick={() => removeMember(m.email)} className="w-4 h-4 rounded-full bg-teal-100 hover:bg-red-100 text-teal-500 hover:text-red-500 flex items-center justify-center transition-colors">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
      </div>
      <button
        onClick={handleCreate}
        disabled={saving || !canCreate}
        className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-95"
        style={{ background: canCreate ? "linear-gradient(135deg, #4CAF87, #3d9e78)" : "#d1d5db" }}
      >
        <span>{saving ? "Création en cours..." : `Démarrer avec ${members.length > 1 ? members.length + " personnes" : members[0]?.pseudo} 🐾`}</span>
      </button>
    </div>
  ) : null;

  return (
    <BottomFixedModal
      title="Nouvelle conversation"
      onClose={onClose}
      footer={footerContent}
    >
      <div className="px-5 py-5 space-y-5">

        {/* Message d'erreur visible */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg("")} className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Type selector */}
        <div className="flex rounded-xl overflow-hidden border border-stone-200">
          {[
            { v: "private", label: "💬 Privée", desc: "1 contre 1" },
            { v: "group", label: "👥 Groupe", desc: "Plusieurs membres" }
          ].map(({ v, label, desc }) => (
            <button
              key={v}
              onClick={() => setType(v)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${type === v ? "bg-teal-500 text-white" : "bg-white text-stone-600 hover:bg-stone-50"}`}
            >
              {label}<br />
              <span className={`text-xs font-normal ${type === v ? "text-teal-100" : "text-stone-400"}`}>{desc}</span>
            </button>
          ))}
        </div>

        {/* Group name */}
        {type === "group" && (
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">Nom du groupe</label>
            <Input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Ex: Groupe balade Lyon" className="border-stone-200" />
          </div>
        )}

        {/* Trouver un utilisateur */}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
            <Search className="w-4 h-4 text-teal-500" /> Trouver un utilisateur
          </label>
          <div className="relative">
            <Input
              value={pseudoInput}
              onChange={e => setPseudoInput(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Tapez un pseudo ou une ville..."
              className="border-stone-200 pr-8"
            />
            {pseudoInput && (
              <button className="absolute right-2 top-1/2 -translate-y-1/2" onMouseDown={() => { setPseudoInput(""); setSuggestions([]); setShowSuggestions(false); }}>
                <X className="w-4 h-4 text-stone-400" />
              </button>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden">
                {suggestions.map(p => (
                  <button
                    key={p.id}
                    onMouseDown={() => selectSuggestion(p)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-teal-50 text-left transition-colors"
                  >
                    {p.photo_url
                      ? <img src={p.photo_url} className="w-7 h-7 rounded-full object-cover flex-shrink-0" alt="" />
                      : <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0"><UserCircle className="w-5 h-5 text-stone-300" /></div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-700 truncate">{p.pseudo}</p>
                      {p.city && <p className="text-xs text-stone-400 truncate">📍 {p.city}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {showSuggestions && pseudoInput.trim().length >= 2 && suggestions.length === 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg px-4 py-3 text-sm text-stone-400 text-center">
                Aucun utilisateur trouvé
              </div>
            )}
          </div>
        </div>

        {/* Friends list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-stone-700 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-teal-500" /> Mes amis
            </label>
            {friendProfiles.length > 0 && (
              <span className="text-xs text-stone-400">{friendProfiles.length} ami{friendProfiles.length > 1 ? "s" : ""}</span>
            )}
          </div>
          {loadingFriends ? (
            <div className="flex items-center gap-2 py-4 text-stone-400 text-sm">
              <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
              Chargement de vos amis…
            </div>
          ) : friendProfiles.length === 0 ? (
            <div className="bg-stone-50 border border-dashed border-stone-200 rounded-2xl p-5 text-center">
              <div className="text-3xl mb-2">🐾</div>
              <p className="text-sm font-semibold text-stone-600 mb-1">Vous n'avez pas encore d'amis</p>
              <p className="text-xs text-stone-400 mb-4">Ajoutez des amis pour les retrouver ici</p>
              <Link to={createPageUrl("Friends")} onClick={onClose}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}>
                <Users className="w-4 h-4" /> Trouver des amis
              </Link>
            </div>
          ) : (
            <>
              {friendProfiles.length > 5 && (
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                  <Input value={friendSearch} onChange={e => setFriendSearch(e.target.value)} placeholder="Filtrer mes amis..." className="pl-8 h-8 text-xs border-stone-200" />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                {filteredFriends.map(p => {
                  const isAdded = members.some(m => m.email === p.created_by);
                  return (
                    <button key={p.id} onClick={() => isAdded ? removeMember(p.created_by) : addMember(p)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left w-full ${
                        isAdded ? "bg-teal-50 border-teal-300 text-teal-700" : "bg-white border-stone-200 text-stone-700 hover:border-teal-300 hover:bg-teal-50/50"
                      }`}>
                      {p.photo_url
                        ? <img src={p.photo_url} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />
                        : <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0"><UserCircle className="w-5 h-5 text-stone-300" /></div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{p.pseudo}</p>
                        {p.city && <p className="text-xs text-stone-400 truncate">📍 {p.city}</p>}
                      </div>
                      {isAdded && <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />}
                    </button>
                  );
                })}
                {filteredFriends.length === 0 && (
                  <p className="text-xs text-stone-400 text-center py-2">Aucun ami trouvé</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="h-4" />
      </div>
    </BottomFixedModal>
  );
}