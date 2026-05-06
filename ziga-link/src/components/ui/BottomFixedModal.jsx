import { X } from "lucide-react";
import StickyFooterAction from "./StickyFooterAction";

export default function BottomFixedModal({
  title,
  onClose,
  footer,
  children,
  maxWidth = "max-w-md",
  zIndex = "z-50",
  headerStyle,
  headerClass = "",
  customHeader,
}) {

  return (
    <div
      className={`fixed inset-0 bg-black/50 ${zIndex} flex items-end justify-center`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        className={`w-full ${maxWidth} bg-white rounded-t-3xl`}
        style={{
          height: "calc(var(--app-height, 100vh) - var(--nav-height, 80px))",
          marginBottom: "var(--nav-height, 80px)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header fixe */}
        <div style={{ flexShrink: 0 }}>
          {customHeader ? customHeader : (
            <div
              className={`flex items-center justify-between px-5 py-4 border-b border-stone-100 ${headerClass}`}
              style={headerStyle}
            >
              {typeof title === "string"
                ? <h2 className="font-bold text-stone-800 text-lg">{title}</h2>
                : <div className="flex-1">{title}</div>
              }
              {onClose && (
                <button
                  onClick={onClose}
                  className="ml-3 p-1.5 rounded-full hover:bg-black/10 transition-colors"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5 text-stone-400" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Contenu scrollable */}
        <div style={{
          flex: "1 1 0px",
          overflowY: "auto",
          minHeight: 0,
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(0,0,0,0.2) rgba(0,0,0,0.05)",
        }}>
          {children}
        </div>

        {/* Footer sticky avec safe-area-inset-bottom natif */}
        {footer && (
          <StickyFooterAction style={{ flexShrink: 0 }}>
            {footer}
          </StickyFooterAction>
        )}
      </div>
    </div>
  );
}