import { createContext, useContext } from "react";

export const LocationContext = createContext({
  permissionStatus: "not_requested",
  userLocation: null,
  requestLocation: () => {},
  attemptCount: 0,
});

export function useLocation() {
  return useContext(LocationContext);
}