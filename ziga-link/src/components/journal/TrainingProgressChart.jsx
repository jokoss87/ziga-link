import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format, subDays } from "date-fns";
import { parseUTC } from "@/components/lib/dateUtils";
import { fr } from "date-fns/locale";
import { Download, Mail, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

function extractNote(entry) {
  if (!entry.notes) return null;
  const match = entry.notes.match(/Note\s*:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
  return match ? parseFloat(match[1]) : null;
}

function extractSuccessScore(entry) {
  const successMap = { "Faible": 2, "Moyenne": 5, "Bonne": 8, "Excellente": 10 };
  if (!entry.notes) return null;
  const scores = [];
  entry.notes.split("\n").forEach(line => {
    Object.entries(successMap).forEach(([key, val]) => {
      if (line.includes(`(${key})`)) scores.push(val);
    });
  });
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

const PERIODS = [
  { label: "7j", days: 7 },
  { label: "30j", days: 30 },
  { label: "3 mois", days: 90 },
  { label: "Tout", days: 0 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-lg px-3 py-2">
      <p className="text-xs font-bold text-stone-600 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name} : <strong>{p.value}/10</strong>
        </p>
      ))}
    </div>
  );
};



export default function TrainingProgressChart({ entries, dogName, dogId }) {
  const [period, setPeriod] = useState("30j");
  const [exporting, setExporting] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [educatorEmail, setEducatorEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleExportPDF = async () => {
    setExporting(true);
    const res = await base44.functions.invoke("generateTrainingPDF", {
      dog_id: dogId,
      dog_name: dogName,
    });
    if (res.data?.pdf_base64) {
      const link = document.createElement("a");
      link.href = res.data.pdf_base64;
      link.download = `bilan-${(dogName || "chien").toLowerCase().replace(/\s/g, "_")}-${format(new Date(), "MM-yyyy")}.pdf`;
      link.click();
    }
    setExporting(false);
  };

  const handleSendEmail = async () => {
    if (!educatorEmail) return;
    setEmailSending(true);
    await base44.functions.invoke("generateTrainingPDF", {
      dog_id: dogId,
      dog_name: dogName,
      send_email: true,
      educator_email: educatorEmail,
    });
    setEmailSending(false);
    setEmailSent(true);
    setTimeout(() => { setShowEmailModal(false); setEmailSent(false); setEducatorEmail(""); }, 2000);
  };

  const data = useMemo(() => {
    const periodDays = PERIODS.find(p => p.label === period)?.days || 0;
    const cutoff = periodDays > 0 ? subDays(new Date(), periodDays) : null;

    const filtered = [...entries]
      .filter(e => (e.session_type === "obeissance" || e.notes?.match(/Note\s*:\s*\d/i)))
      .filter(e => !cutoff || parseUTC(e.created_date) >= cutoff)
      .sort((a, b) => parseUTC(a.created_date) - parseUTC(b.created_date))
      .slice(-30);

    return filtered.map(e => ({
      date: e.created_date ? format(parseUTC(e.created_date), "d MMM", { locale: fr }) : "—",
      note: extractNote(e),
      reussite: extractSuccessScore(e),
    })).filter(d => d.note !== null || d.reussite !== null);
  }, [entries, period]);

  if (data.length < 2) {
    return (
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 text-center">
        <div className="text-3xl mb-2">📈</div>
        <p className="text-sm font-semibold text-stone-600">Progression disponible après 2+ séances notées</p>
        <p className="text-xs text-stone-400 mt-1">Remplissez vos fiches avec une note /10</p>
      </div>
    );
  }

  const notedData = data.filter(d => d.note !== null);
  const avgNote = notedData.length > 0
    ? notedData.reduce((s, d) => s + d.note, 0) / notedData.length
    : 0;
  const trend = notedData.length >= 3
    ? notedData[notedData.length - 1].note > notedData[0].note ? "📈 En progression"
      : notedData[notedData.length - 1].note < notedData[0].note ? "📉 En régression"
      : "➡️ Stable"
    : null;

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-stone-800">📈 Progression des séances</h3>
          <p className="text-xs text-stone-400">
            {data.length} séances · Moyenne : <strong className="text-[#4CAF87]">{avgNote.toFixed(1)}/10</strong>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {trend && (
            <span className="text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 px-2 py-1 rounded-full">{trend}</span>
          )}
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-1 text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-600 px-2.5 py-1.5 rounded-full transition-colors disabled:opacity-60"
            title="Télécharger le bilan PDF"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            PDF
          </button>
          <button
            onClick={() => setShowEmailModal(true)}
            className="flex items-center gap-1 text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 px-2.5 py-1.5 rounded-full transition-colors"
            title="Envoyer à mon éducateur"
          >
            <Mail className="w-3.5 h-3.5" />
            Envoyer
          </button>
        </div>
      </div>

      {/* Filtres période */}
      <div className="flex gap-1.5 px-4 pb-2">
        {PERIODS.map(p => (
          <button
            key={p.label}
            onClick={() => setPeriod(p.label)}
            className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
              period === p.label
                ? "bg-[#4CAF87] text-white border-[#4CAF87]"
                : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Graphique */}
      <div className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#a8a29e" }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 10]} ticks={[0, 5, 10]} tick={{ fontSize: 10, fill: "#a8a29e" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            {avgNote > 0 && <ReferenceLine y={avgNote} stroke="#4CAF87" strokeDasharray="4 4" strokeOpacity={0.4} />}
            <Line type="monotone" dataKey="note" name="Note globale" stroke="#4CAF87" strokeWidth={2.5}
              dot={{ fill: "#4CAF87", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: "#3d9e78" }} connectNulls />
            <Line type="monotone" dataKey="reussite" name="Réussite exercices" stroke="#6366f1" strokeWidth={2}
              strokeDasharray="5 3" dot={{ fill: "#6366f1", r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 px-4 pb-3">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-[#4CAF87] inline-block rounded-full" />
          <span className="text-[10px] text-stone-400">Note /10</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-indigo-400 inline-block rounded-full" />
          <span className="text-[10px] text-stone-400">Réussite exercices</span>
        </div>
      </div>

      {/* Modal envoi email éducateur */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setShowEmailModal(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-8" onClick={e => e.stopPropagation()}>
            {emailSent ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-2">✅</div>
                <p className="font-bold text-stone-800">Bilan envoyé !</p>
                <p className="text-sm text-stone-400 mt-1">L'éducateur a reçu le bilan par email.</p>
              </div>
            ) : (
              <>
                <h3 className="text-base font-black text-stone-800 mb-1">Envoyer à mon éducateur</h3>
                <p className="text-xs text-stone-400 mb-4">Le bilan du mois de {dogName || "votre chien"} sera envoyé par email.</p>
                <input
                  type="email"
                  placeholder="Email de l'éducateur canin"
                  value={educatorEmail}
                  onChange={e => setEducatorEmail(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-400 mb-3"
                />
                <button
                  onClick={handleSendEmail}
                  disabled={emailSending || !educatorEmail}
                  className="w-full bg-[#4CAF87] hover:bg-[#3d9e78] disabled:opacity-60 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  {emailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  {emailSending ? "Envoi en cours..." : "Envoyer le bilan"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}