import { useState } from "react";
import { useTimestamp } from "@/contexts/TimestampContext";
import { SipRegisters } from "@/components/SipRegisters";

export default function SipRegistersView() {
  const [filter, setFilter] = useState(true);
  const { startDate, endDate } = useTimestamp();

  return (
    <div>
      <SipRegisters showFilter={filter} start_date={startDate} end_date={endDate} />
    </div>
  );
} 