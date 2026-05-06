import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { cacheInvalidate } from "@/components/lib/cache";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, Eye, EyeOff, Send, Users, ChevronDown, ChevronUp, Clock } from "lucide-react";
import EventBannerCard from "@/components/events/EventBannerCard";
import { toast } from "sonner";

const DEFAULT_BANNER = {
  is_visible: false,
  show_event_button: false,
  title: "",
  subtitle: "",
  description: "",
  image_url: "",
  background_color: "#4CAF87",
  button_label: "",
  button_url: "",
  badge: "",
  pages: [],
};

export default function AdminMarketing() {
  const { user } = useUserProfile();
  const [banner, setBanner] = useState(DEFAULT_BANNER);
  const [bannerId, setBannerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // ── Envoi de messages ciblés ──
  const [allUsers, setAllUsers] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [msgTitle, setMsgTitle] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [msgZone, setMsgZone] = useState("all");
  const [msgSearch, setMsgSearch] = useState("");
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [sendMode, setSendMode] = useState("zone"); // "zone" | "select"
  const [sending, setSending] = useState(false);
  const [marketingLogs, setMarketingLogs] = useState([]);
  const [logsExpanded, setLogsExpanded] = useState(false);

  useEffect(() => {
    if (user?.role !== "admin") return;
    loadBanner();
    loadUsers();
  }, [user]);

  const loadUsers = async () => {
    const [users, profiles, logs] = await Promise.all([
      base44.entities.User.list().catch(() => []),
      base44.entities.UserProfile.list("-created_date", 500).catch(() => []),
      base44.entities.MarketingLog.list("-created_date", 30).catch(() => []),
    ]);
    setAllUsers(users);
    setAllProfiles(profiles);
    setMarketingLogs(logs);
  };

  const loadBanner = async () => {
    setLoading(true);
    try {
      const banners = await base44.entities.EventBanner.list();
      if (banners.length > 0) {
        const b = banners[0];
        setBannerId(b.id);
        setBanner({
          is_visible: b.is_visible ?? false,
          title: b.title || "",
          subtitle: b.subtitle || "",
          description: b.description || "",
          image_url: b.image_url || "",
          background_color: b.background_color || "#4CAF87",
          button_label: b.button_label || "",
          button_url: b.button_url || "",
          badge: b.badge || "",
          pages: b.pages || [],
          show_event_button: b.show_event_button ?? false,
        });
      }
    } catch (e) {
      console.error("AdminMarketing load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleField = (field, value) => setBanner(prev => ({ ...prev, [field]: value }));

  const handlePageToggle = (page) => {
    setBanner(prev => ({
      ...prev,
      pages: prev.pages.includes(page)
        ? prev.pages.filter(p => p !== page)
        : [...prev.pages, page],
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      handleField("image_url", res.file_url);
      toast.success("Image uploadée !");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Erreur upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (bannerId) {
        await base44.entities.EventBanner.update(bannerId, banner);
      } else {
        const created = await base44.entities.EventBanner.create(banner);
        setBannerId(created.id);
      }
      cacheInvalidate("home_announcements");
      cacheInvalidate("event_button_flag");
      toast.success("Banner sauvegardé !");
    } catch (e) {
      console.error("Save error:", e);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== "admin") {
    return <div className="text-center text-red-500 py-8">Accès refusé.</div>;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  const previewBanner = {
    ...banner,
    id: bannerId || "preview",
    is_visible: true,
    pages: banner.pages.length > 0 ? banner.pages : ["home"],
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
        <div>
          <h3 className="font-black text-stone-800">Banner événementiel</h3>
          <p className="text-xs text-stone-400 mt-0.5">Affiché sur les pages sélectionnées</p>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="is_visible" className="text-sm font-semibold text-stone-600">
            {banner.is_visible ? "Visible" : "Masqué"}
          </Label>
          <Switch
            id="is_visible"
            checked={banner.is_visible}
            onCheckedChange={(v) => handleField("is_visible", v)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-amber-200 shadow-sm" style={{ borderColor: "#d97706" }}>
        <div>
          <h3 className="font-black text-stone-800">🎉 Bouton Événements</h3>
          <p className="text-xs text-stone-400 mt-0.5">Affiche un bouton or en haut de la Home qui scrolle vers l'événement</p>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="show_event_button" className="text-sm font-semibold text-stone-600">
            {banner.show_event_button ? "Visible" : "Masqué"}
          </Label>
          <Switch
            id="show_event_button"
            checked={banner.show_event_button}
            onCheckedChange={(v) => handleField("show_event_button", v)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm space-y-4">
        <h4 className="font-bold text-stone-700 text-sm uppercase tracking-wide">Contenu</h4>

        <div>
          <Label className="text-xs text-stone-500 mb-1 block">Titre *</Label>
          <input
            value={banner.title}
            onChange={e => handleField("title", e.target.value)}
            placeholder="Titre du banner"
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400 transition-colors"
          />
        </div>
        <div>
          <Label className="text-xs text-stone-500 mb-1 block">Sous-titre</Label>
          <input
            value={banner.subtitle}
            onChange={e => handleField("subtitle", e.target.value)}
            placeholder="Sous-titre"
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400 transition-colors"
          />
        </div>
        <div>
          <Label className="text-xs text-stone-500 mb-1 block">Description</Label>
          <textarea
            value={banner.description}
            onChange={e => handleField("description", e.target.value)}
            placeholder="Description courte"
            rows={3}
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400 transition-colors resize-none"
          />
        </div>
        <div>
          <Label className="text-xs text-stone-500 mb-1 block">Badge (optionnel)</Label>
          <input
            value={banner.badge}
            onChange={e => handleField("badge", e.target.value)}
            placeholder="Ex : 🔥 Nouveau"
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400 transition-colors"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm space-y-4">
        <h4 className="font-bold text-stone-700 text-sm uppercase tracking-wide">Visuel</h4>

        <div>
          <Label className="text-xs text-stone-500 mb-1 block">Image de fond</Label>
          <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm text-stone-500" />
          {uploading && <p className="text-xs text-teal-500 mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Upload en cours...</p>}
          {banner.image_url && !uploading && (
            <div className="mt-2">
              <img src={banner.image_url} alt="" className="w-full h-28 object-cover rounded-xl" />
              <button onClick={() => handleField("image_url", "")} className="text-xs text-red-400 mt-1 hover:underline">Supprimer l'image</button>
            </div>
          )}
        </div>

        <div>
          <Label className="text-xs text-stone-500 mb-1 block">Couleur de fond (si pas d'image)</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={banner.background_color}
              onChange={e => handleField("background_color", e.target.value)}
              className="w-10 h-10 rounded-xl border border-stone-200 cursor-pointer"
            />
            <span className="text-sm text-stone-500">{banner.background_color}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm space-y-4">
        <h4 className="font-bold text-stone-700 text-sm uppercase tracking-wide">Bouton (optionnel)</h4>
        <div>
          <Label className="text-xs text-stone-500 mb-1 block">Texte du bouton</Label>
          <input
            value={banner.button_label}
            onChange={e => handleField("button_label", e.target.value)}
            placeholder="Ex : En savoir plus"
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400 transition-colors"
          />
        </div>
        <div>
          <Label className="text-xs text-stone-500 mb-1 block">URL du bouton (http:// ou nom de page interne)</Label>
          <input
            value={banner.button_url}
            onChange={e => handleField("button_url", e.target.value)}
            placeholder="Ex : https://... ou Activities"
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400 transition-colors"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
        <h4 className="font-bold text-stone-700 text-sm uppercase tracking-wide mb-3">Pages d'affichage *</h4>
        <div className="flex gap-6">
          {[{ id: "home", label: "Accueil" }, { id: "social", label: "Mon Clan" }].map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <Checkbox
                id={`page_${p.id}`}
                checked={banner.pages.includes(p.id)}
                onCheckedChange={() => handlePageToggle(p.id)}
              />
              <Label htmlFor={`page_${p.id}`} className="text-sm cursor-pointer">{p.label}</Label>
            </div>
          ))}
        </div>
      </div>

      {/* Prévisualisation */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowPreview(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-bold text-stone-700 hover:bg-stone-50 transition-colors"
        >
          <span>Prévisualisation</span>
          {showPreview ? <EyeOff className="w-4 h-4 text-stone-400" /> : <Eye className="w-4 h-4 text-stone-400" />}
        </button>
        {showPreview && (
          <div className="pb-2">
            <EventBannerCard pageName={previewBanner.pages[0]} bannerDataOverride={previewBanner} />
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3.5 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
        style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Sauvegarder
      </button>

      {/* ── Section : Envoi de messages ciblés ── */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm space-y-4 mt-2">
        <div className="flex items-center gap-2 mb-1">
          <Send className="w-4 h-4 text-teal-600" />
          <h4 className="font-black text-stone-800">Envoyer un message ciblé</h4>
        </div>
        <p className="text-xs text-stone-400">Envoie une notification in-app à une sélection d'utilisateurs par zone ou par pseudonyme.</p>

        {/* Mode sélection */}
        <div className="flex gap-2">
          {[{ id: "zone", label: "Par zone" }, { id: "select", label: "Par utilisateur" }].map(m => (
            <button
              key={m.id}
              onClick={() => { setSendMode(m.id); setSelectedEmails([]); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                sendMode === m.id ? "text-white border-teal-500" : "bg-stone-50 text-stone-600 border-stone-200"
              }`}
              style={sendMode === m.id ? { backgroundColor: "#4CAF87" } : {}}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Filtre zone */}
        {sendMode === "zone" && (() => {
          const zones = ["all", ...new Set(allProfiles.map(p => p.zoneTag).filter(Boolean))];
          return (
            <div>
              <Label className="text-xs text-stone-500 mb-1 block">Zone</Label>
              <select
                value={msgZone}
                onChange={e => setMsgZone(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400"
              >
                {zones.map(z => (
                  <option key={z} value={z}>{z === "all" ? "Toutes les zones" : z}</option>
                ))}
              </select>
              <p className="text-xs text-stone-400 mt-1">
                {msgZone === "all"
                  ? `${allUsers.length} utilisateurs`
                  : `${allProfiles.filter(p => p.zoneTag === msgZone).length} utilisateurs dans cette zone`
                }
              </p>
            </div>
          );
        })()}

        {/* Sélection par pseudo/email */}
        {sendMode === "select" && (
          <div>
            <Label className="text-xs text-stone-500 mb-1 block">Rechercher par pseudo ou email</Label>
            <input
              value={msgSearch}
              onChange={e => setMsgSearch(e.target.value)}
              placeholder="Tapez un pseudo ou email..."
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400"
            />
            {msgSearch.length >= 2 && (() => {
              const q = msgSearch.toLowerCase();
              const results = allProfiles.filter(p =>
                p.pseudo?.toLowerCase().includes(q) ||
                p.created_by?.toLowerCase().includes(q)
              ).slice(0, 10);
              return results.length > 0 ? (
                <div className="mt-2 border border-stone-200 rounded-xl overflow-hidden">
                  {results.map(p => {
                    const checked = selectedEmails.includes(p.created_by);
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedEmails(prev =>
                          checked ? prev.filter(e => e !== p.created_by) : [...prev, p.created_by]
                        )}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${checked ? "bg-teal-50" : "hover:bg-stone-50"}`}
                      >
                        {p.photo_url
                          ? <img src={p.photo_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                          : <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-700">{p.pseudo?.[0]?.toUpperCase()}</div>
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-stone-800 truncate">{p.pseudo}</p>
                          <p className="text-xs text-stone-400 truncate">{p.zoneTag || ""} · {p.created_by}</p>
                        </div>
                        <div className={`w-4 h-4 rounded border-2 flex-shrink-0 transition-colors ${checked ? "border-teal-500 bg-teal-500" : "border-stone-300"}`}>
                          {checked && <svg viewBox="0 0 10 8" className="w-full p-0.5 fill-white"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" /></svg>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : <p className="text-xs text-stone-400 mt-2">Aucun résultat</p>;
            })()}
            {selectedEmails.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedEmails.map(email => {
                  const p = allProfiles.find(x => x.created_by === email);
                  return (
                    <span key={email} className="flex items-center gap-1 bg-teal-100 text-teal-700 text-xs font-semibold px-2 py-1 rounded-full">
                      {p?.pseudo || email}
                      <button onClick={() => setSelectedEmails(prev => prev.filter(e => e !== email))} className="text-teal-400 hover:text-teal-700">×</button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Message */}
        <div>
          <Label className="text-xs text-stone-500 mb-1 block">Titre de la notification *</Label>
          <input
            value={msgTitle}
            onChange={e => setMsgTitle(e.target.value)}
            placeholder="Ex : 🐾 Nouveau spot près de chez vous !"
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400"
          />
        </div>
        <div>
          <Label className="text-xs text-stone-500 mb-1 block">Corps du message *</Label>
          <textarea
            value={msgBody}
            onChange={e => setMsgBody(e.target.value)}
            placeholder="Texte de la notification..."
            rows={3}
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400 resize-none"
          />
        </div>

        <button
          disabled={sending || !msgTitle || !msgBody || (sendMode === "select" && selectedEmails.length === 0)}
          onClick={async () => {
            setSending(true);
            try {
              let recipients = [];
              if (sendMode === "zone") {
                const targetProfiles = msgZone === "all"
                  ? allProfiles
                  : allProfiles.filter(p => p.zoneTag === msgZone);
                recipients = targetProfiles.map(p => p.created_by).filter(Boolean);
              } else {
                recipients = selectedEmails;
              }

              if (recipients.length === 0) {
                toast.error("Aucun destinataire trouvé");
                return;
              }

              let sent = 0;
              for (let i = 0; i < recipients.length; i += 20) {
                const batch = recipients.slice(i, i + 20);
                await Promise.all(batch.map(email =>
                  base44.entities.Notification.create({
                    user_email: email,
                    type: "match_suggestion",
                    title: msgTitle,
                    body: msgBody,
                    is_read: false,
                  })
                ));
                sent += batch.length;
              }

              const logEntry = await base44.entities.MarketingLog.create({
                title: msgTitle,
                body: msgBody,
                sent_by: user.email,
                send_mode: sendMode,
                zone: sendMode === "zone" ? msgZone : null,
                recipient_count: sent,
                recipient_emails: sendMode === "select" ? selectedEmails : [],
              }).catch(() => null);
              if (logEntry) setMarketingLogs(prev => [logEntry, ...prev]);

              toast.success(`✅ Message envoyé à ${sent} utilisateur${sent > 1 ? "s" : ""} !`);
              setMsgTitle("");
              setMsgBody("");
              setSelectedEmails([]);
              setMsgSearch("");
            } catch (e) {
              console.error(e);
              toast.error("Erreur lors de l'envoi");
            } finally {
              setSending(false);
            }
          }}
          className="w-full py-3 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #FF7A59, #e8634a)" }}
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? "Envoi en cours..." : (
            sendMode === "zone"
              ? `Envoyer ${msgZone === "all" ? `à tous (${allUsers.length})` : `à la zone "${msgZone}"`}`
              : `Envoyer à ${selectedEmails.length} utilisateur${selectedEmails.length > 1 ? "s" : ""}`
          )}
        </button>
      </div>

      {/* ── Historique des envois ── */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden mt-2">
        <button
          onClick={() => setLogsExpanded(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-bold text-stone-700 hover:bg-stone-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-stone-400" />
            <span>Historique des envois</span>
            <span className="bg-stone-100 text-stone-500 text-xs font-semibold px-2 py-0.5 rounded-full">{marketingLogs.length}</span>
          </div>
          {logsExpanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
        </button>

        {logsExpanded && (
          <div className="divide-y divide-stone-50">
            {marketingLogs.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-8">Aucun envoi encore enregistré.</p>
            ) : (
              marketingLogs.map(log => (
                <div key={log.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-stone-800 truncate">{log.title}</p>
                      <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{log.body}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-600">
                          👥 {log.recipient_count} destinataire{log.recipient_count > 1 ? "s" : ""}
                        </span>
                        {log.send_mode === "zone" && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                            📍 {log.zone === "all" ? "Toutes zones" : log.zone}
                          </span>
                        )}
                        {log.send_mode === "select" && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                            🎯 Sélection manuelle
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[11px] text-stone-400">
                        {new Date(log.created_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <p className="text-[11px] text-stone-300 mt-0.5 truncate max-w-[120px]">{log.sent_by}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}