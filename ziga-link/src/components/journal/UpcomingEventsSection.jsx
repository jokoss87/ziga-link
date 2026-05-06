import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { parseUTC } from "@/components/lib/dateUtils";
import { fr } from "date-fns/locale";

const EVENT_TYPE_CONFIG = {
  meetup: { emoji: "🐾", label: "Balade", color: "#f97316" },
  canicross: { emoji: "🏃", label: "Canicross", color: "#3b82f6" },
  cani_vtt: { emoji: "🚴", label: "Cani-VTT", color: "#3b82f6" },
  randonnee: { emoji: "🥾", label: "Randonnée", color: "#22c55e" },
  agility: { emoji: "🏅", label: "Agility", color: "#f97316" },
  frisbee: { emoji: "🥏", label: "Frisbee", color: "#f97316" },
  obeissance: { emoji: "🎯", label: "Obéissance", color: "#8b5cf6" },
  socialisation: { emoji: "🐕", label: "Socialisation", color: "#8b5cf6" },
  shaping: { emoji: "🧠", label: "Shaping", color: "#8b5cf6" },
  concours: { emoji: "🏆", label: "Concours", color: "#eab308" },
  autre: { emoji: "📅", label: "Activité", color: "#3b82f6" },
};

function getEventConfig(event) {
  if (event._type === "meetup") return EVENT_TYPE_CONFIG.meetup;
  return EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.autre;
}

function formatEventDate(dateStr, timeStr) {
  if (!dateStr) return "";
  try {
    const base = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const d = parseUTC(base);
    const dateLabel = format(d, "EEE d MMM", { locale: fr });
    return timeStr ? `${dateLabel} · ${timeStr}` : dateLabel;
  } catch {
    return dateStr;
  }
}

export default function UpcomingEventsSection({ events }) {
  if (!events || events.length === 0) return null;

  // Trier par date+heure et prendre les 5 prochains
  const sorted = [...events]
    .filter(e => e.date)
    .sort((a, b) => {
      const da = parseUTC(`${(a.date || "").split("T")[0]}T${a.time || "00:00"}`);
      const db = parseUTC(`${(b.date || "").split("T")[0]}T${b.time || "00:00"}`);
      return da - db;
    })
    .slice(0, 5);

  if (sorted.length === 0) return null;

  return (
    <div className="mx-4 mb-3">
      <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-blue-50">
          <span className="text-base">📅</span>
          <h2 className="text-sm font-black text-stone-800">À venir</h2>
          <span className="ml-auto text-[10px] font-semibold text-blue-400 bg-blue-50 px-2 py-0.5 rounded-full">
            {sorted.length} événement{sorted.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="divide-y divide-stone-50">
          {sorted.map(event => {
            const cfg = getEventConfig(event);
            const page = event._type === "meetup" ? "AnnouncementDetail" : "ActivityDetail";
            const link = `${createPageUrl(page)}?id=${event.id}`;

            return (
              <Link key={`${event._type}-${event.id}`} to={link} className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: cfg.color + "18" }}
                >
                  {cfg.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-stone-800 truncate">{event.title}</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    {formatEventDate(event.date, event.time)}
                    {event.city ? ` · 📍${event.city}` : ""}
                  </p>
                </div>
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cfg.color }}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}