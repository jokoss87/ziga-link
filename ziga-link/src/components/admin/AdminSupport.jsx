import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { Loader2, Save, Users, TrendingUp, DollarSign, Star, Download, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cacheInvalidate } from "@/components/lib/cache";

const DEFAULT_CONFIG = {
  amounts: [2, 5, 10],
  allow_custom_amount: false,
  allow_monthly: true,
  allow_onetime: true,
  currency: "eur",
  text_post_walk_title: "Vous avez aimé cette balade ?",
  text_post_walk_body: "Ziga Link est gratuit et sans pub. Un petit coup de pouce permet de continuer à développer la communauté !",
  text_post_walk_cta: "Soutenir Ziga Link 🐾",
  text_post_walk_delay_days: 7,
  text_profile_title: "Soutenir Ziga Link",
  text_profile_body: "Ziga Link est gratuit et sans pub. Votre soutien nous aide à continuer.",
  text_profile_cta: "Soutenir maintenant",
  text_support_page_title: "Soutenir Ziga Link",
  text_support_page_subtitle: "Ziga Link est gratuit et sans pub. Votre soutien nous permet de continuer.",
  text_badge: "Soutien Ziga Link 🐾",
  text_founder_badge: "Fondateur Ziga Link 🏆",
  founder_mode_active: false,
  founder_limit: 50,
  monthly_goal_active: false,
  monthly_goal_label: "Objectif Avril",
  monthly_goal_amount: 100,
  monthly_goal_reached: 0,
  monthly_goal_description: "Serveurs + maintenance",
};

const TABS = ["kpis", "goal", "amounts", "texts", "badges", "list"];
const TAB_LABELS = { kpis: "📊 KPIs", goal: "🎯 Objectif", amounts: "💳 Montants", texts: "✏️ Textes", badges: "🏅 Badges", list: "📋 Liste" };

