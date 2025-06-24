import { useEffect, useState } from "react";
import { useTimestamp } from "@/contexts/TimestampContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const presets = [
  { label: "Last 1 hour", value: "1h" },
  { label: "Last 6 hours", value: "6h" },
  { label: "Last 12 hours", value: "12h" },
  { label: "Last day", value: "24h" },
  { label: "Last 3 days", value: "72h" },
  { label: "Last week", value: "168h" },
];

const DEFAULT_PRESET = "24h";

function getNowInGMT3() {
  const now = new Date();
  return new Date(now.getTime() - 3 * 60 * 60 * 1000);
}

function getStartDateFromPreset(presetValue: string, now: Date) {
  let hours = 0;
  if (presetValue.endsWith("h")) {
    hours = parseInt(presetValue.replace("h", ""), 10);
  }
  const start = new Date(now.getTime() - hours * 60 * 60 * 1000);
  return start.toISOString().slice(0, 16);
}

export function TimestampSelect() {
  const { setStartDate, setEndDate } = useTimestamp();
  const [selectedPreset, setSelectedPreset] = useState(DEFAULT_PRESET);

  useEffect(() => {
    const now = getNowInGMT3();
    const end = now.toISOString().slice(0, 16);
    const start = getStartDateFromPreset(DEFAULT_PRESET, now);
    setStartDate(start);
    setEndDate(end);
  }, [setStartDate, setEndDate]);

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    const now = getNowInGMT3();
    const end = now.toISOString().slice(0, 16);
    const start = getStartDateFromPreset(value, now);
    setStartDate(start);
    setEndDate(end);
  };

  const selectedLabel =
    presets.find((preset) => preset.value === selectedPreset)?.label ||
    "Select";

  return (
    <DropdownMenu>
      <div className="flex items-center">
        <span className="mr-1 text-sm select-none cursor-default align-text-top">
          {selectedLabel}
        </span>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="size-7" size="icon">
            <Clock className="h-[1rem] w-[1rem]" />
            <span className="sr-only">Select a timespan</span>
          </Button>
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent align="end">
        {presets.map((preset) => (
          <DropdownMenuItem
            key={preset.value}
            onClick={() => handlePresetChange(preset.value)}
            className={cn(
              selectedPreset === preset.value && "font-semibold text-primary"
            )}
          >
            {preset.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
