import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useUserProfile } from "@/components/useUserProfile";
import { ArrowLeft, PawPrint, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import LocationPicker from "@/components/location/LocationPicker";

export default function EditAnnouncement() {
  const navigate = useNavigate();
  const { user } = useUserProfile();
  const [searchParams] = useSearchParams();
  const announcementId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    city: "",
    latitude: null,
    longitude: null,
    duration_minutes: "",
    distance_km: "",
  });

  useEffect(() => {
    if (!announcementId) { navigate(createPageUrl("Home")); return; }
    if (user) loadData();
  }, [announcementId, user?.email]);

  const loadData = async () => {
    if (!user) return;
    try {
      const anns = await base44.entities.MeetupAnnouncement.filter({ id: announcementId });
      if (anns.length === 0) { navigate(createPageUrl("Home")); return; }
      const a = anns[0];
      if (user?.email !== a.created_by) {
        navigate(`${createPageUrl("AnnouncementDetail")}?id=${announcementId}`);
        return;
      }
      setForm({
        title: a.title || "",
        description: a.description || "",
        date: a.date || "",
        time: a.time || "",
        city: a.city || "",
        latitude: a.latitude || null,
        longitude: a.longitude || null,
        duration_minutes: a.duration_minutes || "",
        distance_km: a.distance_km || "",
      });
    } catch (err) {
      console.error("Erreur chargement annonce:", err);
      navigate(createPageUrl("Home"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.MeetupAnnouncement.update(announcementId, {
        ...form,
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined,
        distance_km: form.distance_km ? Number(form.distance_km) : undefined,
      });
      navigate(`${createPageUrl("AnnouncementDetail")}?id=${announcementId}`);
    } catch (err) {
      console.error("Erreur sauvegarde annonce:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 px-6 py-8 text-white">
        <div className="max-w-xl mx-auto">
          <Link to={`${createPageUrl("AnnouncementDetail")}?id=${announcementId}`} className="flex items-center gap-2 text-amber-100 hover:text-white mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PawPrint className="w-7 h-7" /> Modifier l'annonce
          </h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-2xl p-6 shadow-sm border border-amber-100">
          <div>
            <label className="block text-sm font-semibold text-amber-900 mb-1.5">Titre *</label>
            <Input
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              required
              className="border-amber-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-amber-900 mb-1.5">Description</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              className="border-amber-200"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-amber-900 mb-1.5">
                <Calendar className="w-4 h-4 inline mr-1" />Date *
              </label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                required
                className="border-amber-200"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-amber-900 mb-1.5">Heure</label>
              <Input
                type="time"
                value={form.time}
                onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))}
                className="border-amber-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-amber-700 mb-1">⏱ Durée prévue (min)</label>
              <Input
                type="number"
                min="15"
                value={form.duration_minutes}
                onChange={(e) => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                className="border-amber-200"
              />
            </div>
            <div>
              <label className="block text-xs text-amber-700 mb-1">📍 Distance (km)</label>
              <Input
                type="number"
                min="0.1"
                step="0.1"
                value={form.distance_km}
                onChange={(e) => setForm(f => ({ ...f, distance_km: e.target.value }))}
                className="border-amber-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-amber-900 mb-1.5">Ville</label>
            <Input
              value={form.city}
              onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))}
              className="border-amber-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-amber-900 mb-1.5">
              <MapPin className="w-4 h-4 inline mr-1" />Localisation
            </label>
            <LocationPicker
              latitude={form.latitude}
              longitude={form.longitude}
              city={form.city}
              accentColor="amber"
              onLocationChange={({ latitude, longitude, city }) =>
                setForm(f => ({ ...f, latitude, longitude, city: city || f.city }))
              }
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={saving} className="flex-1 bg-amber-400 hover:bg-amber-500 text-white font-semibold">
              {saving ? "Sauvegarde..." : "Enregistrer les modifications"}
            </Button>
            <Link to={`${createPageUrl("AnnouncementDetail")}?id=${announcementId}`}>
              <Button type="button" variant="outline" className="border-amber-200">Annuler</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}