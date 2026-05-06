import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { PawPrint, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import DogCard from "@/components/dogs/DogCard";
import DogFormModal from "@/components/dogs/DogFormModal";
import { invalidateUserLevelCache } from "@/components/lib/userLevelCache";

export default function MyDogs() {
  const { user } = useUserProfile();
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDog, setEditingDog] = useState(null);

  useEffect(() => {
    if (user) loadDogs();
  }, [user?.email]);

  const loadDogs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const myDogs = await base44.entities.DogProfile.filter({ created_by: user.email }).catch(() => []);
      setDogs(myDogs);
    } catch (err) {
      console.error("Erreur chargement chiens:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (dogId) => {
    if (!window.confirm("Supprimer ce chien définitivement ?")) return;
    try {
      await base44.entities.DogProfile.delete(dogId);
      invalidateUserLevelCache(user?.email);
      setDogs(prev => prev.filter(d => d.id !== dogId));
    } catch (err) {
      console.error("Erreur suppression chien:", err);
      loadDogs();
    }
  };

  const handleEdit = (dog) => {
    setEditingDog(dog);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingDog(null);
    invalidateUserLevelCache(user?.email);
    loadDogs();
  };

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 px-6 py-8 text-white">
        <div className="max-w-2xl mx-auto">
          <Link to={createPageUrl("Home")} className="flex items-center gap-2 text-amber-100 hover:text-white mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <PawPrint className="w-7 h-7" /> Mes chiens
              </h1>
              <p className="text-amber-100 mt-1">{dogs.length} profil{dogs.length !== 1 ? "s" : ""}</p>
            </div>
            <Button onClick={() => setShowForm(true)} className="bg-white text-amber-600 hover:bg-amber-50 gap-2">
              <Plus className="w-4 h-4" /> Ajouter
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-400 border-t-transparent" />
          </div>
        ) : dogs.length === 0 ? (
          <div className="text-center py-16 text-amber-600">
            <PawPrint className="w-16 h-16 mx-auto mb-4 opacity-40" />
            <p className="font-semibold text-lg">Aucun chien enregistré</p>
            <p className="text-amber-500 text-sm mt-1 mb-6">Ajoutez votre premier compagnon !</p>
            <Button onClick={() => setShowForm(true)} className="bg-amber-400 hover:bg-amber-500 text-white gap-2">
              <Plus className="w-4 h-4" /> Ajouter mon chien
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {dogs.map((dog) => (
              <DogCard key={dog.id} dog={dog} onEdit={() => handleEdit(dog)} onDelete={() => handleDelete(dog.id)} />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <DogFormModal dog={editingDog} onClose={handleClose} />
      )}
    </div>
  );
}