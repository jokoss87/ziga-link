import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export default function PhotoLightbox({ urls, index, onClose, onNav }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNav(1);
      if (e.key === "ArrowLeft") onNav(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onNav]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 p-2 bg-white/20 rounded-full text-white"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </button>

      {urls.length > 1 && (
        <>
          <button
            className="absolute left-3 p-2 bg-white/20 rounded-full text-white"
            onClick={(e) => { e.stopPropagation(); onNav(-1); }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            className="absolute right-3 p-2 bg-white/20 rounded-full text-white"
            onClick={(e) => { e.stopPropagation(); onNav(1); }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            {index + 1} / {urls.length}
          </div>
        </>
      )}

      <img
        src={urls[index]}
        className="max-w-full max-h-full object-contain"
        onClick={(e) => e.stopPropagation()}
        alt=""
      />
    </div>
  );
}