import { useEffect, useState } from "react";
import { useTimestamp } from "@/contexts/TimestampContext";
import { useRefreshControl } from "@/contexts/RefreshContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomTime } from "@/components/CustomTime";
import { type DateRange } from "react-day-picker";

const presets = [
  { label: "Last 15 minutes", value: "15m" },
  { label: "Last 30 minutes", value: "30m" },
  { label: "Last 1 hour", value: "1h" },
  { label: "Last 3 hours", value: "3h" },
  { label: "Last 6 hours", value: "6h" },
  { label: "Last 12 hours", value: "12h" },
  { label: "Last day", value: "24h" },
  { label: "Last 2 days", value: "48h" },
  { label: "Last 3 days", value: "72h" },
  { label: "Last 5 days", value: "120h" },
  { label: "Last week", value: "168h" },
  { label: "Last 2 weeks", value: "336h" },
  { label: "Custom", value: "custom" },
];

export function TimestampSelect() {
  const { setStartDate, setEndDate, getPresetDates, preset, setPreset } =
    useTimestamp();
  const { setIsCustomTime } = useRefreshControl();
  const [customRange, setCustomRange] = useState<DateRange | undefined>(
    undefined
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [customStartTime, setCustomStartTime] = useState("00:00");
  const [customEndTime, setCustomEndTime] = useState("23:59");

  useEffect(() => {
    if (preset !== "custom") {
      const { start, end } = getPresetDates(preset);
      setStartDate(start);
      setEndDate(end);
      setIsCustomTime(false);
    } else {
      setIsCustomTime(true);
    }
  }, [preset, setStartDate, setEndDate, setIsCustomTime, getPresetDates]);

  const adjustForGMT3 = (date: Date) => {
    // Subtract 3 hours
    return new Date(date.getTime() - 3 * 60 * 60 * 1000);
  };

  const handlePresetChange = (value: string) => {
    setPreset(value);
    if (value !== "custom") {
      setDropdownOpen(false);
    }
  };

  const handleCustomRangeChange = (range: DateRange | undefined) => {
    setCustomRange(range);
    if (range?.from) {
      const startTime = customStartTime || "00:00";
      const [startHour, startMinute] = startTime.split(":");
      const startDate = new Date(range.from);
      startDate.setHours(Number(startHour), Number(startMinute));
      setStartDate(adjustForGMT3(startDate).toISOString().slice(0, 16));
    }
    if (range?.to) {
      const endTime = customEndTime || "23:59";
      const [endHour, endMinute] = endTime.split(":");
      const endDate = new Date(range.to);
      endDate.setHours(Number(endHour), Number(endMinute), 59);
      setEndDate(adjustForGMT3(endDate).toISOString().slice(0, 19));
    }
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomStartTime(value);
    if (customRange?.from) {
      const [hour, minute] = value.split(":");
      const startDate = new Date(customRange.from);
      startDate.setHours(Number(hour), Number(minute));
      setStartDate(adjustForGMT3(startDate).toISOString().slice(0, 16));
    }
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomEndTime(value);
    if (customRange?.to) {
      const [hour, minute] = value.split(":");
      const endDate = new Date(customRange.to);
      endDate.setHours(Number(hour), Number(minute), 59);
      setEndDate(adjustForGMT3(endDate).toISOString().slice(0, 19));
    }
  };

  const selectedLabel =
    presets.find((p) => p.value === preset)?.label || "Select";

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
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
        <div className="flex flex-row">
          {preset === "custom" && (
            <div className="p-2 flex flex-col items-start gap-2">
              <CustomTime
                dateRange={customRange}
                onChange={handleCustomRangeChange}
              />
              <div className="flex justify-between w-full mt-2">
                <label className="flex w-[47%] flex-col text-xs font-medium">
                  Start Time
                  <input
                    type="time"
                    value={customStartTime}
                    onChange={handleStartTimeChange}
                    className="mt-1 px-2 py-1 shadow-sm border text-sm bg-background"
                  />
                </label>
                <label className="flex w-[47%] flex-col text-xs font-medium">
                  End Time
                  <input
                    type="time"
                    value={customEndTime}
                    onChange={handleEndTimeChange}
                    className="mt-1 px-2 py-1 shadow-sm border text-sm bg-background"
                  />
                </label>
              </div>
            </div>
          )}
          <div className="flex flex-col min-w-[160px]">
            {presets
              .filter((p) => p.value !== "custom")
              .map((p) => (
                <DropdownMenuItem
                  key={p.value}
                  onClick={() => handlePresetChange(p.value)}
                  className={cn(
                    preset === p.value && "font-semibold text-primary"
                  )}
                >
                  {p.label}
                </DropdownMenuItem>
              ))}
            {/* Custom Time option: prevent menu from closing */}
            <div
              key="custom"
              className={cn(
                "px-2 py-1.5 cursor-default text-sm rounded-sm hover:bg-accent hover:text-accent-foreground",
                preset === "custom" && "font-semibold text-primary"
              )}
              onClick={(e) => {
                e.stopPropagation();
                setPreset("custom");
                setDropdownOpen(true);
              }}
            >
              Custom Time
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
