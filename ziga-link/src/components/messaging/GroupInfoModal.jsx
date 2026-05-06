import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Plus, Trash2, LogOut, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function GroupInfoModal({ conversation, currentUser, currentPseudo, onClose, onLeft, onUpdated }) {
  const [groupName, setGroupName] = useState(conversation.name || "");
  const [pseudoInput, setPseudoInput] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const isCreator = conversation.created_by === currentUser?.email;

  const addMember = async () => {
    const pseudo = pseudoInput.trim().toLowerCase();
    if (!pseudo) return;
    if ((conversation.member_pseudos || []).some(p => p.toLowerCase() === pseudo)) {
      setAddError("Déjà membre");
      return;
    }
    setAdding(true);
    setAddError("");
    const profiles = await base44.entities.UserProfile.list("-created_date", 500);
    const found = profiles.find(p => p.pseudo?.toLowerCase() === pseudo);
    if (!found) {
      setAddError("Pseudonyme introuvable");
      setAdding(false);
      return;
    }
    const newMembers = [...(conversation.members || []), found.created_by];
    const newPseudos = [...(conversation.member_pseudos || []), found.pseudo];
    await base44.entities.Conversation.update(conversation.id, { members: newMembers, member_pseudos: newPseudos });
    setPseudoInput("");
    setAdding(false);
    onUpdated();
  };

  const removeMember = async (email) => {
    const idx = (conversation.members || []).indexOf(email);
    const newMembers = (conversation.members || []).filter(e => e !== email);
    const newPseudos = (conversation.member_pseudos || []).filter((_, i) => i !== idx);
    await base44.entities.Conversation.update(conversation.id, { members: newMembers, member_pseudos: newPseudos });
    onUpdated();
  };

  const leaveGroup = async () => {
    await removeMember(currentUser.email);
    onLeft();
  };

  const saveGroupName = async () => {
    setSaving(true);
    await base44.entities.Conversation.update(conversation.id, { name: groupName });
    setSaving(false);
    onUpdated();
  };

  const members = conversation.members || [];
  const pseudos = conversation.member_pseudos || [];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 sticky top-0 bg-white">
          <h2 className="font-bold text-stone-800 text-lg flex items-center gap-2"><Users className="w-5 h-5 text-purple-500" /> Infos du groupe</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-stone-400" /></button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Rename */}
          {isCreator && (
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">Nom du groupe</label>
              <div className="flex gap-2">
                <Input value={groupName} onChange={e => setGroupName(e.target.value)} className="flex-1 border-stone-200" />
                <Button onClick={saveGroupName} disabled={saving} size="sm" className="bg-teal-500 hover:bg-teal-600 text-white rounded-xl">
                  {saving ? "..." : "OK"}
                </Button>
              </div>
            </div>
          )}

          {/* Members */}
          <div>
            <p className="text-sm font-semibold text-stone-700 mb-2">{members.length} membres</p>
            <div className="space-y-2">
              {members.map((email, idx) => (
                <div key={email} className="flex items-center gap-3 p-2 rounded-xl hover:bg-stone-50">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-sm font-bold text-teal-600">
                    {pseudos[idx]?.[0]?.toUpperCase() || "?"}
                  </div>
                  <span className="flex-1 font-medium text-stone-700 text-sm">@{pseudos[idx] || email}</span>
                  {email === conversation.created_by && (
                    <span className="text-xs text-purple-500 font-semibold bg-purple-50 px-2 py-0.5 rounded-full">Admin</span>
                  )}
                  {isCreator && email !== currentUser?.email && (
                    <button onClick={() => removeMember(email)} className="text-stone-300 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add member */}
          {isCreator && (
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">Ajouter un membre</label>
              <div className="flex gap-2">
                <Input
                  value={pseudoInput}
                  onChange={e => { setPseudoInput(e.target.value); setAddError(""); }}
                  onKeyDown={e => e.key === "Enter" && addMember()}
                  placeholder="@pseudonyme"
                  className="flex-1 border-stone-200"
                />
                <Button onClick={addMember} disabled={adding} size="sm" className="bg-teal-500 hover:bg-teal-600 text-white rounded-xl">
                  {adding ? "..." : <Plus className="w-4 h-4" />}
                </Button>
              </div>
              {addError && <p className="text-xs text-red-500 mt-1">{addError}</p>}
            </div>
          )}

          {/* Leave */}
          <button
            onClick={leaveGroup}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 text-sm font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" /> Quitter le groupe
          </button>
        </div>
      </div>
    </div>
  );
}