import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { Download, RefreshCw } from "lucide-react";

const STATUS_LABELS = { nouveau: "Nouveau", en_cours: "En cours", corrige: "Corrigé" };
const STATUS_COLORS = {
  nouveau: "bg-red-100 text-red-700",
  en_cours: "bg-amber-100 text-amber-700",
  corrige: "bg-green-100 text-green-700",
};
const PRIORITY_LABELS = { faible: "Faible", moyenne: "Moyenne", haute: "Haute" };
const PRIORITY_COLORS = {
  faible: "bg-stone-100 text-stone-600",
  moyenne: "bg-blue-100 text-blue-700",
  haute: "bg-red-100 text-red-700",
};
const BUG_TYPE_LABELS = {
  affichage: "Affichage",
  fonction: "Fonction",
  calcul: "Calcul",
  carte: "Carte/Géo",
  connexion: "Connexion",
  autre: "Autre",
};

export default function AdminBugReports() {
  const { user: currentAdmin } = useUserProfile();
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [editNote, setEditNote] = useState({});

  useEffect(() => {
    loadBugs();
  }, []);

  const loadBugs = async () => {
    setLoading(true);
    const all = await base44.entities.BugReport.list("-created_date", 200);
    setBugs(all);
    setLoading(false);
  };

  const updateBug = async (id, data) => {
    await base44.entities.BugReport.update(id, data);
    setBugs(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
  };

  const saveNote = async (bug) => {
    const note = editNote[bug.id];
    const history = bug.admin_notes_history || [];
    history.push({
      timestamp: new Date().toISOString(),
      admin_email: currentAdmin?.email || "admin",
      admin_name: currentAdmin?.full_name || "Admin",
      text: note,
    });
    await updateBug(bug.id, { 
      admin_note: note,
      admin_notes_history: history,
      admin_notes_updated_by: currentAdmin?.email,
    });
    setEditNote(prev => ({ ...prev, [bug.id]: undefined }));
  };

  const sendPublicResponse = async (bug, responseText) => {
    if (!responseText.trim()) return;
    
    await updateBug(bug.id, {
      admin_public_response: responseText,
      admin_public_response_date: new Date().toISOString(),
      admin_responded_by: currentAdmin?.email,
      user_notified: false,
    });

    // Créer notification pour l'utilisateur
    await base44.entities.Notification.create({
      user_email: bug.user_email,
      type: "bug_response",
      title: "Réponse à votre signalement 🛠",
      body: `Nous avons répondu à votre signalement: "${bug.description.slice(0, 50)}..."`,
      reference_id: bug.id,
      link_page: "BugDetail",
      link_param: bug.id,
      is_read: false,
    });

    // Marquer comme notifié
    await updateBug(bug.id, { user_notified: true });
  };

  const exportCSV = () => {
    const rows = [
      ["Date", "Utilisateur", "Type", "Description", "Page", "Version", "Appareil", "OS", "Statut", "Priorité", "Note"],
      ...bugs.map(b => [
        new Date(b.created_date).toLocaleString("fr-FR"),
        b.user_email || "",
        BUG_TYPE_LABELS[b.bug_type] || b.bug_type,
        `"${(b.description || "").replace(/"/g, '""')}"`,
        b.page || "",
        b.app_version || "",
        b.device_type || "",
        b.os || "",
        STATUS_LABELS[b.status] || b.status,
        PRIORITY_LABELS[b.priority] || b.priority,
        `"${(b.admin_note || "").replace(/"/g, '""')}"`,
      ])
    ];
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bugs_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = filterStatus === "all" ? bugs : bugs.filter(b => b.status === filterStatus);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {[{ value: "all", label: "Tous" }, { value: "nouveau", label: "Nouveaux" }, { value: "en_cours", label: "En cours" }, { value: "corrige", label: "Corrigés" }].map(s => (
            <button
              key={s.value}
              onClick={() => setFilterStatus(s.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filterStatus === s.value ? "bg-teal-500 text-white border-teal-500" : "bg-white text-stone-500 border-stone-200 hover:bg-stone-50"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={loadBugs} className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 transition-colors">
            <RefreshCw className="w-4 h-4 text-stone-500" />
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 transition-colors text-xs font-semibold text-stone-600">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Nouveaux", count: bugs.filter(b => b.status === "nouveau").length, color: "text-red-600 bg-red-50" },
          { label: "En cours", count: bugs.filter(b => b.status === "en_cours").length, color: "text-amber-600 bg-amber-50" },
          { label: "Corrigés", count: bugs.filter(b => b.status === "corrige").length, color: "text-green-600 bg-green-50" },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-2xl p-3 text-center`}>
            <div className="text-2xl font-black">{s.count}</div>
            <div className="text-xs font-semibold">{s.label}</div>
          </div>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-sm">Aucun bug signalé</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(bug => (
            <div key={bug.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-stone-50 transition-colors"
                onClick={() => setExpanded(expanded === bug.id ? null : bug.id)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[bug.status]}`}>
                      {STATUS_LABELS[bug.status]}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${PRIORITY_COLORS[bug.priority]}`}>
                      {PRIORITY_LABELS[bug.priority]}
                    </span>
                    <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-medium">
                      {BUG_TYPE_LABELS[bug.bug_type] || bug.bug_type}
                    </span>
                  </div>
                  <span className="text-xs text-stone-400 whitespace-nowrap">
                    {new Date(bug.created_date).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <p className="text-sm text-stone-700 line-clamp-2">{bug.description}</p>
                <div className="flex gap-3 mt-2 text-xs text-stone-400">
                  <span>📍 {bug.page}</span>
                  <span>👤 {bug.user_email}</span>
                </div>
              </div>

              {expanded === bug.id && (
                <div className="border-t border-stone-100 p-4 space-y-4 bg-stone-50">
                  {/* Full description */}
                  <div>
                    <div className="text-xs font-semibold text-stone-500 mb-1">Description complète</div>
                    <p className="text-sm text-stone-700 bg-white rounded-xl p-3 border border-stone-100">{bug.description}</p>
                  </div>

                  {/* Infos techniques */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-stone-500">
                    <div><span className="font-semibold">Version :</span> {bug.app_version || "—"}</div>
                    <div><span className="font-semibold">Appareil :</span> {bug.device_type || "—"}</div>
                    <div><span className="font-semibold">OS :</span> {bug.os || "—"}</div>
                    <div><span className="font-semibold">ID :</span> {bug.user_id?.slice(0, 8) || "—"}</div>
                  </div>

                  {/* Status & Priority */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-stone-500 mb-1 block">Statut</label>
                      <select
                        value={bug.status}
                        onChange={e => updateBug(bug.id, { status: e.target.value })}
                        className="w-full text-xs border border-stone-200 rounded-xl px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-300"
                      >
                        <option value="nouveau">Nouveau</option>
                        <option value="en_cours">En cours</option>
                        <option value="corrige">Corrigé</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-stone-500 mb-1 block">Priorité</label>
                      <select
                        value={bug.priority}
                        onChange={e => updateBug(bug.id, { priority: e.target.value })}
                        className="w-full text-xs border border-stone-200 rounded-xl px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-300"
                      >
                        <option value="faible">Faible</option>
                        <option value="moyenne">Moyenne</option>
                        <option value="haute">Haute</option>
                      </select>
                    </div>
                  </div>

                  {/* Note interne */}
                  <div>
                    <label className="text-xs font-semibold text-stone-500 mb-1 block">Note interne</label>
                    <textarea
                      value={editNote[bug.id] !== undefined ? editNote[bug.id] : (bug.admin_note || "")}
                      onChange={e => setEditNote(prev => ({ ...prev, [bug.id]: e.target.value }))}
                      rows={2}
                      placeholder="Ajouter une note..."
                      className="w-full text-xs border border-stone-200 rounded-xl px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-300 resize-none"
                    />
                    {editNote[bug.id] !== undefined && (
                      <button
                        onClick={() => saveNote(bug)}
                        className="mt-1 text-xs text-teal-600 font-semibold hover:text-teal-700"
                      >
                        Sauvegarder la note
                      </button>
                    )}

                    {/* Historique des notes */}
                    {bug.admin_notes_history && bug.admin_notes_history.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-stone-200">
                        <div className="text-xs font-semibold text-stone-500 mb-2">Historique des notes</div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {[...bug.admin_notes_history].reverse().map((entry, idx) => (
                            <div key={idx} className="bg-white rounded-lg p-2 border border-stone-100">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-semibold text-stone-600">{entry.admin_name || entry.admin_email}</span>
                                <span className="text-[10px] text-stone-400">{new Date(entry.timestamp).toLocaleString("fr-FR")}</span>
                              </div>
                              <p className="text-[11px] text-stone-700 italic">"{entry.text}"</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Réponse publique */}
                  <div className="border-t border-stone-100 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-stone-500">Réponse publique (visible utilisateur)</label>
                      {bug.user_notified && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ Notifié</span>
                      )}
                    </div>

                    {bug.admin_public_response ? (
                      <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 mb-3">
                        <p className="text-xs text-teal-800 mb-1">{bug.admin_public_response}</p>
                        <div className="text-[10px] text-teal-600 flex items-center justify-between">
                          <span>Par {bug.admin_responded_by}</span>
                          <span>{new Date(bug.admin_public_response_date).toLocaleString("fr-FR")}</span>
                        </div>
                      </div>
                    ) : (
                      <textarea
                        id={`response-${bug.id}`}
                        placeholder="Écrire une réponse publique pour l'utilisateur..."
                        rows={2}
                        className="w-full text-xs border border-stone-200 rounded-xl px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-300 resize-none mb-2"
                      />
                    )}

                    {!bug.admin_public_response && (
                      <button
                        onClick={() => {
                          const textarea = document.getElementById(`response-${bug.id}`);
                          sendPublicResponse(bug, textarea.value);
                          textarea.value = "";
                        }}
                        className="w-full py-2 rounded-xl text-xs font-semibold text-white bg-teal-500 hover:bg-teal-600 transition-colors"
                      >
                        📤 Envoyer la réponse et notifier
                      </button>
                    )}
                  </div>

                  {/* Marquer résolu */}
                  {bug.status !== "corrige" && (
                    <button
                      onClick={() => updateBug(bug.id, { status: "corrige" })}
                      className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
                    >
                      ✅ Marquer comme résolu
                    </button>
                  )}
                  </div>
                  )}
                  </div>
                  ))}
                  </div>
                  )}
    </div>
  );
}