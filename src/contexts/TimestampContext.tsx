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

// Função para obter a data de hoje no formato YYYY-MM-DD com horário 23:59:59
const getTodayEndDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T23:59:59`;
};

export const TimestampProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [startDate, setStartDate] = useState<string>(getTodayDate());
  const [endDate, setEndDate] = useState<string>(getTodayEndDate());

  return (
    <TimestampContext.Provider
      value={{ startDate, endDate, setStartDate, setEndDate }}
    >
      {children}
    </TimestampContext.Provider>
  );
};
