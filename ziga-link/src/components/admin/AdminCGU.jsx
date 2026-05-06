import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Save, Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const FIELDS = [
  { key: "version", label: "Version", type: "input", placeholder: "Ex: 1.1" },
  { key: "effective_date", label: "Date d'entrée en vigueur", type: "input", placeholder: "2026-01-01" },
  { key: "intro", label: "Introduction", type: "textarea", rows: 3 },
  { key: "license", label: "Licence d'usage", type: "textarea", rows: 4 },
  { key: "allowed", label: "Ce que l'utilisateur peut faire", type: "textarea", rows: 5 },
  { key: "forbidden", label: "Ce que l'utilisateur ne peut pas faire", type: "textarea", rows: 5 },
  { key: "legal_recourse", label: "Recours légaux en cas de violation", type: "textarea", rows: 5 },
  { key: "contact", label: "Email de contact légal", type: "input", placeholder: "legal@zigalink.fr" },
];

export default function AdminCGU() {
  const [doc, setDoc] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadDoc(); }, []);

  const loadDoc = async () => {
    setLoading(true);
    const docs = await base44.entities.LegalDocument.filter({ is_active: true }, "-created_date", 1);
    const d = docs[0] || null;
    setDoc(d);
    setForm(d ? {
      version: d.version || "",
      effective_date: d.effective_date || "",
      intro: d.intro || "",
      license: d.license || "",
      allowed: d.allowed || "",
      forbidden: d.forbidden || "",
      legal_recourse: d.legal_recourse || "",
      contact: d.contact || "",
    } : {
      version: "1.0",
      effective_date: new Date().toISOString().split("T")[0],
      intro: "Bienvenue sur ZIGA LINK. En utilisant cette application, vous acceptez les présentes conditions générales d'utilisation.",
      license: "",
      allowed: "",
      forbidden: "",
      legal_recourse: "",
      contact: "legal@zigalink.fr",
      is_active: true,
    });
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    if (doc?.id) {
      await base44.entities.LegalDocument.update(doc.id, { ...form, is_active: true });
    } else {
      await base44.entities.LegalDocument.create({ ...form, is_active: true });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    loadDoc();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-400 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="font-bold text-stone-800">Conditions d'utilisation (CGU)</h2>
            <p className="text-xs text-stone-400">{doc ? `Version active : ${doc.version}` : "Aucune CGU publiée"}</p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-teal-500 hover:bg-teal-600 text-white rounded-xl gap-2 text-sm"
        >
          <Save className="w-4 h-4" />
          {saving ? "Sauvegarde..." : saved ? "✓ Sauvegardé !" : "Publier"}
        </Button>
      </div>

      <div className="space-y-4">
        {FIELDS.map(({ key, label, type, placeholder, rows }) => (
          <div key={key} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
            <label className="block text-sm font-semibold text-stone-700 mb-2">{label}</label>
            {type === "textarea" ? (
              <Textarea
                value={form[key] || ""}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                rows={rows}
                className="border-stone-200 text-sm resize-none"
                placeholder={placeholder}
              />
            ) : (
              <Input
                value={form[key] || ""}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="border-stone-200 text-sm"
                placeholder={placeholder}
              />
            )}
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
        <p className="text-xs text-amber-700">
          <strong>Note :</strong> En cliquant sur "Publier", les nouvelles CGU deviennent immédiatement actives. Les utilisateurs devront les accepter lors de leur prochaine création de profil.
        </p>
      </div>
    </div>
  );
}