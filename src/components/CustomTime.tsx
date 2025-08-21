import { type DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"

interface CustomTimeProps {
  dateRange: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
}

export function CustomTime({ dateRange, onChange }: CustomTimeProps) {
  return (
    <Calendar
      mode="range"
      defaultMonth={dateRange?.from}
      selected={dateRange}
      onSelect={onChange}
      className="rounded-lg border shadow-sm"
    />
  )
}
