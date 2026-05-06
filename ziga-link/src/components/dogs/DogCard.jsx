import { Edit, Trash2, Thermometer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const sizeLabels = { small: "Petit", medium: "Moyen", large: "Grand" };
const energyLabels = { low: "Calme", medium: "Modéré", high: "Énergique" };

export default function DogCard({ dog, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-amber-100">
      <div className="flex items-start gap-4">
        {dog.photo_url ? (
          <img src={dog.photo_url} alt={dog.name} className="w-16 h-16 rounded-full object-cover border-2 border-amber-200" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-3xl border-2 border-amber-200">
            🐶
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-amber-900 text-lg">{dog.name}</h3>
            {dog.gender === "female" && dog.is_in_heat && (
              <Badge className="bg-red-100 text-red-600 border-red-200 text-xs gap-1">
                <Thermometer className="w-3 h-3" /> En chaleur
              </Badge>
            )}
          </div>
          {dog.breed && <p className="text-amber-600 text-sm">{dog.breed}</p>}
          {dog.bio && <p className="text-amber-700 text-sm mt-1">{dog.bio}</p>}
          <div className="flex flex-wrap gap-2 mt-2">
            {dog.size && <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">{sizeLabels[dog.size]}</span>}
            {dog.age_years && <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">{dog.age_years} an{dog.age_years > 1 ? "s" : ""}</span>}
            {dog.energy_level && <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">{energyLabels[dog.energy_level]}</span>}
            {dog.vaccinated && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">✓ Vacciné</span>}
            {dog.sterilized && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">✓ Stérilisé</span>}
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={onEdit} className="text-amber-600 hover:bg-amber-50 h-8 w-8">
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-red-400 hover:bg-red-50 h-8 w-8">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}