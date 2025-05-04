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
import { CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sid: string;
}

export function VoiceDetail({ open, onOpenChange, sid }: ModalProps) {
  const [callData, setCallData] = useState<RtcpResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleStreams, setVisibleStreams] = useState<Record<number, boolean>>({});

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
          // Initialize all streams as visible
          if (response.data?.streams) {
            const initialVisibility = response.data.streams.reduce((acc, _, index) => {
              acc[index] = true;
              return acc;
            }, {} as Record<number, boolean>);
            setVisibleStreams(initialVisibility);
          }
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
      setVisibleStreams({});
    }
  }, [open, sid]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
    
    return `${month}/${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
  };

  interface DataPoint {
    timestamp: string;
    formattedTimestamp: string;
    [key: `mos_${number}`]: number | null;
    [key: `loss_${number}`]: number | null;
    [key: `cumulative_loss_${number}`]: number | null;
    [key: `xr_loss_${number}`]: number | null;
    [key: `end_system_delay_${number}`]: number | null;
    [key: `rtt_${number}`]: number | null;
    [key: `packets_${number}`]: number | null;
    [key: `octets_${number}`]: number | null;
    [key: `discard_rate_${number}`]: number | null;
  }

  const processedData = useMemo(() => {
    if (!callData?.streams?.length) return [];

    const minLength = Math.min(
      ...callData.streams.map((stream) => stream.streams.length)
    );

    return Array.from({ length: minLength }).map((_, index) => {
      const timestamp = callData.streams[0].streams[index].timestamp;
      const point: DataPoint = {
        timestamp,
        formattedTimestamp: formatTimestamp(timestamp),
      } as DataPoint;

      callData.streams.forEach((stream, streamIndex) => {
        const currentData = stream.streams[index]?.raw;
        if (!currentData) return;

        // MOS
        point[`mos_${streamIndex}`] = currentData.mos ?? null;

        // Standard RTCP Packet Loss
        const reportBlock = currentData.report_blocks?.[0];
        if (reportBlock) {
          // Convert 8-bit fixed-point to percentage
          const lossRate = (reportBlock.fractions_lost / 256) * 100;
          point[`loss_${streamIndex}`] = lossRate;
          point[`cumulative_loss_${streamIndex}`] = reportBlock.packets_lost;
        }

        // XR Metrics
        const xrBlock = currentData.report_blocks_xr;
        if (xrBlock) {
          // XR Loss Rate - handle zero values
          point[`xr_loss_${streamIndex}`] = xrBlock.fraction_lost !== undefined ? 
            (xrBlock.fraction_lost / 256) * 100 : null;

          // End System Delay and Discard Rate (used in Delay tab)
          point[`end_system_delay_${streamIndex}`] = xrBlock.end_system_delay !== undefined ? 
            xrBlock.end_system_delay : null;
          point[`discard_rate_${streamIndex}`] = xrBlock.fraction_discard !== undefined ? 
            (xrBlock.fraction_discard / 256) * 100 : null;
        }

        // Bandwidth metrics
        if (currentData.sender_information) {
          const si = currentData.sender_information;
          point[`packets_${streamIndex}`] = si.packets !== undefined ? si.packets : null;
          point[`octets_${streamIndex}`] = si.octets !== undefined ? si.octets : null;
        }
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

  const handleStreamVisibilityChange = (streamIndex: number, checked: boolean) => {
    setVisibleStreams(prev => ({
      ...prev,
      [streamIndex]: checked
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="pb-2 selection:bg-primary selection:text-primary-foreground min-w-11/12 min-h-11/12 max-h-11/12 flex flex-col overflow-y-auto">
        <div className="flex text-sm gap-4">
          {callData &&
            callData.streams.map((stream, idx) => (
              <Card key={idx} className="flex gap-0 py-2 px-4 cursor-default">
                <div className="flex justify-between border-b">
                  <div className="flex gap-1">
                    <span
                      className="inline-block w-[10px] h-[10px] mt-[5px] rounded"
                      style={{
                        backgroundColor: `${getChartColor(idx)}`,
                      }}
                    />
                    <p className="font-bold">Stream {idx + 1}</p>
                  </div>
                  <div className="mt-[2px]">
                    <Checkbox 
                      checked={visibleStreams[idx]} 
                      onCheckedChange={(checked) => handleStreamVisibilityChange(idx, checked as boolean)}
                    />
                  </div>
                </div>
                <div>
                  <p>
                    <b>Src:</b> {stream.src_ip}:{stream.src_port}
                  </p>
                  <p>
                    <b>Dst:</b> {stream.dst_ip}:{stream.dst_port}
                  </p>
                  <p>
                    <b>Packets:</b>{" "}
                    {
                      stream.streams[stream.streams.length - 1]?.raw
                        ?.sender_information.packets
                    }
                  </p>
                </div>
              </Card>
            ))}
        </div>
        <Tabs defaultValue="quality" className="w-full space-y-4">
          <TabsList>
            <TabsTrigger value="quality">Quality Metrics</TabsTrigger>
            <TabsTrigger value="packetLoss">Packet Loss</TabsTrigger>
            <TabsTrigger value="delay">Jitter & Delay</TabsTrigger>
            <TabsTrigger value="bandwidth">Bandwidth</TabsTrigger>
          </TabsList>

          <TabsContent value="quality" className="space-y-4">
            <Card className="w-full pr-10">
              <CardHeader>
                <CardTitle className="font-bold cursor-default">
                  MOS - Mean Opinion Score
                </CardTitle>
              </CardHeader>
              <div className="h-full w-full">
                <ChartContainer className="aspect-[7/2]" config={chartConfig}>
                  <LineChart data={processedData}>
                    <XAxis 
                      tickLine={false} 
                      dataKey="timestamp" 
                      tickFormatter={formatTimestamp}
                    />
                    <YAxis domain={[1, 5]} />
                    <CartesianGrid vertical={false} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent />}
                      labelFormatter={formatTimestamp}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    {callData?.streams.map((_, index) => (
                      visibleStreams[index] && (
                        <Line
                          type="monotone"
                          dot={false}
                          key={index}
                          dataKey={`mos_${index}`}
                          stroke={getChartColor(index)}
                          name={`Stream ${index + 1}`}
                        />
                      )
                    ))}
                  </LineChart>
                </ChartContainer>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="packetLoss" className="space-y-4">
            <Card className="w-full pr-10">
              <CardHeader>
                <CardTitle className="font-bold cursor-default">
                  Interval Loss Rate (%)
                </CardTitle>
              </CardHeader>
              <div className="h-full w-full">
                <ChartContainer className="aspect-[7/2]" config={chartConfig}>
                  <LineChart data={processedData}>
                    <XAxis 
                      tickLine={false} 
                      dataKey="timestamp" 
                      tickFormatter={formatTimestamp}
                    />
                    <YAxis domain={[0, 100]} />
                    <CartesianGrid vertical={false} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent />}
                      labelFormatter={formatTimestamp}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    {callData?.streams.map((_, index) => (
                      visibleStreams[index] && (
                        <Line
                          type="monotone"
                          dot={false}
                          key={`xr_${index}`}
                          dataKey={`xr_loss_${index}`}
                          stroke={getChartColor(index)}
                          strokeDasharray="5 5"
                          name={`Stream ${index + 1} XR Loss Rate`}
                        />
                      )
                    ))}
                  </LineChart>
                </ChartContainer>
              </div>
            </Card>

            <Card className="w-full pr-10">
              <CardHeader>
                <CardTitle className="font-bold cursor-default">
                  Cumulative Packets Lost
                </CardTitle>
              </CardHeader>
              <div className="h-full w-full">
                <ChartContainer className="aspect-[7/2]" config={chartConfig}>
                  <LineChart data={processedData}>
                    <XAxis 
                      tickLine={false} 
                      dataKey="timestamp" 
                      tickFormatter={formatTimestamp}
                    />
                    <YAxis />
                    <CartesianGrid vertical={false} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent />}
                      labelFormatter={formatTimestamp}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    {callData?.streams.map((_, index) => (
                      visibleStreams[index] && (
                        <Line
                          type="monotone"
                          dot={false}
                          key={index}
                          dataKey={`cumulative_loss_${index}`}
                          stroke={getChartColor(index)}
                          name={`Stream ${index + 1}`}
                        />
                      )
                    ))}
                  </LineChart>
                </ChartContainer>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="delay" className="space-y-4">
            <Card className="w-full pr-10">
              <CardHeader>
                <CardTitle className="font-bold cursor-default">
                  End System Delay (ms)
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Delay introduced by the receiving end system
                </p>
              </CardHeader>
              <div className="h-full w-full">
                <ChartContainer className="aspect-[7/2]" config={chartConfig}>
                  <LineChart data={processedData}>
                    <XAxis 
                      tickLine={false} 
                      dataKey="timestamp" 
                      tickFormatter={formatTimestamp}
                    />
                    <YAxis />
                    <CartesianGrid vertical={false} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent />}
                      labelFormatter={formatTimestamp}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    {callData?.streams.map((_, index) => (
                      visibleStreams[index] && (
                        <Line
                          type="monotone"
                          dot={false}
                          key={index}
                          dataKey={`end_system_delay_${index}`}
                          stroke={getChartColor(index)}
                          name={`Stream ${index + 1}`}
                        />
                      )
                    ))}
                  </LineChart>
                </ChartContainer>
              </div>
            </Card>

            <Card className="w-full pr-10">
              <CardHeader>
                <CardTitle className="font-bold cursor-default">
                  Packet Discard Rate (%)
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Percentage of packets discarded due to late arrival (indirect jitter indicator)
                </p>
              </CardHeader>
              <div className="h-full w-full">
                <ChartContainer className="aspect-[7/2]" config={chartConfig}>
                  <LineChart data={processedData}>
                    <XAxis 
                      tickLine={false} 
                      dataKey="timestamp" 
                      tickFormatter={formatTimestamp}
                    />
                    <YAxis domain={[0, 100]} />
                    <CartesianGrid vertical={false} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent />}
                      labelFormatter={formatTimestamp}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    {callData?.streams.map((_, index) => (
                      visibleStreams[index] && (
                        <Line
                          type="monotone"
                          dot={false}
                          key={index}
                          dataKey={`discard_rate_${index}`}
                          stroke={getChartColor(index)}
                          name={`Stream ${index + 1}`}
                        />
                      )
                    ))}
                  </LineChart>
                </ChartContainer>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="bandwidth" className="space-y-4">
            <Card className="w-full pr-10">
              <CardHeader>
                <CardTitle className="font-bold cursor-default">
                  Packets Sent
                </CardTitle>
              </CardHeader>
              <div className="h-full w-full">
                <ChartContainer className="aspect-[7/2]" config={chartConfig}>
                  <LineChart data={processedData}>
                    <XAxis 
                      tickLine={false} 
                      dataKey="timestamp" 
                      tickFormatter={formatTimestamp}
                    />
                    <YAxis />
                    <CartesianGrid vertical={false} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent />}
                      labelFormatter={formatTimestamp}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    {callData?.streams.map((_, index) => (
                      visibleStreams[index] && (
                        <Line
                          type="monotone"
                          dot={false}
                          key={index}
                          dataKey={`packets_${index}`}
                          stroke={getChartColor(index)}
                          name={`Stream ${index + 1}`}
                        />
                      )
                    ))}
                  </LineChart>
                </ChartContainer>
              </div>
            </Card>

            <Card className="w-full pr-10">
              <CardHeader>
                <CardTitle className="font-bold cursor-default">
                  Octets Sent
                </CardTitle>
              </CardHeader>
              <div className="h-full w-full">
                <ChartContainer className="aspect-[7/2]" config={chartConfig}>
                  <LineChart data={processedData}>
                    <XAxis 
                      tickLine={false} 
                      dataKey="timestamp" 
                      tickFormatter={formatTimestamp}
                    />
                    <YAxis />
                    <CartesianGrid vertical={false} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent />}
                      labelFormatter={formatTimestamp}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    {callData?.streams.map((_, index) => (
                      visibleStreams[index] && (
                        <Line
                          type="monotone"
                          dot={false}
                          key={index}
                          dataKey={`octets_${index}`}
                          stroke={getChartColor(index)}
                          name={`Stream ${index + 1}`}
                        />
                      )
                    ))}
                  </LineChart>
                </ChartContainer>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
