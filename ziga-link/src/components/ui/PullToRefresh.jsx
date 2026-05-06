import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";

const THRESHOLD = 70;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e) => {
      if (startY.current === null || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && window.scrollY === 0) {
        e.preventDefault();
        setPullY(Math.min(delta * 0.5, THRESHOLD + 20));
      }
    };

    const onTouchEnd = async () => {
      if (pullY >= THRESHOLD && !refreshing) {
        setRefreshing(true);
        setPullY(0);
        try { await onRefresh(); } catch (_) {}
        setRefreshing(false);
      } else {
        setPullY(0);
      }
      startY.current = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullY, refreshing, onRefresh]);

  const progress = Math.min(pullY / THRESHOLD, 1);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: refreshing ? 48 : pullY > 0 ? pullY : 0 }}
      >
        {refreshing ? (
          <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
        ) : pullY > 0 ? (
          <div
            className="w-6 h-6 rounded-full border-2 border-teal-400 flex items-center justify-center transition-transform"
            style={{ transform: `rotate(${progress * 180}deg)`, opacity: progress }}
          >
            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-teal-400">
              <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
            </svg>
          </div>
        ) : null}
      </div>
      <div
        style={{
          transform: `translateY(${refreshing ? 0 : pullY}px)`,
          transition: pullY === 0 ? "transform 0.2s ease" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}