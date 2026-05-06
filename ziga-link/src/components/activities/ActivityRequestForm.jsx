import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

export default function ActivityRequestForm({ activity, currentUser, onClose, onSubmit }) {
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDog, setSelectedDog] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadDogs();
  }, []);

  const loadDogs = async () => {
    if (!currentUser?.email) return;
    const dogsData = await base44.entities.DogProfile.filter({ created_by: currentUser.email });
    setDogs(dogsData);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!selectedDog) return;
    setSending(true);
    const dog = dogs.find((d) => d.id === selectedDog);
    const userProfile = await base44.entities.UserProfile.filter({ created_by: currentUser.email });
    const userPseudo = userProfile[0]?.pseudo || currentUser.full_name || currentUser.email;

    await base44.entities.MeetupRequest.create({
      announcement_id: activity.id,
      requester_dog_id: selectedDog,
      requester_dog_name: dog?.name || "",
      requester_name: userPseudo,
      message,
      status: "pending",
      type: "activity",
    });

    // Notifier le créateur
    if (activity.created_by && activity.created_by !== currentUser.email) {
      await base44.entities.Notification.create({
        user_email: activity.created_by,
        type: "activity_request",
        title: `🏅 Nouvelle demande pour votre activité !`,
        body: `${userPseudo} avec ${dog?.name} veut rejoindre "${activity.title}"`,
        reference_id: activity.id,
        link_page: "Activities",
        link_param: `id=${activity.id}`,
        is_read: false,
      });
    }

    setSending(false);
    onSubmit?.();
    onClose();
  };

  if (loading) {
    return <div className="text-center text-stone-400 py-4">Chargement...</div>;
  }

  if (dogs.length === 0) {
    return (
      <div className="text-center text-stone-500 py-4">
        <p className="text-sm">Vous devez avoir au moins un chien pour rejoindre une activité.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-stone-800">Rejoindre l'activité</h3>
      <Select value={selectedDog} onValueChange={setSelectedDog}>
        <SelectTrigger className="border-purple-200">
          <SelectValue placeholder="Sélectionnez votre chien..." />
        </SelectTrigger>
        <SelectContent>
          {dogs.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message optionnel (présentez votre chien, parlez de vos attentes...)"
        className="border-purple-200"
        rows={3}
      />
      <div className="flex gap-2">
        <Button
          onClick={handleSubmit}
          disabled={sending || !selectedDog}
          className="bg-purple-600 hover:bg-purple-700 text-white flex-1"
        >
          <span className="flex items-center gap-2 justify-center">
            <Send className="w-4 h-4" /> {sending ? "Envoi..." : "Envoyer"}
          </span>
        </Button>
        <Button variant="outline" onClick={onClose} className="border-purple-200">
          Annuler
        </Button>
      </div>
    </div>
  );
}