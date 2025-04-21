import { SipCalls } from "@/components/SipCalls";
import { Card } from "@/components/ui/card";
import { useTimestamp } from "@/contexts/TimestampContext";
import React from "react";

export const DashboardView: React.FC = () => {
  const { startDate, endDate } = useTimestamp();
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-6 w-full">
        <Card className="min-w-[180px]">
          <div className="h-24 flex items-center justify-center text-gray-400">
            Small Card
          </div>
        </Card>
        <Card className="min-w-[180px]">
          <div className="h-24 flex items-center justify-center text-gray-400">
            Small Card
          </div>
        </Card>
        <Card className="min-w-[180px]">
          <div className="h-24 flex items-center justify-center text-gray-400">
            Small Card
          </div>
        </Card>
        <Card className="min-w-[180px]">
          <div className="h-24 flex items-center justify-center text-gray-400">
            Small Card
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="">
          <div className="h-40 flex items-center justify-center text-gray-400">
            Half Card
          </div>
        </Card>
        <Card className="">
          <div className="h-40 flex items-center justify-center text-gray-400">
            Half Card
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="p-0">
          <SipCalls
            showFilter={false}
            showFooter={false}
            start_date={startDate}
            end_date={endDate}
            per_page={10}
          />
        </Card>
      </div>
    </div>
  );
};
