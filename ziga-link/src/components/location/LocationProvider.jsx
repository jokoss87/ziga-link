import { LocationContext } from "./LocationContext";
import { useLocationPermission } from "./useLocationPermission";
import { LocationPreRequestModal, LocationDeniedModal } from "./LocationPermissionModals";

export default function LocationProvider({ children }) {
  const {
    permissionStatus,
    userLocation,
    requestLocation,
    confirmRequestLocation,
    showPreModal,
    showDeniedModal,
    dismissPreModal,
    dismissDeniedModal,
    attemptCount,
    resetAttempts,
  } = useLocationPermission();

  return (
    <LocationContext.Provider value={{ permissionStatus, userLocation, requestLocation, attemptCount, resetAttempts }}>
      {children}
      {showPreModal && <LocationPreRequestModal onConfirm={confirmRequestLocation} onDismiss={dismissPreModal} />}
      {showDeniedModal && <LocationDeniedModal onDismiss={dismissDeniedModal} />}
    </LocationContext.Provider>
  );
}