import { useState, useEffect, useRef } from "react";
import { APP_NAME } from "@/lib/brand";
import { useUserProfile } from "@/components/useUserProfile";
import { base44 } from "@/api/base44Client";
import { Heart, CheckCircle, Loader2, Star, Users, ArrowLeft } from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";
import { useSupportConfig } from "@/components/lib/SupportConfigContext";
import { createPageUrl } from "@/utils";

const BRAND_GRADIENT = "linear-gradient(135deg, #4CAF87, #3d9e78)";
const CORAL_GRADIENT = "linear-gradient(135deg, #FF7A59, #e8634a)";
const GOLD_GRADIENT = "linear-gradient(135deg, #F5C518, #d4a017)";

export default function SupportPage() {
  const { user } = useUserProfile();
  const { supportConfig } = useSupportConfig();

  const [searchParams] = useSearchParams();

  // ── État principal ──────────────────────────────────────────
  const [config, setConfig] = useState(null);
  const [mySupport, setMySupport] = useState(null);
  const [allSupports, setAllSupports] = useState([]);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isMonthly, setIsMonthly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // ── Chargement des données ──────────────────────────────────
  const loadData = async () => {
    try {
      const [supports] = await Promise.all([
        base44.entities.UserSupport.filter({ status: "soutien_actif" }),
      ]);
      const cfg = supportConfig ?? null;
      setConfig(cfg);
      setAllSupports(supports);
      if (cfg?.amounts?.length > 0) setSelectedAmount(s => s || cfg.amounts[1] || cfg.amounts[0]);
      if (cfg?.allow_monthly && !cfg?.allow_onetime) setIsMonthly(true);
      if (!cfg?.allow_monthly && cfg?.allow_onetime) setIsMonthly(false);

      if (user?.email) {
        const myS = await base44.entities.UserSupport.filter({ user_email: user.email });
        setMySupport(myS[0] || null);
      }
    } catch (e) {
      console.error("[SupportPage] loadData error:", e);
    } finally {
      setLoading(false);
    }
  };

  // ── Subscriptions temps réel ────────────────────────────────
  const pollRef = useRef(null);
  const pendingPaymentRef = useRef(false);

  const triggerSuccessEffects = (supportData) => {
    confetti({ particleCount: 180, spread: 100, origin: { y: 0.4 }, colors: ["#F5C518", "#d4a017", "#FF7A59", "#4CAF87"] });
    setTimeout(() => confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ["#4CAF87", "#3d9e78", "#F5C518"] }), 400);
    const label = supportData?.is_monthly ? "Créateur" : "Ambassadeur";
    toast.success(`🐾 Merci ! Vous êtes maintenant ${label} ${APP_NAME} 🎉`, { duration: 7000 });
  };

  const pollForActivation = (email) => {
    if (pollRef.current) clearInterval(pollRef.current);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      const res = await base44.entities.UserSupport.filter({ user_email: email }).catch(() => []);
      const s = res[0];
      if (s?.status === "soutien_actif") {
        clearInterval(pollRef.current);
        pollRef.current = null;
        pendingPaymentRef.current = false;
        setMySupport(s);
        triggerSuccessEffects(s);
      } else if (attempts >= 25) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        pendingPaymentRef.current = false;
        toast.info("Le statut sera mis à jour sous peu.");
      }
    }, 2000);
  };

  useEffect(() => {
    if (!user?.email || supportConfig === undefined) return;
    loadData();
  }, [user?.email, supportConfig]);

  // ── Calculs dérivés ─────────────────────────────────────────
  const realTotal = allSupports.reduce((sum, s) => sum + (s.total_paid || s.amount || 0), 0);
  const goalPct = config?.monthly_goal_active && config?.monthly_goal_amount > 0
    ? Math.min(100, Math.round((realTotal / config.monthly_goal_amount) * 100))
    : 0;

  const isSupporter = mySupport?.status === "soutien_actif";
  const isExpired = mySupport?.status === "soutien_expire";
  const isActiveMonthly = isSupporter && mySupport?.is_monthly;

  // ── Handlers ────────────────────────────────────────────────
  const handleSupport = async () => {
    const amount = customAmount ? parseFloat(customAmount) : selectedAmount;
    if (!amount || amount <= 0) { toast.error("Veuillez sélectionner un montant."); return; }
    if (amount < 2) { toast.error("Le montant minimum est de 2€."); return; }
    if (!user?.email) { toast.error("Vous devez être connecté."); return; }

    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      toast.info("Le paiement s'ouvre uniquement depuis l'app publiée.");
      return;
    }

    setPaying(true);
    try {
      console.log("[SupportPage] Invoking createStripeCheckout", { userEmail: user.email, amount, isMonthly });
      const res = await base44.functions.invoke("createStripeCheckout", { userEmail: user.email, amount, isMonthly });
      console.log("[SupportPage] Response:", res);
      if (res?.data?.url) {
        console.log("[SupportPage] Opening Stripe checkout:", res.data.url);
        pendingPaymentRef.current = true;
        pollForActivation(user.email);
        window.open(res.data.url, "_blank");
      } else {
        console.error("[SupportPage] No URL in response:", res);
        toast.error("Erreur lors de la création du paiement.");
      }
    } catch (e) {
      console.error("[SupportPage] Error:", e);
      toast.error("Erreur : " + (e?.message || e));
    } finally {
      setPaying(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await base44.functions.invoke("cancelStripeSubscription", { userEmail: user.email });
      setShowCancelConfirm(false);
      toast.success("Abonnement annulé.");
      await loadData();
    } catch (e) {
      console.error("[handleCancel] Erreur:", e);
      toast.error("Erreur lors de l'annulation : " + (e.message || "réessayez."));
    } finally {
      setCancelling(false);
    }
  };

  // ── Rendu chargement ────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </div>
    );
  }

  // ── Formulaire de don (appelé comme fonction, pas composant) ──
  const renderSupportForm = (extraMode = false) => (
    <div className={`bg-white rounded-2xl p-5 border shadow-sm space-y-5 ${extraMode ? "border-teal-100" : "border-stone-100"}`}>
      {!extraMode && isExpired && mySupport?.expires_at && (
        <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3">
          <p className="text-sm text-stone-500">
            {new Date(mySupport.expires_at) > new Date()
              ? `🐾 Votre soutien reste actif jusqu'au ${new Date(mySupport.expires_at).toLocaleDateString("fr-FR")}`
              : `Votre soutien a expiré le ${new Date(mySupport.expires_at).toLocaleDateString("fr-FR")}`}
          </p>
        </div>
      )}

      {!extraMode && (
        <div>
          <h2 className="font-black text-stone-800 text-lg">{isExpired ? "Reprendre votre soutien 🐾" : "Soutenir la communauté"}</h2>
          <p className="text-sm text-stone-500 mt-1">Chaque contribution, même petite, fait une vraie différence.</p>
        </div>
      )}
      {extraMode && <h3 className="font-bold text-stone-800">Don supplémentaire 💚</h3>}

      {config?.allow_monthly && config?.allow_onetime && !extraMode && (
        <div className="flex gap-2 bg-stone-100 rounded-2xl p-1">
          <button onClick={() => setIsMonthly(true)} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${isMonthly ? "bg-white text-teal-600 shadow-sm" : "text-stone-400"}`}>Mensuel</button>
          <button onClick={() => setIsMonthly(false)} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${!isMonthly ? "bg-white text-teal-600 shadow-sm" : "text-stone-400"}`}>Unique</button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {(config?.amounts || [2, 5, 10]).map(a => (
          <button
            key={a}
            onClick={() => { setSelectedAmount(a); setCustomAmount(""); }}
            className={`py-3 rounded-2xl font-black text-sm border-2 transition-all ${
              selectedAmount === a && !customAmount ? "border-teal-400 bg-teal-50 text-teal-700" : "border-stone-200 text-stone-600 hover:border-teal-200"
            }`}
          >
            {a}€
          </button>
        ))}
      </div>

      {config?.allow_custom_amount && (
        <div>
          <label className="text-xs text-stone-400 mb-1 block">Montant personnalisé (€)</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={customAmount}
            onChange={e => {
              const val = e.target.value.replace(/[^0-9]/g, "");
              setCustomAmount(val);
              if (val) setSelectedAmount(null);
            }}
            placeholder="Ex: 15"
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400 transition-colors"
          />
        </div>
      )}

      <div className={`flex gap-2 ${extraMode ? "" : "flex-col"}`}>
        <button
          onClick={handleSupport}
          disabled={paying || (!selectedAmount && !customAmount)}
          className="flex-1 w-full py-3.5 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          style={{ background: GOLD_GRADIENT }}
        >
          {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
          {paying ? "Redirection..." : (config?.text_profile_cta || "Soutenir maintenant")}
        </button>
        {extraMode && (
          <button onClick={() => setShowExtraForm(false)} className="px-4 py-3 rounded-2xl border border-stone-200 text-stone-500 text-sm">Annuler</button>
        )}
      </div>

      {!extraMode && <p className="text-xs text-stone-400 text-center">Paiement sécurisé via Stripe 🔒</p>}
    </div>
  );

  // ── Rendu principal ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-50 pb-32">
      <div className="text-white px-6 pt-10 pb-14" style={{ background: CORAL_GRADIENT }}>
        <div className="max-w-xl mx-auto">
          <Link to={createPageUrl("Profil")} className="flex items-center gap-2 text-teal-100 hover:text-white mb-5 text-sm w-fit">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
          <div className="text-4xl mb-3">🐾</div>
          <h1 className="text-2xl font-black leading-tight">{config?.text_support_page_title || `Soutenir ${APP_NAME}`}</h1>
          <p className="text-teal-100 mt-2 text-sm leading-relaxed">
            {config?.text_support_page_subtitle || `${APP_NAME} est gratuit et sans pub. Votre soutien nous permet de continuer.`}
          </p>
          <div className="flex items-center gap-2 mt-4 bg-white/20 rounded-2xl px-4 py-2.5 w-fit">
            <Users className="w-4 h-4 text-white" />
            <span className="text-sm font-bold text-white">{allSupports.length} soutien{allSupports.length !== 1 ? "s" : ""} actif{allSupports.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 -mt-6 relative z-10 space-y-4">

        {/* Barre d'objectif mensuel */}
        {config?.monthly_goal_active && (
          <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-stone-800">{config.monthly_goal_label || "Objectif du mois"}</p>
                {config.monthly_goal_description && <p className="text-xs text-stone-400 mt-0.5">{config.monthly_goal_description}</p>}
              </div>
              <span className="text-sm font-black text-teal-600">{goalPct}%</span>
            </div>
            <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-3 rounded-full transition-all duration-700" style={{ width: `${goalPct}%`, background: BRAND_GRADIENT }} />
            </div>
            <p className="text-xs text-stone-400 mt-2">{realTotal}€ / {config.monthly_goal_amount || 0}€</p>
          </div>
        )}

        {/* Carte abonné mensuel actif */}
        {isActiveMonthly && (
          <div className="bg-white rounded-2xl p-5 border border-teal-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: BRAND_GRADIENT }}>🐾</div>
              <div>
                <p className="font-black text-stone-800">{config?.text_badge || `Soutien ${APP_NAME} 🐾`}</p>
                <p className="text-xs text-teal-600 font-semibold">Merci pour votre soutien !</p>
              </div>
              <CheckCircle className="w-5 h-5 text-teal-500 ml-auto flex-shrink-0" />
            </div>
            <div className="space-y-1.5 text-sm text-stone-600 mb-4">
              <p>💰 Montant : <strong>{mySupport.amount}€/mois</strong></p>
              {mySupport.started_at && <p>📅 Depuis : <strong>{new Date(mySupport.started_at).toLocaleDateString("fr-FR")}</strong></p>}
              <p>💳 Total versé : <strong>{mySupport.total_paid || mySupport.amount}€</strong></p>
            </div>

            {showCancelConfirm ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
                <p className="text-xs text-amber-700 font-medium mb-3">
                  🐾 En annulant, vous retirez votre soutien à la communauté canine. Votre contribution permet de maintenir {APP_NAME} gratuit et sans publicité pour tous.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setShowCancelConfirm(false)} className="flex-1 py-2 rounded-xl border border-stone-200 text-stone-600 text-sm font-semibold">
                    Garder mon soutien
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex-1 py-2 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Confirmer
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors"
              >
                Me désabonner
              </button>
            )}

            <p className="text-xs text-stone-400 text-center mt-2">
              Vous souhaitez faire un don supplémentaire ?{" "}
              <button onClick={() => setShowExtraForm(true)} className="underline text-teal-500">Contribuer à nouveau</button>
            </p>
          </div>
        )}

        {isActiveMonthly && showExtraForm && renderSupportForm(true)}
        {!isActiveMonthly && renderSupportForm(false)}

        {/* Avantages */}
        <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
          <h3 className="font-bold text-stone-700 mb-3">Ce que vous permettez 🐾</h3>
          <div className="space-y-2">
            {["Maintenir les serveurs opérationnels", "Développer de nouvelles fonctionnalités", "Garder l'app 100% gratuite et sans pub", "Soutenir une communauté canine engagée"].map(item => (
              <div key={item} className="flex items-center gap-2.5 text-sm text-stone-600">
                <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Bloc vision / ambitions — contrôlé depuis l'admin */}
        {config?.vision_visible && config?.vision_text && (
          <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
            <h3 className="font-bold text-stone-700 mb-3">🌟 Notre vision</h3>
            <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap break-words overflow-hidden">{config.vision_text}</p>
          </div>
        )}
      </div>
    </div>
  );
}