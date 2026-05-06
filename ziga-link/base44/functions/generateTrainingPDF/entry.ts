import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { jsPDF } from 'npm:jspdf@4.0.0';

function extractNote(notes) {
  if (!notes) return null;
  const match = notes.match(/Note\s*:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
  return match ? parseFloat(match[1]) : null;
}

function extractSuccessScore(notes) {
  if (!notes) return null;
  const successMap = { "Faible": 2, "Moyenne": 5, "Bonne": 8, "Excellente": 10 };
  const scores = [];
  notes.split("\n").forEach(line => {
    Object.entries(successMap).forEach(([key, val]) => {
      if (line.includes(`(${key})`)) scores.push(val);
    });
  });
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatMonth(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Non autorisé" }, { status: 401 });

    const { dog_id, dog_name, send_email, educator_email } = await req.json();

    // Récupérer les entrées du dernier mois pour ce chien/user
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const allEntries = await base44.entities.ProgressEntry.filter(
      { created_by: user.email, dog_id },
      "-created_date",
      100
    );

    const entries = allEntries
      .filter(e => new Date(e.created_date) >= thirtyDaysAgo)
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

    const obEntries = entries.filter(e =>
      e.session_type === "obeissance" || e.notes?.match(/Note\s*:\s*\d/i)
    );

    const notes = obEntries.map(e => extractNote(e.notes)).filter(n => n !== null);
    const avgNote = notes.length > 0 ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1) : null;
    const maxNote = notes.length > 0 ? Math.max(...notes) : null;
    const trend = notes.length >= 2
      ? notes[notes.length - 1] > notes[0] ? "En progression ↑"
        : notes[notes.length - 1] < notes[0] ? "En régression ↓"
        : "Stable →"
      : null;

    const now = new Date();
    const monthLabel = formatMonth(now.toISOString());

    // Génération PDF
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // En-tête vert
    doc.setFillColor(76, 175, 135);
    doc.rect(0, 0, 210, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Paw Spot", 14, 13);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Bilan de Progression - " + (dog_name || "Mon chien"), 14, 22);
    doc.setFontSize(10);
    doc.text(monthLabel, 14, 29);

    // Sous-titre propriétaire
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.text("Propriétaire : " + (user.full_name || user.email), 130, 13);
    doc.text("Généré le : " + formatDate(now.toISOString()), 130, 20);

    let y = 42;

    // Bloc stats
    doc.setFillColor(245, 247, 245);
    doc.roundedRect(14, y - 5, 182, 32, 3, 3, "F");
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Résumé du mois", 20, y + 3);

    const cols = [
      { label: "Séances", val: `${obEntries.length}` },
      { label: "Note moyenne", val: avgNote ? `${avgNote}/10` : "—" },
      { label: "Meilleure note", val: maxNote ? `${maxNote}/10` : "—" },
      { label: "Tendance", val: trend || "—" },
    ];
    doc.setFontSize(9);
    cols.forEach((c, i) => {
      const x = 20 + i * 46;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(c.label, x, y + 13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(76, 175, 135);
      doc.text(c.val, x, y + 21);
    });

    y += 40;

    // Tableau séances
    if (obEntries.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text("Détail des séances", 14, y);
      y += 7;

      // Header
      doc.setFillColor(76, 175, 135);
      doc.rect(14, y - 5, 182, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Date", 16, y);
      doc.text("Titre", 42, y);
      doc.text("Durée", 120, y);
      doc.text("Humeur", 143, y);
      doc.text("Note", 172, y);
      y += 5;

      const moodMap = { excellent: "Excellent ★", bien: "Bien", moyen: "Moyen", difficile: "Difficile" };

      obEntries.forEach((e, i) => {
        if (y > 265) { doc.addPage(); y = 20; }
        if (i % 2 === 0) {
          doc.setFillColor(248, 252, 249);
          doc.rect(14, y - 4, 182, 8, "F");
        }
        const note = extractNote(e.notes);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text(formatDate(e.created_date), 16, y);
        doc.text((e.title || "").substring(0, 32), 42, y);
        doc.text(e.duration_minutes ? `${e.duration_minutes} min` : "—", 120, y);
        doc.text(moodMap[e.mood] || "—", 143, y);
        if (note !== null) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(note >= 7 ? 76 : note >= 5 ? 230 : 220, note >= 7 ? 175 : note >= 5 ? 130 : 80, note >= 7 ? 135 : 30);
          doc.text(`${note}/10`, 172, y);
        } else {
          doc.setTextColor(150, 150, 150);
          doc.text("—", 172, y);
        }
        doc.setTextColor(80, 80, 80);
        doc.setFont("helvetica", "normal");
        y += 8;
      });

      y += 6;

      // Progression note (mini graphique textuel)
      if (notes.length >= 2 && y < 240) {
        doc.setFillColor(245, 247, 245);
        doc.roundedRect(14, y - 4, 182, notes.length * 6 + 18, 3, 3, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.text("Évolution des notes", 20, y + 4);
        y += 12;
        doc.setFontSize(8);
        notes.forEach((note, i) => {
          if (y > 270) return;
          const barWidth = Math.round((note / 10) * 80);
          doc.setFillColor(76, 175, 135);
          doc.rect(50, y - 4, barWidth, 4, "F");
          doc.setTextColor(100, 100, 100);
          doc.setFont("helvetica", "normal");
          doc.text(`Séance ${i + 1}`, 20, y);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(76, 175, 135);
          doc.text(`${note}/10`, 135, y);
          y += 6;
        });
        y += 6;
      }

      // Exercices travaillés
      const allExercises = {};
      obEntries.forEach(e => {
        (e.exercises || []).forEach(ex => {
          allExercises[ex] = (allExercises[ex] || 0) + 1;
        });
      });
      const masteredExercises = Object.entries(allExercises)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      if (masteredExercises.length > 0 && y < 260) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.text("Exercices travaillés", 14, y);
        y += 6;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        masteredExercises.forEach(([ex, count]) => {
          if (y > 275) return;
          doc.setTextColor(80, 80, 80);
          doc.text(`• ${ex}`, 18, y);
          doc.setTextColor(76, 175, 135);
          doc.setFont("helvetica", "bold");
          doc.text(`${count} fois`, 120, y);
          doc.setFont("helvetica", "normal");
          y += 6;
        });
      }
    } else {
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(10);
      doc.text("Aucune séance d'obéissance enregistrée ce mois.", 14, y);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(`Paw Spot · Bilan généré le ${formatDate(now.toISOString())} · Suivi canin communautaire`, 14, 290);

    // Retourner PDF en base64
    const pdfBase64 = doc.output("datauristring");

    // Envoi email si demandé
    if (send_email && educator_email) {
      await base44.integrations.Core.SendEmail({
        to: educator_email,
        subject: `Bilan de progression de ${dog_name || "mon chien"} - ${monthLabel}`,
        body: `Bonjour,\n\nVeuillez trouver ci-joint le bilan de progression de ${dog_name || "mon chien"} pour le mois de ${monthLabel}.\n\nRésumé :\n- Séances : ${obEntries.length}\n- Note moyenne : ${avgNote || "—"}/10\n- Tendance : ${trend || "—"}\n\nCordialement,\n${user.full_name || "Un utilisateur Paw Spot"}\n\n---\nBilan partagé via Paw Spot`,
      });
    }

    return Response.json({ pdf_base64: pdfBase64, session_count: obEntries.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});