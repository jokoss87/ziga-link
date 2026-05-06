import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronRight } from "lucide-react";

export default function ChallengeWidget({ progressEntries }) {
  const sessionCount = progressEntries?.length || 0;
  const xp = sessionCount * 25;

  const BADGES = [
  { name: "Débutant", threshold: 1, emoji: "🌱" },
  { name: "Actif", threshold: 3, emoji: "🌿" },
  { name: "Explorateur", threshold: 5, emoji: "🧭" },
  { name: "Habitué", threshold: 10, emoji: "⭐" },
  { name: "Passionné", threshold: 20, emoji: "🔥" },
  { name: "Expert", threshold: 50, emoji: "🏆" }];


  const earned = BADGES.filter((b) => sessionCount >= b.threshold);
  const current = earned[earned.length - 1] || null;
  const next = BADGES.find((b) => sessionCount < b.threshold);
  const progress = next ? Math.round(sessionCount / next.threshold * 100) : 100;
  const remaining = next ? next.threshold - sessionCount : 0;

  return null;
















































































}