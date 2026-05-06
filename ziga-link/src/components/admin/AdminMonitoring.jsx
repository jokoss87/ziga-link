import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Trash2, Activity, Zap, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const LEVEL_CONFIG = {
  info:     { color: "bg-blue-100 text-blue-700 border-blue-200",     dot: "bg-blue-400",     label: "Info" },
  warn:     { color: "bg-amber-100 text-amber-700 border-amber-200",  dot: "bg-amber-400",    label: "Avert." },
  error:    { color: "bg-red-100 text-red-700 border-red-200",        dot: "bg-red-500",      label: "Erreur" },
  critical: { color: "bg-rose-100 text-rose-800 border-rose-300",     dot: "bg-rose-600",     label: "Critique" },
};

const CAT_EMOJI = {
  matching: "🔗", auth: "🔐", react_crash: "💥", performance: "⚡", data: "🗄️", other: "📋"
};

function LogRow({ log, onResolve }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.info;

  return (
    <div className={`rounded-xl border p-3 ${log.resolved ? "opacity-40" : ""} ${cfg.color}`}>
      <div className="flex items-start justify-between gap-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${cfg.dot}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs">{cfg.label}</span>
              <span className="text-xs opacity-70">{CAT_EMOJI[log.category]} {log.category}</span>
              {log.page && <span className="text-xs opacity-60">· {log.page}</span>}
            </div>
            <p className="text-sm font-medium mt-0.5 line-clamp-1">{log.message}</p>
            <p className="text-xs opacity-60 mt-0.5">
              {log.created_date ? new Date(log.created_date).toLocaleString("fr-FR") : ""}
              {log.user_email && ` · ${log.user_email}`}
            </p>
          </div>
        </div>
        {!log.resolved && (
          <button
            onClick={(e) => { e.stopPropagation(); onResolve(log.id); }}
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/50 transition-colors"
            title="Marquer comme résolu"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
        )}
      </div>
      {expanded && (log.details || log.stack) && (
        <div className="mt-2 pt-2 border-t border-current/20 space-y-1">
          {log.details && <p className="text-xs font-mono break-all opacity-80">{log.details}</p>}
          {log.stack && <pre className="text-xs font-mono break-all opacity-60 whitespace-pre-wrap max-h-40 overflow-auto">{log.stack}</pre>}
        </div>
      )}
    </div>
  );
}

export default function AdminMonitoring() {
  const { toast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState("all");
  const [showResolved, setShowResolved] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [stats, setStats] = useState({ critical: 0, errors: 0, warns: 0, unresolved: 0 });

  useEffect(() => { loadLogs(); }, []);

  const loadLogs = async () => {
    setLoading(true);
    const data = await base44.entities.AppLog.list("-created_date", 200);
    setLogs(data);

    // Stats
    const unresolved = data.filter(l => !l.resolved);
    setStats({
      critical: unresolved.filter(l => l.level === "critical").length,
      errors: unresolved.filter(l => l.level === "error").length,
      warns: unresolved.filter(l => l.level === "warn").length,
      unresolved: unresolved.length,
    });

    // Chart: last 7 days errors
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const label = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
      const dayLogs = data.filter(l => {
        const c = l.created_date ? new Date(l.created_date) : null;
        return c && c >= d && c < next;
      });
      days.push({
        label,
        critical: dayLogs.filter(l => l.level === "critical").length,
        error: dayLogs.filter(l => l.level === "error").length,
        warn: dayLogs.filter(l => l.level === "warn").length,
      });
    }
    setChartData(days);
    setLoading(false);
  };

  const handleResolve = async (id) => {
    await base44.entities.AppLog.update(id, { resolved: true });
    loadLogs();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await base44.functions.invoke('exportData', {});
      toast({ title: "Export envoyé par email ✅" });
    } catch (e) {
      toast({ title: "Erreur export", description: e.message, variant: "destructive" });
    }
    setExporting(false);
  };

  const handleClearResolved = async () => {
    if (!confirm("Supprimer tous les logs résolus ?")) return;
    const resolved = logs.filter(l => l.resolved);
    await Promise.all(resolved.map(l => base44.entities.AppLog.delete(l.id)));
    loadLogs();
  };

  const filtered = logs.filter(l => {
    if (!showResolved && l.resolved) return false;
    if (filter === "all") return true;
    return l.level === filter || l.category === filter;
  });

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-4 border-red-400 border-t-transparent" /></div>;

  return (
    <div className="space-y-5">
      {/* Stats critiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-rose-700">{stats.critical}</div>
          <div className="text-xs font-semibold text-rose-600 mt-0.5">Critiques</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-red-600">{stats.errors}</div>
          <div className="text-xs font-semibold text-red-500 mt-0.5">Erreurs</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-amber-600">{stats.warns}</div>
          <div className="text-xs font-semibold text-amber-500 mt-0.5">Avertissements</div>
        </div>
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-stone-700">{stats.unresolved}</div>
          <div className="text-xs font-semibold text-stone-500 mt-0.5">Non résolus</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <h3 className="font-bold text-stone-700 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Logs — 7 derniers jours
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barSize={12}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="critical" fill="#e11d48" name="Critique" radius={[3,3,0,0]} />
            <Bar dataKey="error" fill="#ef4444" name="Erreur" radius={[3,3,0,0]} />
            <Bar dataKey="warn" fill="#f59e0b" name="Avert." radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bouton export */}
      <div className="flex justify-end">
        <Button onClick={handleExport} disabled={exporting} variant="outline" className="gap-2 text-xs border-teal-200 text-teal-700 hover:bg-teal-50">
          <Download className="w-3.5 h-3.5" /> {exporting ? "Export en cours..." : "📦 Exporter toutes les données"}
        </Button>
      </div>

      {/* Filtres + actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {["all","critical","error","warn","matching","react_crash","performance"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
                filter === f ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-500 border-stone-200"
              }`}
            >
              {f === "all" ? "Tous" : f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-stone-500 cursor-pointer">
            <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} className="rounded" />
            Résolus
          </label>
          <Button size="sm" variant="outline" onClick={handleClearResolved} className="gap-1.5 text-xs border-red-200 text-red-500 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" /> Purger résolus
          </Button>
          <Button size="sm" variant="outline" onClick={loadLogs} className="gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Actualiser
          </Button>
        </div>
      </div>

      {/* Liste logs */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-stone-100">
          <CheckCircle className="w-10 h-10 text-teal-400 mx-auto mb-3" />
          <p className="font-semibold text-stone-600">Aucun log pour ce filtre</p>
          <p className="text-sm text-stone-400 mt-1">Tout semble normal 🎉</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => <LogRow key={log.id} log={log} onResolve={handleResolve} />)}
        </div>
      )}
    </div>
  );
}