import { Footprints, MapPin, Clock, Users, Award } from "lucide-react";

export default function DogJournalStats({ entries }) {
  const totalMinutes = entries.reduce((s, e) => s + (e.duration_minutes || 0), 0);
  const totalKm = (entries.reduce((s, e) => {
    // Extraire distance des notes si possible
    const match = e.notes?.match(/Distance\s*:\s*([\d.]+)\s*km/i);
    return s + (match ? parseFloat(match[1]) : 0);
  }, 0)).toFixed(1);

  const walkEntries = entries.filter(e => e.session_type === "balade");
  const trainingEntries = entries.filter(e => ["obeissance", "sport", "randonnee"].includes(e.session_type));

  const moodCounts = entries.reduce((acc, e) => {
    if (e.mood) acc[e.mood] = (acc[e.mood] || 0) + 1;
    return acc;
  }, {});
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];

  const stats = [
    { icon: "🐾", label: "Balades", value: walkEntries.length, color: "text-teal-600", bg: "bg-teal-50" },
    { icon: "📍", label: "Km parcourus", value: `${totalKm} km`, color: "text-emerald-600", bg: "bg-emerald-50" },
    { icon: "⏱️", label: "Temps total", value: totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h${totalMinutes % 60 > 0 ? (totalMinutes % 60) + "m" : ""}` : `${totalMinutes}m`, color: "text-purple-600", bg: "bg-purple-50" },
    { icon: "🎓", label: "Entraînements", value: trainingEntries.length, color: "text-indigo-600", bg: "bg-indigo-50" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {stats.map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-3.5 flex items-center gap-3`}>
            <span className="text-xl">{s.icon}</span>
            <div>
              <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-stone-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {topMood && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 flex items-center gap-3">
          <span className="text-2xl">{topMood[0] === "excellent" ? "😄" : topMood[0] === "bien" ? "🙂" : topMood[0] === "moyen" ? "😐" : "😔"}</span>
          <div>
            <p className="text-xs font-bold text-amber-800">Humeur dominante : {topMood[0]}</p>
            <p className="text-[11px] text-amber-600">{topMood[1]} séances sur {entries.length}</p>
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div className="text-center py-6">
          <div className="text-3xl mb-2">📊</div>
          <p className="text-sm text-stone-400">Commencez à enregistrer pour voir vos stats !</p>
        </div>
      )}
    </div>
  );
}