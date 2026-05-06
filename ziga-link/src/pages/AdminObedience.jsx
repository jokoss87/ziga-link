import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { OBEDIENCE_CATALOG, XP_THRESHOLDS, getDogLevel, computeProgress } from "@/components/obedience/obedienceCatalog";
import { ChevronDown, ChevronUp, Lock, CheckCircle2, Star, Award, Dog } from "lucide-react";

const THEME_COLORS = {
  teal: { bg: "bg-teal-50", border: "border-teal-200", badge: "bg-teal-100 text-teal-700", btn: "bg-teal-500 hover:bg-teal-600", text: "text-teal-700" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-200", badge: "bg-indigo-100 text-indigo-700", btn: "bg-indigo-500 hover:bg-indigo-600", text: "text-indigo-700" },
  green: { bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-700", btn: "bg-green-500 hover:bg-green-600", text: "text-green-700" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", btn: "bg-amber-500 hover:bg-amber-600", text: "text-amber-700" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", badge: "bg-purple-100 text-purple-700", btn: "bg-purple-500 hover:bg-purple-600", text: "text-purple-700" },
};

function LevelDot({ filled, locked }) {
  if (locked) return <div className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center"><Lock className="w-2.5 h-2.5 text-stone-400" /></div>;
  if (filled) return <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center"><CheckCircle2 className="w-3 h-3 text-white" /></div>;
  return <div className="w-5 h-5 rounded-full border-2 border-stone-300 bg-white" />;
}

function OrderRow({ order, currentLevel, themeColor, onSetLevel }) {
  const [open, setOpen] = useState(false);
  const col = THEME_COLORS[themeColor];
  const allDone = currentLevel >= 5;

  return (
    <div className={`rounded-xl border ${col.border} overflow-hidden mb-2`}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 ${col.bg} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[1,2,3,4,5].map(l => (
              <LevelDot key={l} filled={currentLevel >= l} locked={currentLevel < l - 1 && currentLevel !== l - 1 && false} />
            ))}
          </div>
          <span className="font-semibold text-sm text-stone-800">{order.name}</span>
          {allDone && <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${col.badge}`}>{order.badge}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">Niv. {currentLevel}/5</span>
          {open ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
        </div>
      </button>

      {open && (
        <div className="bg-white px-4 py-3 space-y-2">
          {order.levels.map((lvl) => {
            const done = currentLevel >= lvl.level;
            const unlocked = currentLevel >= lvl.level - 1;
            const isCurrent = currentLevel === lvl.level - 1;
            return (
              <div
                key={lvl.level}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                  done ? "border-teal-200 bg-teal-50" :
                  isCurrent ? "border-amber-300 bg-amber-50" :
                  "border-stone-100 bg-stone-50 opacity-60"
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {done ? <CheckCircle2 className="w-4 h-4 text-teal-500" /> :
                   isCurrent ? <Star className="w-4 h-4 text-amber-400" /> :
                   <Lock className="w-4 h-4 text-stone-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-bold ${done ? "text-teal-600" : isCurrent ? "text-amber-600" : "text-stone-400"}`}>
                      Niveau {lvl.level}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${done ? "bg-teal-100 text-teal-700" : "bg-stone-100 text-stone-500"}`}>
                      +{lvl.xp} XP
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-stone-700">{lvl.objective}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{lvl.criteria}</p>
                </div>
                {isCurrent && (
                  <button
                    onClick={() => onSetLevel(order.id, lvl.level)}
                    className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg text-white ${col.btn} transition-colors`}
                  >
                    Valider ✓
                  </button>
                )}
                {done && currentLevel === lvl.level && (
                  <button
                    onClick={() => onSetLevel(order.id, lvl.level - 1)}
                    className="flex-shrink-0 text-xs text-stone-400 underline"
                  >
                    Annuler
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ThemeSection({ theme, progress, onSetLevel }) {
  const [open, setOpen] = useState(true);
  const col = THEME_COLORS[theme.color];
  const totalLevels = theme.orders.length * 5;
  const completedLevels = theme.orders.reduce((s, o) => s + (progress[o.id] || 0), 0);
  const pct = Math.round((completedLevels / totalLevels) * 100);
  const themeComplete = completedLevels === totalLevels;

  return (
    <div className={`rounded-2xl border ${col.border} overflow-hidden mb-4`}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-5 py-4 ${col.bg}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{theme.emoji}</span>
          <div className="text-left">
            <div className="font-bold text-stone-800 text-sm">{theme.theme}</div>
            <div className="text-xs text-stone-500">{theme.orders.length} ordres · {completedLevels}/{totalLevels} niveaux</div>
          </div>
          {themeComplete && <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${col.badge}`}>{theme.badge}</span>}
        </div>
        <div className="flex items-center gap-3">
          <div className="w-24 bg-stone-200 rounded-full h-2 hidden sm:block">
            <div className={`h-2 rounded-full transition-all ${themeComplete ? "bg-teal-500" : "bg-amber-400"}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-stone-500">{pct}%</span>
          {open ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
        </div>
      </button>
      {open && (
        <div className="p-4 bg-white">
          {theme.orders.map(order => (
            <OrderRow
              key={order.id}
              order={order}
              currentLevel={progress[order.id] || 0}
              themeColor={theme.color}
              onSetLevel={onSetLevel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminObedience() {
  const { user } = useUserProfile();
  const [dogs, setDogs] = useState([]);
  const [journals, setJournals] = useState([]);
  const [selectedDogId, setSelectedDogId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [localProgress, setLocalProgress] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      if (user.role !== "admin") { setLoading(false); return; }
      const [dogsData, journalsData] = await Promise.all([
        base44.entities.DogProfile.list("-created_date", 100),
        base44.entities.ObedienceJournal.list("-last_updated", 200),
      ]);
      setDogs(dogsData);
      setJournals(journalsData);
      setLoading(false);
    })();
  }, [user?.email]);

  const selectDog = (dogId) => {
    setSelectedDogId(dogId);
    const journal = journals.find(j => j.dog_id === dogId);
    setLocalProgress(journal?.progress || {});
  };

  const handleSetLevel = async (orderId, level) => {
    const newProgress = { ...localProgress, [orderId]: level };
    setLocalProgress(newProgress);
    const { xpTotal, badges } = computeProgress({ progress: newProgress });
    const { level: dogLevel } = getDogLevel(xpTotal);
    setSaving(true);

    const dog = dogs.find(d => d.id === selectedDogId);
    const existing = journals.find(j => j.dog_id === selectedDogId);
    const data = {
      dog_id: selectedDogId,
      dog_name: dog?.name || "",
      owner_id: dog?.created_by || "",
      progress: newProgress,
      xp_total: xpTotal,
      dog_level: dogLevel,
      badges,
      last_updated: new Date().toISOString(),
    };

    if (existing) {
      const updated = await base44.entities.ObedienceJournal.update(existing.id, data);
      setJournals(js => js.map(j => j.id === existing.id ? updated : j));
    } else {
      const created = await base44.entities.ObedienceJournal.create(data);
      setJournals(js => [...js, created]);
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-400 border-t-transparent" />
    </div>
  );

  // Utilisateur non-admin : redirige vers la page Obéissance utilisateur
  if (!user || user.role !== "admin") return (
    <div className="min-h-screen bg-violet-50 flex flex-col items-center justify-center gap-4 px-6">
      <div className="text-5xl">📚</div>
      <div className="text-center">
        <h2 className="text-xl font-black text-stone-800 mb-2">Journal d'obéissance</h2>
        <p className="text-stone-500 text-sm mb-6">Cette interface est réservée aux administrateurs.</p>
        <Link
          to={createPageUrl("Obeissance")}
          className="inline-block bg-violet-600 text-white font-bold px-6 py-3 rounded-2xl text-sm hover:bg-violet-700 transition-colors"
        >
          Voir mon journal →
        </Link>
      </div>
    </div>
  );

  const selectedJournal = journals.find(j => j.dog_id === selectedDogId);
  const { xpTotal, badges, dogLevel } = computeProgress({ progress: localProgress });

  return (
    <div className="min-h-screen bg-stone-50 p-4 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-stone-800">📋 Journal d'obéissance</h1>
        <p className="text-stone-400 text-sm">Interface admin · Progression gamifiée par chien</p>
      </div>

      {/* Sélecteur de chien */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-5">
        <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Choisir un chien</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {dogs.map(dog => (
            <button
              key={dog.id}
              onClick={() => selectDog(dog.id)}
              className={`text-left px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                selectedDogId === dog.id
                  ? "border-teal-500 bg-teal-50 text-teal-700"
                  : "border-stone-200 bg-stone-50 text-stone-600 hover:border-teal-300"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Dog className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{dog.name}</span>
              </div>
              <div className="text-stone-400 font-normal truncate">{dog.breed}</div>
            </button>
          ))}
          {dogs.length === 0 && <p className="text-stone-400 text-xs col-span-3">Aucun chien enregistré.</p>}
        </div>
      </div>

      {selectedDogId && (
        <>
          {/* Stats du chien */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-lg font-black text-stone-800">{dogLevel.emoji} {dogLevel.label}</div>
                <div className="text-xs text-stone-400">Niveau {dogLevel.level} · {xpTotal} XP</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {saving && <div className="text-xs text-amber-500 animate-pulse">Sauvegarde...</div>}
                <div className="text-xs text-stone-400">{badges.length} badge{badges.length > 1 ? "s" : ""}</div>
              </div>
            </div>
            {/* Barre XP */}
            {(() => {
              const curr = XP_THRESHOLDS.find(t => t.level === dogLevel.level);
              const next = XP_THRESHOLDS.find(t => t.level === dogLevel.level + 1);
              if (!next) return <div className="text-xs text-teal-600 font-bold">🏆 Niveau maximum atteint !</div>;
              const pct = Math.round(((xpTotal - curr.min) / (next.min - curr.min)) * 100);
              return (
                <div>
                  <div className="flex justify-between text-xs text-stone-400 mb-1">
                    <span>{xpTotal} XP</span><span>Prochain niv. : {next.min} XP</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full"><div className="h-2 bg-teal-400 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })()}
            {/* Badges */}
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {badges.map(b => (
                  <span key={b} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <Award className="w-3 h-3" /> {b}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Thèmes */}
          {OBEDIENCE_CATALOG.map(theme => (
            <ThemeSection
              key={theme.id}
              theme={theme}
              progress={localProgress}
              onSetLevel={handleSetLevel}
            />
          ))}
        </>
      )}
    </div>
  );
}