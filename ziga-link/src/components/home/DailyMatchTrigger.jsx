import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

const DELAY_MS = 45000; // 45 seconds

export default function DailyMatchTrigger({ userEmail }) {
  const triggered = useRef(false);

  useEffect(() => {
    if (!userEmail || triggered.current) return;

    const timer = setTimeout(async () => {
      if (triggered.current) return;
      triggered.current = true;

      // Get user position if available
      let userLat = null;
      let userLng = null;

      if (navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              userLat = pos.coords.latitude;
              userLng = pos.coords.longitude;
              resolve();
            },
            () => resolve(),
            { timeout: 5000 }
          );
        });
      }

      // Trigger daily match suggestion (silent fail — non-critical)
      await base44.functions.invoke('dailyMatchSuggestion', { userLat, userLng }).catch(() => {});
    }, DELAY_MS);

    return () => clearTimeout(timer);
  }, [userEmail]);

  return null;
}