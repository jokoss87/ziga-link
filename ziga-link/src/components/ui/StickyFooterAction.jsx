/**
 * StickyFooterAction — Bouton(s) d'action sticky en bas d'un modal ou d'une page.
 * Gère automatiquement le safe-area-inset-bottom (iOS/Android notch + barre nav).
 * Usage : envelopper dans le modal parent, doit être un enfant direct d'un conteneur
 * avec position relative (ou sticky dans un flex column).
 */
export default function StickyFooterAction({ children, className = "", style = {} }) {
  return (
    <div
      className={`sticky bottom-0 z-10 bg-white border-t border-stone-100 px-4 pt-3 ${className}`}
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 16px), 16px)", ...style }}
    >
      {children}
    </div>
  );
}