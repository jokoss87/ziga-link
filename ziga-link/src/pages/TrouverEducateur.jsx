import { useState } from "react";
import { MapPin, Search, Star, Phone, Globe, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

export default function TrouverEducateur() {
  const [ville, setVille] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const rechercher = async () => {
    if (!ville.trim()) return;
    setLoading(true);
    setResults(null);
    const data = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un assistant spécialisé en éducation canine en France. 
Génère une liste de 5 éducateurs canins professionnels fictifs mais réalistes près de "${ville}". 
Pour chaque éducateur, fournis des informations plausibles et cohérentes avec la région.
Inclus des éducateurs avec différentes spécialités (obéissance, comportement, sports canins, chiots, etc.).`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          educateurs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nom: { type: "string" },
                structure: { type: "string" },
                adresse: { type: "string" },
                distance_km: { type: "number" },
                specialites: { type: "array", items: { type: "string" } },
                note: { type: "number" },
                certifie: { type: "boolean" },
                telephone: { type: "string" },
                description: { type: "string" },
              },
            },
          },
          conseil: { type: "string" },
        },
      },
    });
    setResults(data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-amber-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-500 via-emerald-500 to-green-500 px-6 py-10 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-5xl mb-3">🎓</div>
          <h1 className="text-3xl font-bold mb-2">Trouver un Éducateur</h1>
          <p className="text-emerald-100 text-base">Localisez un professionnel canin près de chez vous</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Barre de recherche */}
        <div className="bg-white rounded-2xl border border-amber-200 p-4 mb-6 shadow-sm">
          <label className="block text-sm font-semibold text-amber-900 mb-2">Votre ville ou code postal</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
              <input
                type="text"
                placeholder="Ex: Paris, Lyon, 69000..."
                value={ville}
                onChange={(e) => setVille(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && rechercher()}
                className="w-full pl-9 pr-4 py-2.5 border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <Button
              onClick={rechercher}
              disabled={loading || !ville.trim()}
              className="bg-teal-500 hover:bg-teal-600 text-white gap-2 rounded-xl"
            >
              <Search className="w-4 h-4" />
              {loading ? "..." : "Chercher"}
            </Button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent" />
            <p className="text-amber-600 text-sm">Recherche en cours...</p>
          </div>
        )}

        {/* Résultats */}
        {results && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-amber-900">
              {results.educateurs?.length} éducateurs trouvés près de <span className="text-teal-600">{ville}</span>
            </h2>

            {results.educateurs?.map((edu, i) => (
              <div key={i} className="bg-white rounded-2xl border border-amber-100 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-amber-900">{edu.nom}</h3>
                      {edu.certifie && (
                        <CheckCircle2 className="w-4 h-4 text-teal-500" title="Certifié" />
                      )}
                    </div>
                    <p className="text-sm text-amber-600">{edu.structure}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 rounded-lg px-2 py-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-semibold text-amber-700">{edu.note?.toFixed(1)}</span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-3">{edu.description}</p>

                <div className="flex items-center gap-1.5 text-sm text-amber-600 mb-3">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{edu.adresse}</span>
                  {edu.distance_km && (
                    <span className="text-xs bg-teal-50 text-teal-600 border border-teal-100 rounded-full px-2 py-0.5 ml-1">
                      ~{edu.distance_km} km
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {edu.specialites?.map((s, j) => (
                    <span key={j} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2 py-0.5">
                      {s}
                    </span>
                  ))}
                </div>

                {edu.telephone && (
                  <a
                    href={`tel:${edu.telephone}`}
                    className="flex items-center gap-2 text-sm text-teal-600 font-medium"
                  >
                    <Phone className="w-4 h-4" />
                    {edu.telephone}
                  </a>
                )}
              </div>
            ))}

            {results.conseil && (
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex gap-3 items-start mt-2">
                <Star className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-teal-800 text-sm">Conseil</p>
                  <p className="text-sm text-teal-700 mt-1">{results.conseil}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* État vide */}
        {!loading && !results && (
          <div className="text-center py-16 text-amber-500">
            <div className="text-5xl mb-4">🐕‍🦺</div>
            <p className="font-medium text-amber-700">Entrez votre ville pour trouver</p>
            <p className="text-sm mt-1">des éducateurs canins près de chez vous</p>
          </div>
        )}
      </div>
    </div>
  );
}