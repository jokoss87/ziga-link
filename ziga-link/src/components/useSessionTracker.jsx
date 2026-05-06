import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

const IDLE_TIMEOUT = 60000; // 60 secondes sans interaction = inactif

export default function useSessionTracker(currentPageName, userEmail) {
  const sessionStart = useRef(Date.now());
  const activeSeconds = useRef(0);
  const lastActive = useRef(Date.now());
  const isIdle = useRef(false);
  const sectionTimes = useRef({});
  const currentSection = useRef(currentPageName);
  const sectionStart = useRef(Date.now());
  const saved = useRef(false);

  // Enregistre le temps passé sur la section courante
  const flushSection = () => {
    const prev = currentSection.current;
    const elapsed = Math.round((Date.now() - sectionStart.current) / 1000);
    if (prev && elapsed > 0) {
      sectionTimes.current[prev] = (sectionTimes.current[prev] || 0) + elapsed;
    }
  };

  // Changement de section
  useEffect(() => {
    if (!userEmail) return;
    flushSection();
    currentSection.current = currentPageName;
    sectionStart.current = Date.now();
  }, [currentPageName]);

  useEffect(() => {
    if (!userEmail) return;
    saved.current = false;
    sessionStart.current = Date.now();

    // Compteur de temps actif (toutes les secondes)
    const activeTimer = setInterval(() => {
      if (!isIdle.current) activeSeconds.current += 1;
    }, 1000);

    // Détection inactivité
    const idleChecker = setInterval(() => {
      if (Date.now() - lastActive.current > IDLE_TIMEOUT) isIdle.current = true;
    }, 5000);

    const resetIdle = () => {
      isIdle.current = false;
      lastActive.current = Date.now();
    };

    const events = ["click", "scroll", "keydown", "touchstart", "mousemove"];
    events.forEach(e => window.addEventListener(e, resetIdle, { passive: true }));

    const saveSession = async () => {
      if (saved.current) return;
      saved.current = true;
      flushSection();
      const duration = Math.round((Date.now() - sessionStart.current) / 1000);
      if (duration < 5) return; // ignore sessions < 5s
      await base44.entities.UserSession.create({
        user_email: userEmail,
        session_start: new Date(sessionStart.current).toISOString(),
        session_end: new Date().toISOString(),
        duration_seconds: duration,
        active_seconds: Math.min(activeSeconds.current, duration),
        section_times: { ...sectionTimes.current },
      }).catch(() => {});
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") saveSession();
      if (document.visibilityState === "visible") {
        // Nouvelle session si retour après idle long
        saved.current = false;
        sessionStart.current = Date.now();
        activeSeconds.current = 0;
        sectionTimes.current = {};
        sectionStart.current = Date.now();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", saveSession);

    return () => {
      clearInterval(activeTimer);
      clearInterval(idleChecker);
      events.forEach(e => window.removeEventListener(e, resetIdle));
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", saveSession);
      saveSession();
    };
  }, [userEmail]);
}