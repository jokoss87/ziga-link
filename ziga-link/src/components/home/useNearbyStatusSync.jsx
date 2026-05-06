import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Subscribe to UserProfile changes but ONLY process events
 * for emails already in the nearby set (≤ loaded announcements).
 * This avoids heavy real-time load as the userbase grows.
 *
 * @param {string[]} nearbyEmails - emails from already-loaded nearby announcements
 * @returns {Object} statusMap - { [email]: user_status }
 */
export function useNearbyStatusSync(nearbyEmails) {
  const [statusMap, setStatusMap] = useState({});
  const emailSetRef = useRef(new Set());

  // Keep the email set in sync when nearby list changes
  useEffect(() => {
    emailSetRef.current = new Set(nearbyEmails);
  }, [nearbyEmails]);

  // Chargement initial des statuts dès que la liste d'emails change
  useEffect(() => {
    if (!nearbyEmails || nearbyEmails.length === 0) return;
    Promise.all(
      nearbyEmails.map(email =>
        base44.entities.UserProfile.filter({ created_by: email }, "-created_date", 1)
          .then(r => r[0] ? { email, status: r[0].user_status } : null)
          .catch(() => null)
      )
    ).then(results => {
      const initial = {};
      results.forEach(r => { if (r) initial[r.email] = r.status; });
      setStatusMap(prev => ({ ...prev, ...initial }));
    });
  }, [nearbyEmails]);

  useEffect(() => {
    if (!nearbyEmails || nearbyEmails.length === 0) return;

    // Batch buffer: accumulate rapid updates, flush in one setState
    const pendingRef = {};
    let rafId = null;

    const flush = () => {
      rafId = null;
      const snapshot = { ...pendingRef };
      // Clear pending
      Object.keys(pendingRef).forEach(k => delete pendingRef[k]);
      setStatusMap(prev => {
        const next = { ...prev };
        let changed = false;
        Object.entries(snapshot).forEach(([email, status]) => {
          if (next[email] !== status) { next[email] = status; changed = true; }
        });
        return changed ? next : prev;
      });
    };

    const unsubscribe = base44.entities.UserProfile.subscribe((event) => {
      if (event.type !== "update") return;
      const email = event.data?.created_by;
      if (!email || !emailSetRef.current.has(email)) return;
      const newStatus = event.data?.user_status;
      if (!newStatus) return;
      // Accumulate in buffer
      pendingRef[email] = newStatus;
      // Schedule a single flush ~16ms later (one frame)
      if (!rafId) rafId = setTimeout(flush, 16);
    });

    return () => {
      if (rafId) clearTimeout(rafId);
      unsubscribe();
    };
  }, []); // Subscribe once, filter by ref

  return statusMap;
}