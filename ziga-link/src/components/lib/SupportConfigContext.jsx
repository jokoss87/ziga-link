import { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const SupportConfigContext = createContext(null);

export function SupportConfigProvider({ children }) {
  const [supportConfig, setSupportConfig] = useState(undefined);

  useEffect(() => {
    base44.entities.SupportConfig.list()
      .then(res => setSupportConfig(res[0] || null))
      .catch(() => setSupportConfig(null));
  }, []);

  return (
    <SupportConfigContext.Provider value={{ supportConfig }}>
      {children}
    </SupportConfigContext.Provider>
  );
}

export function useSupportConfig() {
  return useContext(SupportConfigContext);
}