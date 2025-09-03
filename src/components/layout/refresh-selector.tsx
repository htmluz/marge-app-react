import { RefreshCw, RefreshCwOff } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useTimestamp } from "@/contexts/TimestampContext";
import { useRefreshControl } from "@/contexts/RefreshContext";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const refreshOptions = [
  { label: "Disabled", value: 0 },
  { label: "1 Minute", value: 60000 },
  { label: "5 Minutes", value: 300000 },
  { label: "10 Minutes", value: 600000 },
];

const REFRESH_STORAGE_KEY = "marge-refresh-interval";

export function RefreshToggle() {
  const { startDate, endDate, setStartDate, setEndDate } = useTimestamp();
  const { isCustomTime } = useRefreshControl();
  const [refreshInterval, setRefreshInterval] = useState(() => {
    const saved = localStorage.getItem(REFRESH_STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateTimeWindow = () => {
    const now = new Date();
    const nowGMT3 = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    const currentPreset = localStorage.getItem("timestampPreset") || "15m";
    if (currentPreset === "custom") {
      return;
    }

    let deltaMs = 0;
    if (currentPreset.endsWith("h")) {
      const hours = parseInt(currentPreset.replace("h", ""), 10);
      deltaMs = hours * 60 * 60 * 1000;
    } else if (currentPreset.endsWith("m")) {
      const minutes = parseInt(currentPreset.replace("m", ""), 10);
      deltaMs = minutes * 60 * 1000;
    }

    const newEndDate = nowGMT3.toISOString().slice(0, 19);
    const newStartTime = new Date(nowGMT3.getTime() - deltaMs);
    const newStartDateStr = newStartTime.toISOString().slice(0, 16);

    setStartDate(newStartDateStr);
    setEndDate(newEndDate);
  };

  // Desabilitar refresh automático quando for custom time
  useEffect(() => {
    if (isCustomTime && refreshInterval > 0) {
      setRefreshInterval(0);
    }
  }, [isCustomTime, refreshInterval]);

  // Configurar o intervalo de refresh
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (refreshInterval > 0 && !isCustomTime) {
      intervalRef.current = setInterval(updateTimeWindow, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshInterval, setEndDate, isCustomTime]);

  const handleRefreshChange = (value: number) => {
    if (isCustomTime && value > 0) {
      // Não permitir refresh automático quando for custom time
      return;
    }
    setRefreshInterval(value);
    localStorage.setItem(REFRESH_STORAGE_KEY, value.toString());
  };

  const isRefreshActive = refreshInterval > 0 && !isCustomTime;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="size-7"
          size="icon"
          disabled={isCustomTime}
        >
          <RefreshCw
            className={cn(
              "h-[1rem] w-[1rem] transition-all",
              isRefreshActive ? "rotate-0 scale-100" : "-rotate-90 scale-0"
            )}
          />
          <RefreshCwOff
            className={cn(
              "absolute h-[1rem] w-[1rem] transition-all",
              isRefreshActive ? "rotate-90 scale-0" : "rotate-0 scale-100"
            )}
          />
          <span className="sr-only">Toggle refresh</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {refreshOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleRefreshChange(option.value)}
            className={cn(
              refreshInterval === option.value && "font-semibold text-primary",
              isCustomTime &&
                option.value > 0 &&
                "opacity-50 cursor-not-allowed"
            )}
            disabled={isCustomTime && option.value > 0}
          >
            {option.label}
            {isCustomTime && option.value > 0 && " (Custom time active)"}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