export default function AdminSupport() {
  const { user } = useUserProfile();
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [configId, setConfigId] = useState(null);
  const [supports, setSupports] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("kpis");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    if (user?.role !== "admin") return;
    loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cfgs, supp, users] = await Promise.all([
        base44.entities.SupportConfig.list(),
        base44.entities.UserSupport.list("-created_date", 200),
        base44.entities.UserProfile.list("-created_date", 500),
      ]);
      if (cfgs.length > 0) {
        setConfigId(cfgs[0].id);
        setConfig({ ...DEFAULT_CONFIG, ...cfgs[0] });
      }
      setSupports(supp);
      setAllUsers(users);
    } catch (e) {
      console.error("[AdminSupport] loadAll error:", e);
    } finally {
      setLoading(false);
    }
  };

  const setField = (key, val) => setConfig(prev => ({ ...prev, [key]: val }));

  const handleSyncFromStripe = async () => {
    const total = supports
      .filter(s => s.status === "soutien_actif" && s.is_monthly === true)
      .reduce((acc, s) => acc + (s.amount || 0), 0);
    const newConfig = { ...config, monthly_goal_reached: total };
    setConfig(newConfig);
    setSaving(true);
    try {
      if (configId) {
        await base44.entities.SupportConfig.update(configId, newConfig);
      } else {
        const created = await base44.entities.SupportConfig.create(newConfig);
        setConfigId(created.id);
      }
      toast.success(`Synchronisé : ${total}€/mois depuis ${supports.filter(s => s.status === "soutien_actif" && s.is_monthly).length} abonnés actifs`);
    } catch (e) {
      toast.error("Erreur lors de la synchronisation");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (configId) {
        await base44.entities.SupportConfig.update(configId, config);
      } else {
        const created = await base44.entities.SupportConfig.create(config);
        setConfigId(created.id);
      }
      cacheInvalidate("home_announcements");
      toast.success("Configuration sauvegardée !");
    } catch (e) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSub = async (support) => {
    if (!window.confirm(`Annuler l'abonnement de ${support.user_email} ?`)) return;
    setCancellingId(support.id);
    try {
      await base44.functions.invoke("cancelStripeSubscription", { userEmail: support.user_email });
      toast.success("Abonnement annulé.");
      await loadAll();
    } catch (e) {
      toast.error("Erreur : " + e.message);
    } finally {
      setCancellingId(null);
    }
  };

  const exportCSV = () => {
    const rows = [["Email", "Montant", "Mensuel", "Statut", "Date début", "Total payé", "Nb paiements"]];
    supports.forEach(s => {
      rows.push([s.user_email, s.amount, s.is_monthly ? "Oui" : "Non", s.status, s.started_at?.slice(0, 10) || "", s.total_paid || 0, s.payment_count || 0]);
    });
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "soutiens_zigalink.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (user?.role !== "admin") return <div className="text-red-500 text-center py-8">Accès refusé.</div>;
  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-stone-400" /></div>;

  // KPIs
  const actifs = supports.filter(s => s.status === "soutien_actif");
  const mensuelRevenu = actifs.filter(s => s.is_monthly).reduce((acc, s) => acc + (s.amount || 0), 0);
  const totalCumul = supports.reduce((acc, s) => acc + (s.total_paid || 0), 0);
  const conversionRate = allUsers.length > 0 ? ((actifs.length / allUsers.length) * 100).toFixed(1) : "0";
  const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
  const newThisMonth = supports.filter(s => s.started_at && new Date(s.started_at) >= thisMonth).length;
  const founderCount = actifs.filter(s => s.payment_count >= 1).length;
  const goalPct = config.monthly_goal_active && config.monthly_goal_amount > 0
    ? Math.min(100, Math.round(((config.monthly_goal_reached || 0) / config.monthly_goal_amount) * 100)) : 0;

  // Filtre liste
  const filteredList = supports.filter(s => {
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    const matchSearch = !searchQuery || s.user_email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const statusBadge = (status) => {
    if (status === "soutien_actif") return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-700">Actif</span>;
    if (status === "soutien_expire") return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">Expiré</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-500">Non soutien</span>;
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Tabs internes */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap flex-shrink-0 transition-colors ${activeTab === t ? "bg-teal-500 text-white" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* ZONE A — KPIs */}
      {activeTab === "kpis" && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { emoji: "🐾", label: "Soutiens actifs", value: actifs.length, color: "text-teal-600" },
            { emoji: "📈", label: "Revenu mensuel estimé", value: `${mensuelRevenu}€/mois`, color: "text-emerald-600" },
            { emoji: "💰", label: "Total cumulé", value: `${totalCumul.toFixed(2)}€`, color: "text-amber-600" },
            { emoji: "🎯", label: "Taux de conversion", value: `${conversionRate}%`, color: "text-purple-600" },
            { emoji: "✨", label: "Nouveaux ce mois", value: newThisMonth, color: "text-blue-600" },
            { emoji: "🏆", label: "Fondateurs potentiels", value: founderCount, color: "text-orange-600" },
          ].map(({ emoji, label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{emoji}</span>
                <span className="text-xs text-stone-400 font-medium">{label}</span>
              </div>
              <div className={`text-xl font-black ${color}`}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ZONE B — Objectif */}
      {activeTab === "goal" && (
        <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-stone-800">Objectif mensuel</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSyncFromStripe}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-xl text-xs font-semibold text-teal-700 hover:bg-teal-100 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Sync Stripe
              </button>
              <Label className="text-xs text-stone-500">Actif</Label>
              <Switch checked={!!config.monthly_goal_active} onCheckedChange={v => setField("monthly_goal_active", v)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-stone-400 mb-1 block">Label</Label>
              <input value={config.monthly_goal_label || ""} onChange={e => setField("monthly_goal_label", e.target.value)} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400" placeholder="Objectif Avril" />
            </div>
            <div>
              <Label className="text-xs text-stone-400 mb-1 block">Montant objectif (€)</Label>
              <input type="number" value={config.monthly_goal_amount || ""} onChange={e => setField("monthly_goal_amount", parseFloat(e.target.value))} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400" />
            </div>
            <div>
              <Label className="text-xs text-stone-400 mb-1 block">Montant atteint (€) — saisie manuelle</Label>
              <input type="number" value={config.monthly_goal_reached || ""} onChange={e => setField("monthly_goal_reached", parseFloat(e.target.value))} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400" />
            </div>
            <div>
              <Label className="text-xs text-stone-400 mb-1 block">Description</Label>
              <input value={config.monthly_goal_description || ""} onChange={e => setField("monthly_goal_description", e.target.value)} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400" placeholder="Serveurs + maintenance" />
            </div>
          </div>
          {/* Barre de progression */}
          {config.monthly_goal_active && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-stone-400">{config.monthly_goal_reached || 0}€ atteints</span>
                <span className="font-bold text-teal-600">{goalPct}%</span>
              </div>
              <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-3 rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all" style={{ width: `${goalPct}%` }} />
              </div>
              <p className="text-xs text-stone-400 mt-1">Objectif : {config.monthly_goal_amount || 0}€</p>
            </div>
          )}
          <SaveButton saving={saving} onClick={handleSave} />
        </div>
      )}

      {/* ZONE C — Montants */}
      {activeTab === "amounts" && (
        <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm space-y-4">
          <h3 className="font-bold text-stone-800">Montants & Paiement</h3>
          <div>
            <Label className="text-xs text-stone-400 mb-2 block">Montants proposés (séparés par virgule)</Label>
            <input
              value={(config.amounts || []).join(", ")}
              onChange={e => {
                const vals = e.target.value.split(",").map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
                setField("amounts", vals);
              }}
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400"
              placeholder="2, 5, 10"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Montant libre</Label>
              <Switch checked={!!config.allow_custom_amount} onCheckedChange={v => setField("allow_custom_amount", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Mensuel</Label>
              <Switch checked={!!config.allow_monthly} onCheckedChange={v => setField("allow_monthly", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Unique</Label>
              <Switch checked={!!config.allow_onetime} onCheckedChange={v => setField("allow_onetime", v)} />
            </div>
            <div>
              <Label className="text-xs text-stone-400 mb-1 block">Devise</Label>
              <input value={config.currency || "eur"} onChange={e => setField("currency", e.target.value)} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400" />
            </div>
          </div>
          <SaveButton saving={saving} onClick={handleSave} />
        </div>
      )}

      {/* ZONE C — Textes */}
      {activeTab === "texts" && (
        <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm space-y-4">
          <h3 className="font-bold text-stone-800">Textes & Messages</h3>
          {[
            { key: "text_post_walk_title", label: "Titre message post-balade" },
            { key: "text_post_walk_body", label: "Corps message post-balade", textarea: true },
            { key: "text_post_walk_cta", label: "Bouton post-balade" },
            { key: "text_profile_title", label: "Titre section profil" },
            { key: "text_profile_body", label: "Corps section profil", textarea: true },
            { key: "text_profile_cta", label: "Bouton profil" },
            { key: "text_support_page_title", label: "Titre page soutien" },
            { key: "text_support_page_subtitle", label: "Sous-titre page soutien" },
          ].map(({ key, label, textarea }) => (
            <div key={key}>
              <Label className="text-xs text-stone-400 mb-1 block">{label}</Label>
              {textarea ? (
                <textarea value={config[key] || ""} onChange={e => setField(key, e.target.value)} rows={2} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400 resize-none" />
              ) : (
                <input value={config[key] || ""} onChange={e => setField(key, e.target.value)} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400" />
              )}
            </div>
          ))}
          {/* Bloc Vision / Ambitions */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold text-indigo-800">🌟 Bloc vision / ambitions</Label>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-indigo-600">{config.vision_visible ? "Visible" : "Masqué"}</Label>
                <Switch checked={!!config.vision_visible} onCheckedChange={v => setField("vision_visible", v)} />
              </div>
            </div>
            <p className="text-xs text-indigo-500">Ce texte s'affiche sur la page Soutien, en bas, pour décrire vos ambitions.</p>
            <textarea
              value={config.vision_text || ""}
              onChange={e => setField("vision_text", e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="Ex : Notre ambition est de créer la plus grande communauté canine bienveillante de France..."
              className="w-full border border-indigo-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none bg-white"
            />
            <p className="text-xs text-right text-indigo-400">{(config.vision_text || "").length} / 2000 caractères</p>
          </div>

          <div>
            <Label className="text-xs text-stone-400 mb-1 block">Délai entre affichages post-balade (jours)</Label>
            <input type="number" value={config.text_post_walk_delay_days || 7} onChange={e => setField("text_post_walk_delay_days", parseInt(e.target.value))} className="w-32 border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400" />
          </div>
          {/* Aperçu live */}
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200">
            <p className="text-xs font-bold text-stone-500 mb-2">Aperçu message post-balade :</p>
            <p className="font-black text-stone-800 text-sm">{config.text_post_walk_title || "—"}</p>
            <p className="text-sm text-stone-500 mt-1">{config.text_post_walk_body || "—"}</p>
            <div className="mt-2 bg-teal-500 text-white text-xs font-bold px-4 py-2 rounded-xl inline-block">{config.text_post_walk_cta || "—"}</div>
          </div>
          <SaveButton saving={saving} onClick={handleSave} />
        </div>
      )}

      {/* ZONE C — Badges */}
      {activeTab === "badges" && (
        <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm space-y-4">
          <h3 className="font-bold text-stone-800">Badges & Fondateurs</h3>
          <div>
            <Label className="text-xs text-stone-400 mb-1 block">Texte du badge soutien</Label>
            <input value={config.text_badge || ""} onChange={e => setField("text_badge", e.target.value)} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400" />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Badge fondateur actif</Label>
            <Switch checked={!!config.founder_mode_active} onCheckedChange={v => setField("founder_mode_active", v)} />
          </div>
          {config.founder_mode_active && (
            <>
              <div>
                <Label className="text-xs text-stone-400 mb-1 block">Texte badge fondateur</Label>
                <input value={config.text_founder_badge || ""} onChange={e => setField("text_founder_badge", e.target.value)} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400" />
              </div>
              <div>
                <Label className="text-xs text-stone-400 mb-1 block">Nombre max fondateurs</Label>
                <input type="number" value={config.founder_limit || ""} onChange={e => setField("founder_limit", parseInt(e.target.value))} className="w-32 border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400" />
              </div>
              <div className="bg-teal-50 rounded-xl p-3 text-sm text-teal-700">
                Fondateurs actuels : <strong>{founderCount}</strong> / {config.founder_limit || "∞"}
              </div>
            </>
          )}
          <SaveButton saving={saving} onClick={handleSave} />
        </div>
      )}

      {/* ZONE D — Liste */}
      {activeTab === "list" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher par email..."
              className="border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400 flex-1 min-w-40"
            />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400"
            >
              <option value="all">Tous</option>
              <option value="soutien_actif">Actifs</option>
              <option value="soutien_expire">Expirés</option>
              <option value="non_soutien">Non soutien</option>
            </select>
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 rounded-xl text-sm font-semibold text-stone-600 hover:bg-stone-200 transition-colors">
              <Download className="w-4 h-4" /> CSV
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 border-b border-stone-100">
                  <tr>
                    {["Email", "Montant", "Type", "Début", "Statut", "Total", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-stone-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {filteredList.length === 0 ? (
                    <tr><td colSpan={7} className="text-center text-stone-400 py-8 text-sm">Aucun résultat</td></tr>
                  ) : filteredList.map(s => (
                    <tr key={s.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 text-stone-700 font-medium max-w-[180px] truncate">{s.user_email}</td>
                      <td className="px-4 py-3 font-bold text-stone-800">{s.amount}€</td>
                      <td className="px-4 py-3 text-stone-500">{s.is_monthly ? "Mensuel" : "Unique"}</td>
                      <td className="px-4 py-3 text-stone-400 text-xs">{s.started_at?.slice(0, 10) || "—"}</td>
                      <td className="px-4 py-3">{statusBadge(s.status)}</td>
                      <td className="px-4 py-3 font-bold text-emerald-600">{s.total_paid || 0}€</td>
                      <td className="px-4 py-3">
                        {s.status === "soutien_actif" && s.is_monthly && (
                          <button
                            onClick={() => handleCancelSub(s)}
                            disabled={cancellingId === s.id}
                            className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors disabled:opacity-50"
                          >
                            {cancellingId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Annuler"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SaveButton({ saving, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="w-full py-3 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
      style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
    >
      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      Sauvegarder
    </button>
  );
}