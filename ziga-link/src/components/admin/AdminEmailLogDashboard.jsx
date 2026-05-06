import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Mail, Search, Calendar, User, ChevronDown, ChevronUp, AlertTriangle, RefreshCw } from "lucide-react";

export default function AdminEmailLogDashboard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAdmin, setFilterAdmin] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [adminList, setAdminList] = useState([]);

  useEffect(() => { loadLogs(); }, []);

  const loadLogs = async () => {
    setLoading(true);
    const data = await base44.entities.AdminEmailLog.list("-created_date", 200);
    setLogs(data);
    // Extraire la liste unique des admins expéditeurs
    const admins = [...new Set(data.map(l => l.sent_by).filter(Boolean))];
    setAdminList(admins);
    setLoading(false);
  };

  const filtered = logs.filter(log => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q ||
      log.recipient_email?.toLowerCase().includes(q) ||
      log.subject?.toLowerCase().includes(q) ||
      log.body?.toLowerCase().includes(q);
    const matchAdmin = !filterAdmin || log.sent_by === filterAdmin;
    return matchSearch && matchAdmin;
  });

  // Détecter les doublons : même destinataire contacté plusieurs fois
  const recipientCounts = {};
  logs.forEach(l => {
    recipientCounts[l.recipient_email] = (recipientCounts[l.recipient_email] || 0) + 1;
  });
  const duplicates = Object.entries(recipientCounts)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-5">

      {/* Alerte doublons */}
      {duplicates.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <h4 className="font-bold text-amber-700 text-sm flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" /> Destinataires contactés 3x ou plus
          </h4>
          <div className="flex flex-wrap gap-2">
            {duplicates.map(([email, count]) => (
              <span key={email} className="bg-amber-100 text-amber-700 text-xs px-3 py-1 rounded-full font-semibold">
                {email} · {count} emails
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm text-center">
          <div className="text-2xl font-black text-teal-600">{logs.length}</div>
          <div className="text-xs text-stone-400 mt-1">Emails envoyés</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm text-center">
          <div className="text-2xl font-black text-blue-600">{Object.keys(recipientCounts).length}</div>
          <div className="text-xs text-stone-400 mt-1">Destinataires uniques</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm text-center">
          <div className="text-2xl font-black text-purple-600">{adminList.length}</div>
          <div className="text-xs text-stone-400 mt-1">Admins actifs</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-stone-700 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-500" /> Journal des emails admin
          </h3>
          <button onClick={loadLogs} className="p-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-400 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Destinataire, objet, contenu..."
              className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <select value={filterAdmin} onChange={e => setFilterAdmin(e.target.value)}
            className="border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
            <option value="">Tous les admins</option>
            {adminList.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-400 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-stone-400 mb-3">{filtered.length} email(s)</p>
            {filtered.length === 0 && (
              <div className="text-center py-8 text-stone-400 text-sm">Aucun email trouvé</div>
            )}
            {filtered.map(log => {
              const isExpanded = expandedId === log.id;
              const isDuplicate = recipientCounts[log.recipient_email] >= 3;
              return (
                <div key={log.id}
                  className={`rounded-xl border transition-colors ${isDuplicate ? "border-amber-200 bg-amber-50/50" : "border-stone-100 bg-stone-50"}`}>
                  <button className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}>
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-stone-800 truncate">{log.subject}</span>
                        {isDuplicate && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">doublon</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-stone-400 mt-0.5">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{log.recipient_email}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{log.created_date ? new Date(log.created_date).toLocaleDateString("fr-FR") : "—"}</span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0" />}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2 border-t border-stone-100 pt-3">
                      <p className="text-sm text-stone-600 whitespace-pre-wrap">{log.body}</p>
                      <p className="text-xs text-stone-400">Envoyé par : <span className="font-medium text-stone-600">{log.sent_by}</span></p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}