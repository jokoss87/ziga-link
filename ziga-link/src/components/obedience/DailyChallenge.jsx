import { useState, useEffect } from "react";
import { Zap, CheckCircle2, Lock, ChevronRight } from "lucide-react";
import { OBEDIENCE_CATALOG } from "./obedienceCatalog";

// Génère un défi quotidien déterministe basé sur la date + progression
function getDailyChallenge(progress) {
  const dayIndex = Math.floor(Date.now() / 86400000); // Jour unique

  // Trouve les ordres en cours (niveau > 0 mais < 5) ou non commencés
  const available = [];
  for (const theme of OBEDIENCE_CATALOG) {
    for (const order of theme.orders) {
      const lvl = progress[order.id] || 0;
      if (lvl < 5) {
        available.push({ order, theme, currentLevel: lvl });
      }
    }
  }
  if (!available.length) return null;

  // Priorité aux ordres en cours, sinon premier non commencé
  const inProgress = available.filter(a => a.currentLevel > 0);
  const pool = inProgress.length ? inProgress : available;
  const pick = pool[dayIndex % pool.length];

  const nextLevel = pick.order.levels[pick.currentLevel];
  return {
    theme: pick.theme,
    order: pick.order,
    currentLevel: pick.currentLevel,
    nextLevel,
  };
}

export default function DailyChallenge({ progress, onValidate, saving }) {
  const challenge = getDailyChallenge(progress);
  const todayKey = new Date().toISOString().slice(0, 10);
  const alreadyDone = progress[`daily_${challenge?.order?.id}_${todayKey}`];

  if (!challenge) {
    return (
      <div className="bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl p-5 text-white text-center">
        <div className="text-4xl mb-2">🏆</div>
        <div className="font-black text-lg">Félicitations !</div>
        <div className="text-violet-200 text-sm">Tous les ordres sont maîtrisés !</div>
      </div>
    );
  }

  const { theme, order, currentLevel, nextLevel } = challenge;

  return (
    <div className="bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-yellow-300" />
        <span className="text-xs font-bold text-violet-200 uppercase tracking-wide">Défi du jour</span>
        <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full">{theme.emoji} {theme.theme}</span>
      </div>

      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
          {currentLevel > 0 ? "🔥" : "🌱"}
        </div>
        <div className="flex-1">
          <div className="font-black text-lg leading-tight">{order.name}</div>
          <div className="text-violet-200 text-xs mb-1">Niveau {nextLevel.level} / 5</div>
          <div className="text-sm font-semibold">{nextLevel.objective}</div>
          <div className="text-violet-200 text-xs mt-1">{nextLevel.criteria}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-yellow-300 font-black text-lg">+{nextLevel.xp}</div>
          <div className="text-violet-300 text-xs">XP</div>
        </div>
      </div>

      {/* Barre progression niveaux */}
      <div className="flex gap-1 mb-4">
        {[1,2,3,4,5].map(l => (
          <div
            key={l}
            className={`flex-1 h-1.5 rounded-full ${l <= currentLevel ? "bg-yellow-300" : "bg-white/20"}`}
          />
        ))}
      </div>

      {alreadyDone ? (
        <div className="flex items-center justify-center gap-2 bg-white/20 rounded-xl py-3">
          <CheckCircle2 className="w-5 h-5 text-green-300" />
          <span className="font-bold text-sm">Défi validé aujourd'hui !</span>
        </div>
      ) : currentLevel < 5 ? (
        <button
          onClick={() => onValidate(order.id, currentLevel + 1, `daily_${order.id}_${todayKey}`)}
          disabled={saving}
          className="w-full bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-black rounded-xl py-3 text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? "Validation..." : <>✓ Marquer comme réussi aujourd'hui <ChevronRight className="w-4 h-4" /></>}
        </button>
      ) : (
        <div className="flex items-center justify-center gap-2 bg-white/20 rounded-xl py-3">
          <CheckCircle2 className="w-5 h-5 text-green-300" />
          <span className="font-bold text-sm">Ordre maîtrisé !</span>
        </div>
      )}
    </div>
  );
}