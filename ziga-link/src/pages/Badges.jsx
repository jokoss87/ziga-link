import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { BADGES, getLevelInfo, computeXP, getEarnedBadges, getBadgeProgress } from "@/components/badges/BadgeSystem";
import { ChevronLeft } from "lucide-react";

export default function BadgesPage() {
  const navigate = useNavigate();
  const { user, profile: userProfile } = useUserProfile();
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [sessions, dogs, announcements, activities, friendLists, journals, supports] = await Promise.all([
          base44.entities.ProgressEntry.filter({ created_by: user.email }, "-created_date", 200),
          base44.entities.DogProfile.filter({ created_by: user.email }),
          base44.entities.MeetupAnnouncement.filter({ created_by: user.email }),
          base44.entities.Activity.filter({ created_by: user.email }).catch(() => []),
          base44.entities.FriendList.filter({ user_email: user.email }).catch(() => []),
          base44.entities.ObedienceJournal.filter({ created_by: user.email }, "-created_date", 1).catch(() => []),
          base44.entities.UserSupport.filter({ user_email: user.email }).catch(() => []),
        ]);

        const journal = journals[0] || null;
        const mySupport = supports[0] || null;
        const friendList = friendLists[0] || null;
        const dailyChallengeKeys = journal?.progress
          ? Object.keys(journal.progress).filter(k => k.startsWith("daily_")).length
          : 0;

        setStatsData({
          sessions: sessions.length,
          totalMinutes: sessions.reduce((s, e) => s + (e.duration_minutes || 0), 0),
          sessionTypes: new Set(sessions.map(e => e.session_type)).size,
          meetups: announcements.filter(a => a.status === "completed").length,
          dogs: dogs.length,
          activitiesOrganized: activities.length,
          activitiesJoined: 0,
          profileComplete: !!(userProfile?.pseudo && userProfile?.city),
          balades: sessions.filter(e => e.session_type === "balade").length,
          sportSessions: sessions.filter(e => e.session_type === "sport").length,
          obedienceSessions: sessions.filter(e => e.session_type === "obeissance").length,
          friends: Array.isArray(friendList?.friends) ? friendList.friends.length : 0,
          dailyChallenges: dailyChallengeKeys,
          paymentCount: mySupport?.payment_count || 0,
          totalPaid: mySupport?.total_paid || 0,
          isMonthlySupport: mySupport?.is_monthly === true && mySupport?.status === "soutien_actif",
        });
      } catch (e) {
        console.warn("[Badges] load error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, userProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent" />
      </div>
    );
  }

  const xp = statsData ? computeXP(statsData) : 0;
  const levelInfo = getLevelInfo(xp);
  const earnedBadges = statsData ? getEarnedBadges(statsData) : [];
  const earnedIds = new Set(earnedBadges.map(b => b.id));

  const categories = [...new Set(BADGES.map(b => b.category))];

  return (
    <div className="min-h-screen bg-stone-50 pb-32">

      {/* Header */}
      <div
        className="px-6 pt-10 pb-8 text-white"
        style={{ background: "linear-gradient(135deg, #1a5c3a, #4CAF87, #00d4d4)" }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-white/80 text-sm mb-4 hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>

        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl border border-white/20">
            🏆
          </div>
          <div>
            <h1 className="text-xl font-black">Badges & Récompenses</h1>
            <p className="text-white/80 text-sm">{earnedBadges.length} badge{earnedBadges.length > 1 ? "s" : ""} obtenus · {xp} XP</p>
          </div>
        </div>

        {/* Niveau + barre progression */}
        <div className="bg-white/15 rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{levelInfo.emoji}</span>
              <div>
                <p className="font-bold text-sm">Niveau {levelInfo.level} — {levelInfo.label}</p>
                <p className="text-white/70 text-xs">{xp} XP{levelInfo.next ? ` · ${levelInfo.next.minXp - xp} XP pour le niveau suivant` : " · Niveau maximum !"}</p>
              </div>
            </div>
            {levelInfo.next && (
              <span className="text-white/60 text-xs">{levelInfo.next.emoji}</span>
            )}
          </div>
          {levelInfo.next && (
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all"
                style={{ width: `${levelInfo.progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Badges par catégorie */}
      <div className="px-4 mt-4 space-y-4">
        {categories.map(cat => {
          const catBadges = BADGES.filter(b => b.category === cat);
          const earned = catBadges.filter(b => earnedIds.has(b.id));
          return (
            <div key={cat} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-50 flex items-center justify-between">
                <p className="text-sm font-black text-stone-700 capitalize">{cat}</p>
                <span className="text-xs text-stone-400">{earned.length}/{catBadges.length}</span>
              </div>
              <div className="p-3 space-y-2">
                {catBadges.map(badge => {
                  const isEarned = earnedIds.has(badge.id);
                  return (
                    <div
                      key={badge.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                        isEarned
                          ? "bg-teal-50 border border-teal-100"
                          : "bg-stone-50 border border-stone-100 opacity-50"
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                        isEarned ? "bg-white shadow-sm" : "bg-stone-100"
                      }`}>
                        {isEarned ? badge.emoji : "🔒"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${isEarned ? "text-stone-800" : "text-stone-400"}`}>
                          {isEarned ? badge.label : "???"}
                        </p>
                        <p className={`text-xs truncate ${isEarned ? "text-stone-500" : "text-stone-300"}`}>
                          {isEarned ? badge.desc : (() => {
                            const prog = getBadgeProgress(badge, statsData);
                            if (prog && prog.current >= Math.ceil(prog.target * 0.5)) {
                              return `${prog.current} / ${prog.target} — vous approchez !`;
                            }
                            return "À découvrir...";
                          })()}
                        </p>
                      </div>
                      <div className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full ${
                        isEarned
                          ? "bg-teal-100 text-teal-700"
                          : "bg-stone-100 text-stone-300"
                      }`}>
                        +{badge.xp} XP
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}