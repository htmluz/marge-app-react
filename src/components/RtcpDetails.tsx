import api from "@/services/api";
import { RtcpResponse } from "@/types/sipcalls";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "./ui/dialog";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "./ui/chart";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sid: string;
}

export function VoiceDetail({ open, onOpenChange, sid }: ModalProps) {
  const [callData, setCallData] = useState<RtcpResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chartConfig = {
    teste: {
      label: "ttt",
      color: "#666",
    },
  } satisfies ChartConfig;

  useEffect(() => {
    setCallData(null);
    if (open && sid) {
      const fetchCallDetails = async () => {
        setCallData(null);
        setIsLoading(true);
        setError(null);
        try {
          const response = await api.get<RtcpResponse>("/sip/rtcp-detail", {
            params: {
              sids: sid,
              rtcp: false,
            },
          });
          console.log(response.data);
          setCallData(response.data);
        } catch (e) {
          console.log(e);
          // TODO: Implement seterror
        } finally {
          setIsLoading(false);
        }
      };
      fetchCallDetails();
    } else {
      setCallData(null);
      setError(null);
      setIsLoading(false);
    }
  }, [open, sid]);

  const processedData = useMemo(() => {
    if (!callData?.streams?.length) return [];

    // Encontrar o menor número de pontos entre todos os streams
    const minLength = Math.min(
      ...callData.streams.map((stream) => stream.streams.length)
    );

    return Array.from({ length: minLength }).map((_, index) => {
      const point = {
        // Usamos o timestamp do primeiro stream como referência
        timestamp: callData.streams[0].streams[index].timestamp,
      };

      // Adicionamos os valores MOS de cada stream
      callData.streams.forEach((stream, streamIndex) => {
        const mosValue = stream.streams[index]?.raw?.mos;
        const spackets =
          stream.streams[index]?.raw?.sender_information?.packets;
        point[`mos_${streamIndex}`] = mosValue ?? null;
        point[`spackets_${streamIndex}`] = spackets ?? null;
      });

      return point;
    });
  }, [callData]);

  function getChartColor(index: number) {
    const variableName = `--chart-${index + 1}`;
    return getComputedStyle(document.documentElement)
      .getPropertyValue(variableName)
      .trim();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="pb-2 selection:bg-primary selection:text-primary-foreground min-w-11/12 min-h-11/12 max-h-11/12 flex flex-col overflow-y-auto">
        <div>
          {callData &&
            callData.streams.map((stream, idx) => (
              <p>
                <b>Stream {idx + 1}</b>
                {stream.src_ip}:{stream.src_port} to {stream.dst_ip}:
                {stream.dst_port}
              </p>
            ))}
        </div>
        <div className="w-1/2">
          {callData && (
            <>
              <ChartContainer config={chartConfig}>
                <LineChart width={500} height={100} data={processedData}>
                  <XAxis tickLine={false} dataKey="timestamp" />
                  <YAxis domain={[1, 5]} />
                  <CartesianGrid vertical={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Legend />
                  {callData.streams.map((_, index) => (
                    <Line
                      type="monotone"
                      dot={false}
                      key={index}
                      dataKey={`mos_${index}`}
                      stroke={getChartColor(index)} // cor aleatória
                      name={`Stream ${index + 1}`}
                    />
                  ))}
                </LineChart>
              </ChartContainer>
              <ChartContainer config={chartConfig}>
                <LineChart width={500} height={100} data={processedData}>
                  <XAxis tickLine={false} dataKey="timestamp" />
                  <YAxis domain={[1, 5]} />
                  <CartesianGrid />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Legend />
                  {callData.streams.map((_, index) => (
                    <Line
                      type="monotone"
                      dot={false}
                      key={index}
                      dataKey={`spackets_${index}`}
                      stroke={getChartColor(index)} // cor aleatória
                      name={`Stream ${index + 1}`}
                    />
                  ))}
                </LineChart>
              </ChartContainer>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
