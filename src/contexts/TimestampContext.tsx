import React, { createContext, useContext, useState } from "react";

interface TimestampContextType {
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
}

const TimestampContext = createContext<TimestampContextType | undefined>(
  undefined
);

export const useTimestamp = () => {
  const ctx = useContext(TimestampContext);
  if (!ctx)
    throw new Error("useTimestamp must be used within a TimestampProvider");
  return ctx;
};

// Função para obter a data de hoje no formato YYYY-MM-DD
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export const TimestampProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [startDate, setStartDate] = useState<string>(getTodayDate());
  const [endDate, setEndDate] = useState<string>(getTodayDate());

  return (
    <TimestampContext.Provider
      value={{ startDate, endDate, setStartDate, setEndDate }}
    >
      {children}
    </TimestampContext.Provider>
  );
};
