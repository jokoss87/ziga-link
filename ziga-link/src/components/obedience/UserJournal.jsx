import { useState } from "react";
import { OBEDIENCE_CATALOG, XP_THRESHOLDS, getDogLevel, computeProgress } from "./obedienceCatalog";
import { ChevronDown, ChevronUp, Lock, CheckCircle2, Star, Award } from "lucide-react";

const THEME_COLORS = {
  teal:   { bg: "bg-teal-50",   border: "border-teal-200",   badge: "bg-teal-100 text-teal-700",   btn: "bg-teal-500 hover:bg-teal-600",   dot: "bg-teal-500" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-200", badge: "bg-indigo-100 text-indigo-700", btn: "bg-indigo-500 hover:bg-indigo-600", dot: "bg-indigo-500" },
  green:  { bg: "bg-green-50",  border: "border-green-200",  badge: "bg-green-100 text-green-700",  btn: "bg-green-500 hover:bg-green-600",  dot: "bg-green-500" },
  amber:  { bg: "bg-amber-50",  border: "border-amber-200",  badge: "bg-amber-100 text-amber-700",  btn: "bg-amber-500 hover:bg-amber-600",  dot: "bg-amber-500" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", badge: "bg-purple-100 text-purple-700", btn: "bg-purple-500 hover:bg-purple-600", dot: "bg-purple-500" },
};

function OrderRow({ order, currentLevel, themeColor, onSetLevel, saving }) {
  const [open, setOpen] = useState(false);
  const col = THEME_COLORS[themeColor] || THEME_COLORS.teal;

  return (
    <div className={`rounded-xl border ${col.border} overflow-hidden mb-2`}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 ${col.bg} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[1,2,3,4,5].map(l => (
              <div key={l} className={`w-3 h-3 rounded-full border ${currentLevel >= l ? `${col.dot} border-transparent` : "bg-white border-stone-300"}`} />
            ))}
          </div>
          <span className="font-semibold text-sm text-stone-800">{order.name}</span>
          {currentLevel >= 5 && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${col.badge}`}>{order.badge}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">{currentLevel}/5</span>
          {open ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
        </div>
      </button>

      {open && (
        <div className="bg-white px-4 py-3 space-y-2">
          {order.levels.map((lvl) => {
            const done = currentLevel >= lvl.level;
            const isCurrent = currentLevel === lvl.level - 1;
            return (
              <div key={lvl.level} className={`flex items-start gap-3 p-3 rounded-lg border ${
                done ? "border-violet-200 bg-violet-50" :
                isCurrent ? "border-amber-300 bg-amber-50" :
                "border-stone-100 bg-stone-50 opacity-60"
              }`}>
                <div className="flex-shrink-0 mt-0.5">
                  {done ? <CheckCircle2 className="w-4 h-4 text-violet-500" /> :
                   isCurrent ? <Star className="w-4 h-4 text-amber-400" /> :
                   <Lock className="w-4 h-4 text-stone-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-bold ${done ? "text-violet-600" : isCurrent ? "text-amber-600" : "text-stone-400"}`}>
                      Niveau {lvl.level}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${done ? "bg-violet-100 text-violet-700" : "bg-stone-100 text-stone-500"}`}>
                      +{lvl.xp} XP
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-stone-700">{lvl.objective}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{lvl.criteria}</p>
                </div>
                {isCurrent && (
                  <button
                    onClick={() => onSetLevel(order.id, lvl.level)}
                    disabled={saving}
                    className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg text-white bg-violet-500 hover:bg-violet-600 transition-colors disabled:opacity-50"
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

function ThemeSection({ theme, progress, onSetLevel, saving }) {
  const [open, setOpen] = useState(false);
  const col = THEME_COLORS[theme.color] || THEME_COLORS.teal;
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
          <div className="w-20 bg-stone-200 rounded-full h-1.5 hidden sm:block">
            <div className={`h-1.5 rounded-full transition-all ${themeComplete ? col.dot : "bg-violet-400"}`} style={{ width: `${pct}%` }} />
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
              saving={saving}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function UserJournal({ journal, onSetLevel, saving }) {
  const progress = journal?.progress || {};
  const { xpTotal, badges, dogLevel } = computeProgress(journal || {});

  const curr = XP_THRESHOLDS.find(t => t.level === dogLevel.level);
  const next = XP_THRESHOLDS.find(t => t.level === dogLevel.level + 1);
  const pct = next ? Math.round(((xpTotal - curr.min) / (next.min - curr.min)) * 100) : 100;

  return (
    <div>
      {/* Stats card */}
      <div className="bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl p-5 text-white mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-2xl font-black">{dogLevel.emoji} {dogLevel.label}</div>
            <div className="text-violet-200 text-xs">Niveau {dogLevel.level} · {xpTotal} XP total</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-violet-300">{badges.length} badge{badges.length > 1 ? "s" : ""}</div>
          </div>
        </div>
        {next ? (
          <>
            <div className="flex justify-between text-xs text-violet-300 mb-1">
              <span>{xpTotal} XP</span>
              <span>Prochain : {next.min} XP</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full">
              <div className="h-2 bg-yellow-300 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </>
        ) : (
          <div className="text-yellow-300 font-bold text-sm">🏆 Niveau maximum atteint !</div>
        )}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {badges.slice(0, 4).map(b => (
              <span key={b} className="text-xs bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Award className="w-3 h-3 text-yellow-300" /> {b}
              </span>
            ))}
            {badges.length > 4 && <span className="text-xs text-violet-300">+{badges.length - 4} autres</span>}
          </div>
        )}
      </div>

      {/* Thèmes */}
      {OBEDIENCE_CATALOG.map(theme => (
        <ThemeSection
          key={theme.id}
          theme={theme}
          progress={progress}
          onSetLevel={onSetLevel}
          saving={saving}
        />
      ))}
    </div>
  );
}