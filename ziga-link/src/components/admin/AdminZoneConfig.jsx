import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Save, Loader2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

const DEFAULT_FLAGS = {
  show_welcome_hero: false,
  show_map: true,
  show_activities: true,
  show_challenge: true,
  show_feed: true,
  matching_advanced: false,
};

function ZoneRow({ zone, onSave }) {
  const [open, setOpen] = useState(false);
  const [flags, setFlags] = useState({ ...DEFAULT_FLAGS, ...(zone.feature_flags || {}) });
  const [isActive, setIsActive] = useState(zone.is_active !== false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const FLAG_META = [
    { key: "show_welcome_hero", label: "Message d'accueil (WelcomeSplash + HomeHero)", emoji: "👋" },
    { key: "show_map",          label: "Mini carte sur l'accueil",                      emoji: "🗺️" },
    { key: "show_activities",   label: "Section Activités",                              emoji: "🏃" },
    { key: "show_challenge",    label: "Widget Défi",                                    emoji: "🏆" },
    { key: "show_feed",         label: "Fil local (posts)",                              emoji: "📰" },
    { key: "matching_advanced", label: "Matching avancé (IA comportementale)",           emoji: "🧠" },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.ZoneConfig.update(zone.id, {
        feature_flags: flags,
        is_active: isActive,
      });
      setSaved(true);
      onSave();
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error("Erreur sauvegarde ZoneConfig:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🗂️</span>
          <div className="text-left">
            <div className="font-bold text-stone-800 text-sm">{zone.zoneTag}</div>
            <div className="text-xs text-stone-400">{zone.description || "Aucune description"}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isActive ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-400"}`}>
            {isActive ? "Active" : "Inactive"}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-stone-100 space-y-4">
          {/* Zone active toggle */}
          <div className="flex items-center justify-between pt-4">
            <span className="text-sm font-semibold text-stone-700">Zone active (visible dans l'app)</span>
            <button
              onClick={() => setIsActive(v => !v)}
              className={`w-12 h-6 rounded-full transition-colors relative ${isActive ? "bg-teal-500" : "bg-stone-200"}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? "translate-x-7" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Feature flags */}
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-3">Feature Flags</p>
            <div className="space-y-3">
              {FLAG_META.map(({ key, label, emoji }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-stone-700 flex items-center gap-2">
                    <span>{emoji}</span> {label}
                  </span>
                  <button
                    onClick={() => setFlags(f => ({ ...f, [key]: !f[key] }))}
                    className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${flags[key] ? "bg-teal-500" : "bg-stone-200"}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${flags[key] ? "translate-x-7" : "translate-x-1"}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Sauvegarde…</> :
             saved  ? <><CheckCircle2 className="w-4 h-4" /> Sauvegardé !</> :
                      <><Save className="w-4 h-4" /> Sauvegarder</>}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminZoneConfig() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newZoneTag, setNewZoneTag] = useState("");

  const load = async () => {
    const list = await base44.entities.ZoneConfig.list("-created_date", 50).catch(() => []);
    setZones(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newZoneTag.trim()) return;
    setCreating(true);
    await base44.entities.ZoneConfig.create({
      zoneTag: newZoneTag.trim().toLowerCase(),
      is_active: true,
      feature_flags: DEFAULT_FLAGS,
    }).catch(console.error);
    setNewZoneTag("");
    setCreating(false);
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 text-xs text-teal-700 leading-relaxed">
        🗺️ <strong>Zones & Feature Flags</strong> — Activez ou désactivez des fonctionnalités par zone sans toucher au code. Le flag <strong>show_welcome_hero</strong> contrôle l'affichage du message d'accueil (WelcomeSplash + HomeHero).
      </div>

      {zones.map(zone => (
        <ZoneRow key={zone.id} zone={zone} onSave={load} />
      ))}

      {zones.length === 0 && (
        <div className="text-center py-8 text-stone-400 text-sm">Aucune zone configurée.</div>
      )}

      {/* Créer une nouvelle zone */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 flex gap-3">
        <input
          value={newZoneTag}
          onChange={e => setNewZoneTag(e.target.value)}
          placeholder="Nouvelle zone (ex: limoges)"
          className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
          onKeyDown={e => e.key === "Enter" && handleCreate()}
        />
        <button
          onClick={handleCreate}
          disabled={creating || !newZoneTag.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Créer
        </button>
      </div>
    </div>
  );
}