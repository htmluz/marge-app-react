import React, { createContext, useContext, useState } from "react";

interface RefreshContextType {
  isCustomTime: boolean;
  setIsCustomTime: (value: boolean) => void;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export const useRefreshControl = () => {
  const ctx = useContext(RefreshContext);
  if (!ctx) {
    throw new Error("useRefreshControl must be used within a RefreshProvider");
  }
  return ctx;
};

export const RefreshProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCustomTime, setIsCustomTime] = useState(false);

  return (
    <RefreshContext.Provider value={{ isCustomTime, setIsCustomTime }}>
      {children}
    </RefreshContext.Provider>
  );
}; 