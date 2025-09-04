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
  // Special handling for custom: read stored values, or fallback to default 15m window
  if (presetValue === "custom") {
    try {
      const savedStart = localStorage.getItem("marge-custom-start");
      const savedEnd = localStorage.getItem("marge-custom-end");
      if (savedStart && savedEnd) {
        return { start: savedStart, end: savedEnd };
      }
    } catch {}
    // Fallback: compute 15m window
    const end = now.toISOString().slice(0, 16) + ":59";
    const start = getStartDateFromPreset("15m", now);
    return { start, end };
  }

  const end = now.toISOString().slice(0, 16) + ":59";
  const start = getStartDateFromPreset(presetValue, now);
  return { start, end };
}

const DEFAULT_PRESET = "15m";
const CUSTOM_START_STORAGE_KEY = "marge-custom-start";
const CUSTOM_END_STORAGE_KEY = "marge-custom-end";

export const TimestampProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const savedPreset = localStorage.getItem("timestampPreset") || DEFAULT_PRESET;
  const [preset, setPresetState] = useState(savedPreset);

  // Resolve initial dates based on preset and any saved custom range
  let initialDates = getPresetDates(preset);
  if (savedPreset === "custom") {
    const savedStart = localStorage.getItem(CUSTOM_START_STORAGE_KEY);
    const savedEnd = localStorage.getItem(CUSTOM_END_STORAGE_KEY);
    if (savedStart && savedEnd) {
      initialDates = { start: savedStart, end: savedEnd };
    }
  }
  const [startDateState, _setStartDate] = useState<string>(initialDates.start);
  const [endDateState, _setEndDate] = useState<string>(initialDates.end);

  const setPreset = (newPreset: string) => {
    localStorage.setItem("timestampPreset", newPreset);
    // If switching to custom and no saved custom dates exist, initialize with a default window
    if (newPreset === "custom") {
      const savedStart = localStorage.getItem(CUSTOM_START_STORAGE_KEY);
      const savedEnd = localStorage.getItem(CUSTOM_END_STORAGE_KEY);
      if (!savedStart || !savedEnd) {
        const { start, end } = getPresetDates(DEFAULT_PRESET);
        try {
          localStorage.setItem(CUSTOM_START_STORAGE_KEY, start);
          localStorage.setItem(CUSTOM_END_STORAGE_KEY, end);
        } catch {}
        _setStartDate(start);
        _setEndDate(end);
      }
    }
    setPresetState(newPreset);
  };

  // Wrapped setters to also persist custom range when preset is custom
  const setStartDate = (date: string) => {
    _setStartDate(date);
    if (preset === "custom") {
      try {
        localStorage.setItem(CUSTOM_START_STORAGE_KEY, date);
      } catch {}
    }
  };

  const setEndDate = (date: string) => {
    _setEndDate(date);
    if (preset === "custom") {
      try {
        localStorage.setItem(CUSTOM_END_STORAGE_KEY, date);
      } catch {}
    }
  };

  return (
    <TimestampContext.Provider
      value={{
        startDate: startDateState,
        endDate: endDateState,
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
