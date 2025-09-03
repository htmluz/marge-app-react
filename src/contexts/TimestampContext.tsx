import React, { createContext, useContext, useState } from "react";

interface TimestampContextType {
  startDate: string;
  endDate: string;
  preset: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setPreset: (preset: string) => void;
  getPresetDates: (presetValue: string) => { start: string; end: string };
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

function getNowInGMT3() {
  const now = new Date();
  return new Date(now.getTime() - 3 * 60 * 60 * 1000);
}

function getStartDateFromPreset(presetValue: string, now: Date) {
  let deltaMs = 0;
  if (presetValue.endsWith("h")) {
    const hours = parseInt(presetValue.replace("h", ""), 10);
    deltaMs = hours * 60 * 60 * 1000;
  } else if (presetValue.endsWith("m")) {
    const minutes = parseInt(presetValue.replace("m", ""), 10);
    deltaMs = minutes * 60 * 1000;
  }
  const start = new Date(now.getTime() - deltaMs);
  return start.toISOString().slice(0, 16);
}

function getPresetDates(presetValue: string) {
  const now = getNowInGMT3();
  const end = now.toISOString().slice(0, 16) + ":59";
  const start = getStartDateFromPreset(presetValue, now);
  return { start, end };
}

const DEFAULT_PRESET = "15m";

export const TimestampProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const savedPreset = localStorage.getItem("timestampPreset") || DEFAULT_PRESET;
  const [preset, setPresetState] = useState(savedPreset);

  const initialDates = getPresetDates(preset);
  const [startDate, setStartDate] = useState<string>(initialDates.start);
  const [endDate, setEndDate] = useState<string>(initialDates.end);

  const setPreset = (newPreset: string) => {
    localStorage.setItem("timestampPreset", newPreset);
    setPresetState(newPreset);
  };

  return (
    <TimestampContext.Provider
      value={{
        startDate,
        endDate,
        preset,
        setStartDate,
        setEndDate,
        setPreset,
        getPresetDates,
      }}
    >
      {children}
    </TimestampContext.Provider>
  );
};
