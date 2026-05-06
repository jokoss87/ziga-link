import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useUserProfileContext } from "@/components/lib/UserProfileContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Upload, ArrowRight, Loader2, Check, ChevronLeft } from "lucide-react";
import LocationPicker from "@/components/location/LocationPicker";

// ─── Utilitaire : floutage des coordonnées (~1 km de précision) ─────────────
const fuzzCoords = (val) => val ? Math.round(val * 100) / 100 : null;

// ─── Barre de progression ───────────────────────────────────────────────────
function ProgressBar({ step }) {
  return (
    <div className="flex flex-col items-center mb-8">
      <div className="flex items-center gap-2 mb-2">
        {[0, 1, 2, 3].map((i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div
              key={i}
              className={`flex items-center justify-center rounded-full transition-all
                ${done ? "w-6 h-6 bg-teal-500 text-white text-xs" : ""}
                ${active ? "w-8 h-2.5 bg-teal-500 rounded-full" : ""}
                ${!done && !active ? "w-2.5 h-2.5 bg-stone-200 rounded-full" : ""}
              `}
            >
              {done && <Check className="w-3 h-3" />}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-stone-400 font-medium">
        Étape {step + 1} / 4 — {step === 0 ? "Ton profil" : step === 1 ? "Ton chien" : step === 2 ? "Ta première annonce" : "Présente ton chien à la communauté"}
      </p>
    </div>
  );
}

// ─── Sélecteur de bouton ─────────────────────────────────────────────────────
function SelectButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all
        ${active
          ? "border-teal-500 bg-teal-50 text-teal-700"
          : "border-stone-200 bg-white text-stone-500 hover:border-stone-300"
        }`}
    >
      {label}
    </button>
  );
}

// ─── Upload photo partagé ────────────────────────────────────────────────────
function PhotoUpload({ preview, loading, fileRef, onChange, placeholder = "🐾" }) {
  return (
    <div className="flex items-center gap-4">
      <div
        className="w-16 h-16 rounded-full bg-stone-100 border-2 border-dashed border-stone-300 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer"
        onClick={() => fileRef.current?.click()}
      >
        {preview
          ? <img src={preview} alt="preview" className="w-full h-full object-cover" />
          : <span className="text-2xl">{placeholder}</span>
        }
      </div>
      <Button
        variant="outline" size="sm"
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        className="rounded-xl border-stone-200 text-stone-600"
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Envoi...</>
          : <><Upload className="w-4 h-4 mr-1" />Choisir une photo</>
        }
      </Button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onChange} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function Onboarding() {
  const navigate = useNavigate();
  const { profile, loading } = useUserProfileContext();

  // ── Étape courante (dérivée du profil) ──────────────────────────────────────
  const [step, setStep] = useState(null); // null = pas encore calculé
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (loading || !profile) return;
    const s = profile.onboarding_step ?? 0;
    if (s >= 4) { navigate("/", { replace: true }); return; }
    setStep(s); // 0, 1, 2 ou 3
  }, [loading, profile]);

  // ── État étape 1 ─────────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [city, setCity] = useState("");
  const [photoUrl1, setPhotoUrl1] = useState("");
  const [photoPreview1, setPhotoPreview1] = useState(null);
  const fileRef1 = useRef(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [uploadLoading1, setUploadLoading1] = useState(false);

  // ── État étape 3 ─────────────────────────────────────────────────────────────
  const announcementType = "balade"; // fixe
  const [announcementDate, setAnnouncementDate] = useState(""); // "today" | "tomorrow" | "custom"
  const [customDate, setCustomDate] = useState("");
  const [announcementTime, setAnnouncementTime] = useState("");
  const [announcementDesc, setAnnouncementDesc] = useState("");
  const [lastDog, setLastDog] = useState(null); // { id, name }
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  // ── État étape 2 ─────────────────────────────────────────────────────────────
  const [dogName, setDogName] = useState("");
  const [breed, setBreed] = useState("");
  const [ageYears, setAgeYears] = useState("");
  const [gender, setGender] = useState("");
  const [size, setSize] = useState("");
  const [photoUrl2, setPhotoUrl2] = useState("");
  const [photoPreview2, setPhotoPreview2] = useState(null);
  const fileRef2 = useRef(null);
  const dogFileRef2 = fileRef2; // alias explicite pour la soumission
  const [uploadLoading2, setUploadLoading2] = useState(false);
  const [existingDogId, setExistingDogId] = useState(null); // id du chien existant
  const [dogCheckLoading, setDogCheckLoading] = useState(true); // chargement check chien étape 2
  // ── État étape 3 (check annonce existante) ────────────────────────────────────
  const [hasOpenAnnouncement, setHasOpenAnnouncement] = useState(null); // null=chargement, true/false
  // ── État étape 4 (check post existant) ───────────────────────────────────────
  const [hasExistingPost, setHasExistingPost] = useState(null); // null=chargement, true/false

  // ── État commun ───────────────────────────────────────────────────────────────
  const [errors, setErrors] = useState({});
  const [networkError, setNetworkError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [geoAutoLoading, setGeoAutoLoading] = useState(false);
  const [geoPermDenied, setGeoPermDenied] = useState(false);

  // Précharger le chien dès l'entrée en étape 4
  useEffect(() => {
    if (step === 3) loadLastDog();
  }, [step]);

  // Initialiser lat/lng depuis le profil + géolocalisation automatique à l'étape 3
  useEffect(() => {
    if (step !== 2) return;
    setGeoPermDenied(false);
    if (profile?.latitude && profile?.longitude) {
      setLatitude(profile.latitude);
      setLongitude(profile.longitude);
      return;
    }
    if (!navigator.geolocation) return;
    setGeoAutoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLatitude(fuzzCoords(lat));
        setLongitude(fuzzCoords(lng));
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          const detected = data.address?.city || data.address?.town || data.address?.village || "";
          if (detected) setCity(detected);
        } catch (_) {}
        setGeoAutoLoading(false);
      },
      (err) => {
        if (err.code === 1) setGeoPermDenied(true); // PERMISSION_DENIED
        setGeoAutoLoading(false);
      },
      { timeout: 8000 }
    );
  }, [step]);

  // Préremplir étape 1 si données déjà présentes
  useEffect(() => {
    if (!profile) return;
    if (profile.firstName || profile.pseudo) setFirstName(prev => prev || profile.firstName || profile.pseudo || "");
    if (profile.city) setCity(prev => prev || profile.city);
    if (profile.photo_url) {
      setPhotoUrl1(prev => prev || profile.photo_url);
      setPhotoPreview1(prev => prev || profile.photo_url);
    }
  }, [profile]);

  // Pré-remplir étape 2 avec chien existant au montage
  useEffect(() => {
    if (step !== 1) return;
    setDogCheckLoading(true);
    base44.auth.me().then(user => {
      base44.entities.DogProfile.filter({ created_by: user.email }, "-created_date", 1).then(dogs => {
        if (dogs.length > 0) {
          const d = dogs[0];
          setExistingDogId(d.id);
          if (d.name) setDogName(d.name);
          if (d.breed) setBreed(d.breed);
          if (d.age_years != null) setAgeYears(String(d.age_years));
          if (d.gender) setGender(d.gender);
          if (d.size) setSize(d.size);
          if (d.photo_url) { setPhotoUrl2(d.photo_url); setPhotoPreview2(d.photo_url); }
        }
        setDogCheckLoading(false);
      }).catch(() => setDogCheckLoading(false));
    }).catch(() => setDogCheckLoading(false));
  }, [step]);

  // Vérifier annonce active existante au montage étape 3
  useEffect(() => {
    if (step !== 2) return;
    setHasOpenAnnouncement(null);
    if (profile?.city) setCity(prev => prev || profile.city);
    base44.auth.me().then(user => {
      base44.entities.MeetupAnnouncement.filter({ created_by: user.email, status: "open" }, "-created_date", 1).then(res => {
        setHasOpenAnnouncement(res.length > 0);
      }).catch(() => setHasOpenAnnouncement(false));
    }).catch(() => setHasOpenAnnouncement(false));
  }, [step]);

  // Vérifier post existant au montage étape 4
  useEffect(() => {
    if (step !== 3) return;
    setHasExistingPost(null);
    base44.auth.me().then(user => {
      base44.entities.Post.filter({ created_by: user.email }, "-created_date", 1).then(res => {
        setHasExistingPost(res.length > 0);
      }).catch(() => setHasExistingPost(false));
    }).catch(() => setHasExistingPost(false));
  }, [step]);

  // Géolocalisation silencieuse à l'étape 1
  useEffect(() => {
    if (step !== 0) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLatitude(fuzzCoords(lat));
        setLongitude(fuzzCoords(lng));
        setCity((prev) => {
          if (prev) return prev; // ne pas écraser si déjà rempli
          // reverse geocoding asynchrone
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
            .then((r) => r.json())
            .then((data) => {
              const detected = data.address?.city || data.address?.town || data.address?.village || "";
              if (detected) setCity(detected);
            })
            .catch(() => {});
          return prev;
        });
      },
      () => {}, // erreur ou refus : ignorer silencieusement
      { timeout: 8000 }
    );
  }, [step]);

  // ── Géolocalisation ───────────────────────────────────────────────────────────
  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          const detected = data.address?.city || data.address?.town || data.address?.village || "";
          if (detected) setCity(detected);
        } catch (_) {}
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { timeout: 8000 }
    );
  };

  // ── Upload photo générique ────────────────────────────────────────────────────
  const handlePhotoChange = (setPreview, setUrl, setUploading) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      setPreview(URL.createObjectURL(file));
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUrl(file_url);
    } catch (_) {}
    setUploading(false);
  };

  // ── Soumission étape 1 ────────────────────────────────────────────────────────
  const handleSubmitStep1 = async () => {
    const newErrors = {};
    if (!firstName.trim()) newErrors.firstName = "Le prénom est obligatoire";
    if (!city.trim()) newErrors.city = "La ville est obligatoire";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    setNetworkError(false);
    try {
      // Sauvegarder onboarding_step en premier pour garantir la progression même en cas de coupure
      await base44.entities.UserProfile.update(profile.id, {
        firstName: firstName.trim(),
        pseudo: firstName.trim(),
        city: city.trim(),
        photo_url: photoUrl1 || "",
        latitude: fuzzCoords(latitude),
        longitude: fuzzCoords(longitude),
        onboarding_step: 1,
      });
      setStep(1);
    } catch (_) {
      setNetworkError(true);
      setSaving(false);
    } finally {
      setSaving(false);
    }
  };

  // ── Helpers étape 3 ──────────────────────────────────────────────────────────
  const getTodayStr = () => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  };
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  const getAnnouncementTitle = () => {
    const dogN = lastDog?.name || dogName || "mon chien";
    return `Balade avec ${dogN}`;
  };

  const getResolvedDate = () => {
    if (announcementDate === "today") return getTodayStr();
    if (announcementDate === "tomorrow") return getTomorrowStr();
    if (announcementDate === "custom") return customDate;
    return "";
  };

  const getDescPlaceholder = () => {
    const cityName = profile?.city || "votre ville";
    return `Rejoignez-nous pour une balade à ${cityName} !`;
  };

  // ── Chargement du chien pour étape 3 ─────────────────────────────────────────
  const loadLastDog = async () => {
    if (lastDog) return; // déjà chargé
    try {
      const user = await base44.auth.me();
      const dogs = await base44.entities.DogProfile.filter({ created_by: user.email }, "-created_date", 1);
      if (dogs.length > 0) setLastDog({ id: dogs[0].id, name: dogs[0].name, photo_url: dogs[0].photo_url || "" });
    } catch (_) {}
  };

  // ── État étape 4 ─────────────────────────────────────────────────────────────
  const [postCaption, setPostCaption] = useState("");
  const [postPhotoUrl, setPostPhotoUrl] = useState("");
  const [postPhotoPreview, setPostPhotoPreview] = useState(null);
  const fileRef4 = useRef(null);
  const [uploadingPost, setUploadingPost] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [postNetworkError, setPostNetworkError] = useState(false);

  // ── Soumission étape 4 ────────────────────────────────────────────────────────
  const handleSubmitStep4 = async () => {
    setSavingPost(true);
    setPostNetworkError(false);
    try {
      // Marquer l'étape terminée en premier pour garantir la progression même en cas de coupure
      await base44.entities.UserProfile.update(profile.id, { onboarding_step: 4 });

      let file_url = postPhotoUrl;
      if (fileRef4.current?.files?.[0]) {
        setUploadingPost(true);
        try {
          const result = await base44.integrations.Core.UploadFile({ file: fileRef4.current.files[0] });
          file_url = result.file_url || "";
        } catch (_) {
          // Upload échoué mais on continue sans photo
        }
        setUploadingPost(false);
      }
      await loadLastDog();
      const dog = lastDog;
      try {
        await base44.entities.Post.create({
          content: postCaption || "Voici mon compagnon !",
          media_urls: file_url ? [file_url] : [],
          dog_names: dog ? [dog.name] : [],
          category: "moment",
          author_name: profile.pseudo,
          city: profile.city,
        });
      } catch (_) {
        // Post échoué mais l'étape est déjà sauvegardée
      }
      setShowSuccess(true);
      setTimeout(() => navigate("/", { replace: true }), 2000);
    } catch (_) {
      setUploadingPost(false);
      setPostNetworkError(true);
      setSavingPost(false);
    } finally {
      setSavingPost(false);
    }
  };

  // ── Passer étape 4 ────────────────────────────────────────────────────────────
  const handleSkipStep4 = async () => {
    try {
      await base44.entities.UserProfile.update(profile.id, { onboarding_step: 4 });
    } catch (_) {}
    setShowSuccess(true);
    setTimeout(() => navigate("/", { replace: true }), 2000);
  };

  // ── Soumission étape 3 ────────────────────────────────────────────────────────
  const handleSubmitStep3 = async () => {
    const resolvedDate = getResolvedDate();
    if (!resolvedDate) { setErrors({ announcementDate: "Choisis une date" }); return; }
    setErrors({});

    setSaving(true);
    setNetworkError(false);
    try {
      // Marquer l'étape en premier pour garantir la progression même en cas de coupure
      await base44.entities.UserProfile.update(profile.id, { onboarding_step: 3 });

      await loadLastDog();
      const user = await base44.auth.me();
      let dog = lastDog;
      if (!dog) {
        const dogs = await base44.entities.DogProfile.filter({ created_by: user.email }, "-created_date", 1);
        if (dogs.length > 0) dog = { id: dogs[0].id, name: dogs[0].name };
      }
      try {
        // Vérification d'idempotence : évite les doublons en cas de coupure réseau
        const existingAnnouncements = await base44.entities.MeetupAnnouncement.filter({ created_by: user.email, date: resolvedDate, status: "open" });
        if (existingAnnouncements.length === 0) {
          await base44.entities.MeetupAnnouncement.create({
            dog_id: dog?.id || "",
            dog_name: dog?.name || "",
            dog_photo: dog?.photo_url || "",
            title: getAnnouncementTitle(),
            description: announcementDesc || getDescPlaceholder(),
            date: resolvedDate,
            time: announcementTime || "",
            city: city || profile?.city || "",
            latitude: latitude || undefined,
            longitude: longitude || undefined,
            meeting_place_lat: latitude || undefined,
            meeting_place_lng: longitude || undefined,
            meeting_place_name: city || profile?.city || "",
            type: "balade",
            status: "open",
          });
        }
      } catch (_) {
        // Annonce échouée mais l'étape est déjà sauvegardée
      }
      setStep(3);
      loadLastDog();
    } catch (_) {
      setNetworkError(true);
      setSaving(false);
    } finally {
      setSaving(false);
    }
  };

  // ── Passer étape 3 ────────────────────────────────────────────────────────────
  const handleSkipStep3 = async () => {
    try {
      await base44.entities.UserProfile.update(profile.id, { onboarding_step: 3 });
    } catch (_) {}
    setStep(3);
    loadLastDog();
  };

  // ── Soumission étape 2 ────────────────────────────────────────────────────────
  const handleSubmitStep2 = async () => {
    // Si chien existant confirmé → juste avancer, pas de création
    if (existingDogId) {
      setSaving(true);
      setNetworkError(false);
      try {
        await base44.entities.UserProfile.update(profile.id, { onboarding_step: 2 });
        setStep(2);
        loadLastDog();
      } catch (_) {
        setNetworkError(true);
      } finally {
        setSaving(false);
      }
      return;
    }

    const newErrors = {};
    if (!dogName.trim()) newErrors.dogName = "Le prénom du chien est obligatoire";
    if (!breed.trim()) newErrors.breed = "La race est obligatoire";
    if (!gender) newErrors.gender = "Sélectionne le sexe";
    if (!size) newErrors.size = "Sélectionne la taille";
    if (!photoUrl2 && !fileRef2.current?.files?.[0]) newErrors.photo2 = "La photo du chien est obligatoire";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    setUploading(true);
    setNetworkError(false);
    try {
      let finalPhotoUrl = photoUrl2 || "";
      if (dogFileRef2.current?.files?.[0]) {
        try {
          const result = await base44.integrations.Core.UploadFile({ file: dogFileRef2.current.files[0] });
          finalPhotoUrl = result.file_url || "";
        } catch (_) {}
      }
      setUploading(false);

      await base44.entities.DogProfile.create({
        name: dogName.trim(),
        breed: breed.trim(),
        age_years: ageYears !== "" ? Number(ageYears) : undefined,
        gender,
        size,
        photo_url: finalPhotoUrl,
      });
      await base44.entities.UserProfile.update(profile.id, { onboarding_step: 2 });
      setStep(2);
      loadLastDog();
    } catch (_) {
      setNetworkError(true);
      setSaving(false);
      setUploading(false);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  // ── Retour étape précédente ───────────────────────────────────────────────────
  const goBack = async (targetStep) => {
    try {
      await base44.entities.UserProfile.update(profile.id, { onboarding_step: targetStep });
    } catch (_) {}
    setStep(targetStep);
    setErrors({});
    setNetworkError(false);
  };

  // ── Passer étape 2 ────────────────────────────────────────────────────────────
  const handleSkipStep2 = async () => {
    try {
      await base44.entities.UserProfile.update(profile.id, { onboarding_step: 2 });
    } catch (_) {}
    setStep(2);
    loadLastDog();
  };

  // ── Chargement initial ────────────────────────────────────────────────────────
  if (loading || step === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  // ── Écran de succès ───────────────────────────────────────────────────────────
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="text-6xl mb-6 animate-bounce">🐾</div>
        <h1 className="text-2xl font-black text-stone-900 text-center">Bienvenue dans la meute !</h1>
      </div>
    );
  }

  // ── ÉTAPE 4 — post existant ? ─────────────────────────────────────────────────
  if (step === 3 && hasExistingPost === true) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-start px-6 py-10">
        <div className="w-full max-w-sm mb-2">
          <button onClick={() => goBack(2)} className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Retour
          </button>
        </div>
        <div className="text-3xl mb-4">🐾</div>
        <ProgressBar step={3} />
        <h1 className="text-2xl font-black text-stone-900 text-center mb-1">Photo dans le clan 📸</h1>
        <div className="w-full max-w-sm mt-6">
          <div className="bg-teal-50 border border-teal-200 rounded-2xl px-5 py-4 flex items-center gap-3 mb-6">
            <Check className="w-5 h-5 text-teal-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-teal-700">Tu es déjà dans la meute ✓</p>
          </div>
          <Button
            onClick={handleSkipStep4}
            className="w-full rounded-xl text-white font-bold py-3 text-base"
            style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
          >
            Continuer <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  if (step === 3 && hasExistingPost === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  // ── ÉTAPE 4 ───────────────────────────────────────────────────────────────────
  if (step === 3) {
    const dogDisplayName = lastDog?.name || "ton chien";
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-start px-6 py-10">
        <div className="w-full max-w-sm mb-2">
          <button onClick={() => goBack(2)} className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Retour
          </button>
        </div>
        <div className="text-3xl mb-4">🐾</div>
        <ProgressBar step={3} />

        <h1 className="text-2xl font-black text-stone-900 text-center mb-1">Photo dans le clan 📸</h1>
        <p className="text-sm text-stone-500 text-center mb-8">
          Publiez une première photo de <span className="font-semibold text-stone-700">{dogDisplayName}</span> pour faire parti de la meute !
        </p>

        <div className="w-full max-w-sm space-y-5">
          {/* Upload photo */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              Photo
            </label>
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-2xl bg-stone-100 border-2 border-dashed border-stone-300 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer"
                onClick={() => fileRef4.current?.click()}
              >
                {postPhotoPreview
                  ? <img src={postPhotoPreview} alt="preview" className="w-full h-full object-cover" />
                  : <span className="text-3xl">📷</span>
                }
              </div>
              <Button
                variant="outline" size="sm"
                onClick={() => fileRef4.current?.click()}
                disabled={uploadingPost}
                className="rounded-xl border-stone-200 text-stone-600"
              >
                {uploadingPost
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Envoi...</>
                  : <><Upload className="w-4 h-4 mr-1" />Choisir une photo</>
                }
              </Button>
              <input
                ref={fileRef4}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setPostPhotoPreview(URL.createObjectURL(file));
                  setPostPhotoUrl(""); // sera uploadé à la soumission
                }}
              />
            </div>
          </div>

          {/* Légende */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              Légende <span className="text-stone-400 font-normal">(max 150 car.)</span>
            </label>
            <textarea
              value={postCaption}
              onChange={(e) => setPostCaption(e.target.value.slice(0, 150))}
              rows={3}
              maxLength={150}
              placeholder={`Voici ${dogDisplayName} ! 🐾`}
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
            />
            <p className="text-xs text-stone-400 text-right mt-0.5">{postCaption.length}/150</p>
          </div>

          {postNetworkError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              Connexion perdue, réessaie.{" "}
              <button onClick={handleSkipStep4} className="underline text-stone-400 ml-1">
                Passer
              </button>
            </div>
          )}

          <Button
            onClick={handleSubmitStep4}
            disabled={(savingPost && !postNetworkError) || uploadingPost}
            className="w-full rounded-xl text-white font-bold py-3 text-base"
            style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
          >
            {uploadingPost
              ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Upload en cours...</>
              : savingPost
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <>Publier <ArrowRight className="w-4 h-4 ml-1" /></>
            }
          </Button>

          <div className="text-center">
            <button onClick={handleSkipStep4} className="text-xs text-stone-400 underline underline-offset-2">
              Passer pour l'instant
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ÉTAPE 1
  // ═══════════════════════════════════════════════════════════════════════════════
  if (step === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-start px-6 py-10">
        <div className="text-3xl mb-4">🐾</div>
        <ProgressBar step={0} />

        <h1 className="text-2xl font-black text-stone-900 text-center mb-1">Bienvenue ! 👋</h1>
        <p className="text-sm text-stone-500 text-center mb-8">
          Dis-nous l'essentiel pour rejoindre la communauté
        </p>

        <div className="w-full max-w-sm space-y-5">
          {/* Prénom */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              Prénom <span className="text-red-400">*</span>
            </label>
            <Input
              value={firstName}
              onChange={(e) => { setFirstName(e.target.value); setErrors(p => ({ ...p, firstName: null })); }}
              placeholder="Ton prénom"
              className={`rounded-xl ${errors.firstName ? "border-red-400" : "border-stone-200"}`}
            />
            {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
          </div>

          {/* Ville */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              Ville <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                value={city}
                onChange={(e) => { setCity(e.target.value); setErrors(p => ({ ...p, city: null })); }}
                placeholder="Ta ville"
                className={`rounded-xl flex-1 ${errors.city ? "border-red-400" : "border-stone-200"}`}
              />
              <Button variant="outline" size="icon" onClick={handleGeolocate} disabled={geoLoading}
                className="rounded-xl border-stone-200 flex-shrink-0" title="Utiliser ma position">
                {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4 text-teal-500" />}
              </Button>
            </div>
            {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
          </div>

          {/* Photo */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              Photo de profil
            </label>
            <PhotoUpload
              preview={photoPreview1} loading={uploadLoading1} fileRef={fileRef1}
              onChange={handlePhotoChange(setPhotoPreview1, setPhotoUrl1, setUploadLoading1)}
            />
          </div>

          {networkError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              Connexion perdue, réessaie.{" "}
              <button onClick={() => navigate("/")} className="underline text-stone-400 ml-1">
                Passer pour l'instant
              </button>
            </div>
          )}

          <Button onClick={handleSubmitStep1} disabled={saving && !networkError || uploadLoading1}
            className="w-full rounded-xl text-white font-bold py-3 text-base"
            style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}>
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continuer <ArrowRight className="w-4 h-4 ml-1" /></>}
          </Button>

          <p className="text-xs text-stone-400 text-center mt-2">
            En créant un compte, vous confirmez avoir 13 ans ou plus. Les mineurs de 13 à 15 ans doivent avoir l'accord d'un parent ou tuteur légal.
          </p>

          <div className="text-center">
            <button onClick={() => navigate("/")} className="text-xs text-stone-400 underline underline-offset-2">
              Passer pour l'instant
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 2 && hasOpenAnnouncement === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ÉTAPE 3 — annonce existante ?
  // ═══════════════════════════════════════════════════════════════════════════════
  if (step === 2 && hasOpenAnnouncement === true) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-start px-6 py-10">
        <div className="w-full max-w-sm mb-2">
          <button onClick={() => goBack(1)} className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Retour
          </button>
        </div>
        <div className="text-3xl mb-4">🐾</div>
        <ProgressBar step={2} />
        <h1 className="text-2xl font-black text-stone-900 text-center mb-1">Ta première annonce 📢</h1>
        <div className="w-full max-w-sm mt-6">
          <div className="bg-teal-50 border border-teal-200 rounded-2xl px-5 py-4 flex items-center gap-3 mb-6">
            <Check className="w-5 h-5 text-teal-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-teal-700">Tu as déjà une annonce active ✓</p>
          </div>
          <Button
            onClick={handleSkipStep3}
            className="w-full rounded-xl text-white font-bold py-3 text-base"
            style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
          >
            Continuer <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    const resolvedDate = getResolvedDate();
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-start px-6 py-10">
        <div className="w-full max-w-sm mb-2">
          <button onClick={() => goBack(1)} className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Retour
          </button>
        </div>
        <div className="text-3xl mb-4">🐾</div>
        <ProgressBar step={2} />

        <h1 className="text-2xl font-black text-stone-900 text-center mb-1">Ta première annonce 📢</h1>
        <p className="text-sm text-stone-500 text-center mb-8">
          Propose une sortie à la communauté
        </p>

        <div className="w-full max-w-sm space-y-5">
          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Date <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              {[
                { key: "today", label: "Aujourd'hui" },
                { key: "tomorrow", label: "Demain" },
                { key: "custom", label: "Choisir" },
              ].map(({ key, label }) => (
                <SelectButton
                  key={key}
                  label={label}
                  active={announcementDate === key}
                  onClick={() => { setAnnouncementDate(key); setErrors(p => ({ ...p, announcementDate: null })); }}
                />
              ))}
            </div>
            {announcementDate === "custom" && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                min={getTodayStr()}
                className="mt-2 w-full border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            )}
            {errors.announcementDate && <p className="text-xs text-red-500 mt-1">{errors.announcementDate}</p>}
          </div>

          {/* Heure (optionnel) */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              Heure
            </label>
            <input
              type="time"
              value={announcementTime}
              onChange={(e) => setAnnouncementTime(e.target.value)}
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          {/* Lieu de rendez-vous (optionnel) */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              Lieu de rendez-vous
            </label>
            {geoAutoLoading && (
              <p className="flex items-center gap-1.5 text-xs text-stone-400 mb-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Localisation en cours...
              </p>
            )}
            {geoPermDenied && (
              <p className="text-xs text-amber-600 mb-2">
                Autorise la localisation dans les réglages de ton navigateur pour pré-remplir ta position.
              </p>
            )}
            <LocationPicker
              latitude={latitude}
              longitude={longitude}
              city={city}
              accentColor="stone"
              onLocationChange={({ latitude: lat, longitude: lng, city: c }) => {
                setLatitude(lat);
                setLongitude(lng);
                if (c) setCity(c);
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              Description
            </label>
            <textarea
              value={announcementDesc}
              onChange={(e) => setAnnouncementDesc(e.target.value)}
              rows={3}
              placeholder={getDescPlaceholder()}
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
            />
          </div>

          {networkError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              Connexion perdue, réessaie.{" "}
              <button onClick={handleSkipStep3} className="underline text-stone-400 ml-1">
                Passer
              </button>
            </div>
          )}

          <Button onClick={handleSubmitStep3} disabled={saving && !networkError}
            className="w-full rounded-xl text-white font-bold py-3 text-base"
            style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}>
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continuer <ArrowRight className="w-4 h-4 ml-1" /></>}
          </Button>

          <div className="text-center">
            <button onClick={handleSkipStep3} className="text-xs text-stone-400 underline underline-offset-2">
              Passer pour l'instant
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ÉTAPE 2
  // ═══════════════════════════════════════════════════════════════════════════════
  if (dogCheckLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-start px-6 py-10">
      <div className="w-full max-w-sm mb-2">
        <button onClick={() => goBack(0)} className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>
      </div>
      <div className="text-3xl mb-4">🐾</div>
      <ProgressBar step={1} />

      <h1 className="text-2xl font-black text-stone-900 text-center mb-1">Ton chien 🐕</h1>
      <p className="text-sm text-stone-500 text-center mb-8">
        Présente-nous ton compagnon !
      </p>

      <div className="w-full max-w-sm space-y-5">
        {/* Bandeau chien existant */}
        {existingDogId && (
          <div className="bg-teal-50 border border-teal-200 rounded-2xl px-5 py-4 flex items-center gap-3">
            {photoPreview2
              ? <img src={photoPreview2} alt={dogName} className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-teal-200" />
              : <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-2xl flex-shrink-0">🐕</div>
            }
            <div>
              <p className="text-sm font-bold text-teal-800">Est-ce bien ton compagnon ? ✓</p>
              <p className="text-xs text-teal-600 mt-0.5">{dogName}{breed ? ` · ${breed}` : ""}{ageYears ? ` · ${ageYears} ans` : ""}</p>
            </div>
          </div>
        )}
        {/* Prénom du chien */}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1.5">
            Prénom du chien <span className="text-red-400">*</span>
          </label>
          <Input
            value={dogName}
            onChange={(e) => { setDogName(e.target.value); setErrors(p => ({ ...p, dogName: null })); }}
            placeholder="Ex: Buddy"
            className={`rounded-xl ${errors.dogName ? "border-red-400" : "border-stone-200"}`}
          />
          {errors.dogName && <p className="text-xs text-red-500 mt-1">{errors.dogName}</p>}
        </div>

        {/* Race */}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1.5">
            Race <span className="text-red-400">*</span>
          </label>
          <Input
            value={breed}
            onChange={(e) => { setBreed(e.target.value); setErrors(p => ({ ...p, breed: null })); }}
            placeholder="Ex: Labrador"
            className={`rounded-xl ${errors.breed ? "border-red-400" : "border-stone-200"}`}
          />
          {errors.breed && <p className="text-xs text-red-500 mt-1">{errors.breed}</p>}
        </div>

        {/* Âge */}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1.5">
            Âge (en années)
          </label>
          <Input
            type="number" min="0" max="25"
            value={ageYears}
            onChange={(e) => setAgeYears(e.target.value)}
            placeholder="Ex: 3"
            className="rounded-xl border-stone-200 w-28"
          />
        </div>

        {/* Sexe */}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">
            Sexe <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-3">
            <SelectButton label="🐾 Mâle" active={gender === "male"} onClick={() => { setGender("male"); setErrors(p => ({ ...p, gender: null })); }} />
            <SelectButton label="🌸 Femelle" active={gender === "female"} onClick={() => { setGender("female"); setErrors(p => ({ ...p, gender: null })); }} />
          </div>
          {errors.gender && <p className="text-xs text-red-500 mt-1">{errors.gender}</p>}
        </div>

        {/* Taille */}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">
            Taille <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2">
            <SelectButton label="Petit" active={size === "small"} onClick={() => { setSize("small"); setErrors(p => ({ ...p, size: null })); }} />
            <SelectButton label="Moyen" active={size === "medium"} onClick={() => { setSize("medium"); setErrors(p => ({ ...p, size: null })); }} />
            <SelectButton label="Grand" active={size === "large"} onClick={() => { setSize("large"); setErrors(p => ({ ...p, size: null })); }} />
          </div>
          {errors.size && <p className="text-xs text-red-500 mt-1">{errors.size}</p>}
        </div>

        {/* Photo chien */}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1.5">
            Photo du chien <span className="text-red-400">*</span>
          </label>
          <PhotoUpload
            preview={photoPreview2} loading={uploadLoading2} fileRef={fileRef2}
            onChange={handlePhotoChange(setPhotoPreview2, setPhotoUrl2, setUploadLoading2)}
            placeholder="🐕"
          />
          {errors.photo2 && <p className="text-xs text-red-500 mt-1">{errors.photo2}</p>}
        </div>

        {networkError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            Connexion perdue, réessaie.{" "}
            <button onClick={handleSkipStep2} className="underline text-stone-400 ml-1">
              Passer
            </button>
          </div>
        )}

        <Button onClick={handleSubmitStep2} disabled={(saving && !networkError) || uploadLoading2 || uploading}
          className="w-full rounded-xl text-white font-bold py-3 text-base"
          style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}>
          {uploading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Upload en cours...</> : saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continuer <ArrowRight className="w-4 h-4 ml-1" /></>}
        </Button>

        <div className="text-center">
          <button onClick={handleSkipStep2} className="text-xs text-stone-400 underline underline-offset-2">
            Passer pour l'instant
          </button>
        </div>
      </div>
    </div>
  );
}