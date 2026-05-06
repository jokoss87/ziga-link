import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft } from "lucide-react";
import FriendsSection from "@/components/social/FriendsSection";
import { useUserProfile } from "@/components/useUserProfile";

export default function Friends() {
  const { user } = useUserProfile();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-gradient-to-br from-teal-500 to-emerald-600 px-6 pt-10 pb-8 text-white">
        <div className="max-w-md mx-auto">
          <Link to={createPageUrl("Home")} className="flex items-center gap-2 text-teal-100 hover:text-white mb-5 text-sm">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
          <h1 className="text-2xl font-black">🐾 Mes amis</h1>
          <p className="text-teal-100 text-sm mt-1">Retrouvez et gérez vos amis canins</p>
        </div>
      </div>
      <div className="max-w-md mx-auto py-4">
        <FriendsSection currentUserEmail={user.email} />
      </div>
    </div>
  );
}