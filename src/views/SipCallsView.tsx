import { SipCalls } from "@/components/SipCalls";
import { Button } from "@/components/ui/button";
import { useTimestamp } from "@/contexts/TimestampContext";
import { Filter } from "lucide-react";
import { useState } from "react";

export default function SipCallsView() {
  const [filter, setFilter] = useState(true);
  const { startDate, endDate } = useTimestamp();

  const changeFilter = () => {
    setFilter((prev) => !prev);
  };

  return (
    <div>
      {/* <Button variant="ghost" onClick={changeFilter} className="size-7">
        <Filter />
      </Button> */}
      <SipCalls showFilter={filter} start_date={startDate} end_date={endDate} />
    </div>
  );
}
