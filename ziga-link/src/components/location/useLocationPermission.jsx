import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "zigalink_location_permission";
const ATTEMPTS_KEY = "zigalink_location_attempts";
const MAX_ATTEMPTS = 3;

export function useLocationPermission() {
  const [permissionStatus, setPermissionStatus] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "not_requested";
  });
  const [userLocation, setUserLocation] = useState(null);
  const [showPreModal, setShowPreModal] = useState(false);
  const [showDeniedModal, setShowDeniedModal] = useState(false);
  const isRequestingRef = useRef(false);

  const getAttempts = () => parseInt(localStorage.getItem(ATTEMPTS_KEY) || "0", 10);
  const incAttempts = () => localStorage.setItem(ATTEMPTS_KEY, String(getAttempts() + 1));

  const doGetPosition = useCallback(() => {
    if (!navigator.geolocation || isRequestingRef.current) return;
    isRequestingRef.current = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        isRequestingRef.current = false;
        localStorage.setItem(STORAGE_KEY, "granted");
        setPermissionStatus("granted");
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        isRequestingRef.current = false;
        // TIMEOUT ne bloque pas la permission, seulement PERMISSION_DENIED
        if (err.code === err.PERMISSION_DENIED) {
          localStorage.setItem(STORAGE_KEY, "denied");
          setPermissionStatus("denied");
          setShowDeniedModal(true);
        }
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Si déjà accordé au montage, fetch silencieux
  useEffect(() => {
    if (permissionStatus === "granted") {
      doGetPosition();
    }
  }, []); // eslint-disable-line

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setShowDeniedModal(true);
      return;
    }
    if (permissionStatus === "granted") {
      doGetPosition();
      return;
    }
    if (permissionStatus === "denied" || getAttempts() >= MAX_ATTEMPTS) {
      setShowDeniedModal(true);
      return;
    }
    setShowPreModal(true);
  }, [permissionStatus, doGetPosition]);

  const confirmRequestLocation = useCallback(() => {
    setShowPreModal(false);
    incAttempts();
    doGetPosition();
  }, [doGetPosition]);

  const dismissPreModal = useCallback(() => setShowPreModal(false), []);
  const dismissDeniedModal = useCallback(() => setShowDeniedModal(false), []);

  const resetAttempts = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ATTEMPTS_KEY);
    setPermissionStatus("not_requested");
    setUserLocation(null);
  }, []);

  return {
    permissionStatus,
    userLocation,
    requestLocation,
    confirmRequestLocation,
    showPreModal,
    showDeniedModal,
    dismissPreModal,
    dismissDeniedModal,
    attemptCount: getAttempts(),
    resetAttempts,
  };
}